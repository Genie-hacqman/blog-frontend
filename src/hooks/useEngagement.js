import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/engagement.js'

// ----- reading -----

const nextPage = ({ pagination }) => (pagination.page < pagination.totalPages ? pagination.page + 1 : undefined)

// the top-level comments of a story, a page at a time ("Load more" adds the next page)
export const useComments = (postId) =>
  useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: ({ pageParam }) => api.listComments(postId, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: postId != null,
  })

// the replies under one comment; fetched only once the reader opens them
export const useReplies = (commentId, enabled) =>
  useInfiniteQuery({
    queryKey: ['comments', 'replies', commentId],
    queryFn: ({ pageParam }) => api.listReplies(commentId, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled,
  })

export const useBookmarks = (page = 1) =>
  useQuery({ queryKey: ['posts', 'bookmarks', page], queryFn: () => api.listBookmarks(page), placeholderData: keepPreviousData })

export const useFeed = (page = 1) =>
  useQuery({ queryKey: ['posts', 'feed', page], queryFn: () => api.getFeed(page), placeholderData: keepPreviousData })

// followers or following of a person (kind: 'followers' | 'following')
export const usePeople = (username, kind, page = 1) =>
  useQuery({ queryKey: ['profile', username, kind, page], queryFn: () => api.listPeople(username, kind, page), placeholderData: keepPreviousData })

// ----- comments -----

// a comment changes what the story shows (its count) as well as the comment lists
const useCommentMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: ['comments'] }), queryClient.invalidateQueries({ queryKey: ['posts'] })]),
  })
}

export const useCreateComment = () => useCommentMutation(api.createComment)
export const useEditComment = () => useCommentMutation(api.editComment)
export const useDeleteComment = () => useCommentMutation(api.deleteComment)

// ----- likes, bookmarks, follows: optimistic -----
//
// The button changes at once; the server's answer then replaces the guess, and a failure puts everything back.

// change a story wherever it is cached: the detail pages (a post object) and every list (an object with posts)
const patchPost = (queryClient, postId, patch) =>
  queryClient.setQueriesData({ queryKey: ['posts'] }, (data) => {
    if (!data || typeof data !== 'object') return data
    if (data.id === postId && 'slug' in data) return { ...data, ...patch(data) }
    if (Array.isArray(data.posts)) return { ...data, posts: data.posts.map((post) => (post.id === postId ? { ...post, ...patch(post) } : post)) }
    return data
  })

const restore = (queryClient, context) => context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))

export const useToggleLike = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, like }) => (like ? api.likePost(postId) : api.unlikePost(postId)),
    onMutate: async ({ postId, like }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      const snapshot = queryClient.getQueriesData({ queryKey: ['posts'] })
      patchPost(queryClient, postId, (post) => ({
        liked: like,
        likeCount: Math.max(0, (post.likeCount ?? 0) + (post.liked === like ? 0 : like ? 1 : -1)),
      }))
      return { snapshot }
    },
    onError: (_error, _variables, context) => restore(queryClient, context),
    onSuccess: (result, { postId }) => patchPost(queryClient, postId, () => ({ liked: result.liked, likeCount: result.likeCount })),
  })
}

export const useToggleBookmark = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, save }) => (save ? api.bookmarkPost(postId) : api.unbookmarkPost(postId)),
    onMutate: async ({ postId, save }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      const snapshot = queryClient.getQueriesData({ queryKey: ['posts'] })
      patchPost(queryClient, postId, () => ({ bookmarked: save }))
      return { snapshot }
    },
    onError: (_error, _variables, context) => restore(queryClient, context),
    // the Saved list is another page of the same data
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts', 'bookmarks'] }),
  })
}

export const useToggleFollow = (username) => {
  const queryClient = useQueryClient()
  const key = ['profile', username]
  return useMutation({
    mutationFn: ({ follow }) => (follow ? api.followUser(username) : api.unfollowUser(username)),
    onMutate: async ({ follow }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (profile) =>
        profile && {
          ...profile,
          followerCount: Math.max(0, (profile.followerCount ?? 0) + (profile.viewer?.following === follow ? 0 : follow ? 1 : -1)),
          viewer: { following: follow },
        },
      )
      return { previous }
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(key, context?.previous),
    onSuccess: (result) =>
      queryClient.setQueryData(key, (profile) => profile && { ...profile, followerCount: result.followerCount, viewer: { following: result.following } }),
    // the feed and the follower list of that person changed
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] }),
        queryClient.invalidateQueries({ queryKey: ['profile', username, 'followers'] }),
      ]),
  })
}
