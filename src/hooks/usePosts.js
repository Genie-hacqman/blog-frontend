import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as postsApi from '../api/posts.js'

// every post query lives under ['posts', ...], so one invalidation refreshes lists, dashboards and open articles
export const usePosts = (page = 1) =>
  useQuery({ queryKey: ['posts', 'list', page], queryFn: () => postsApi.listPosts({ page }), placeholderData: keepPreviousData })

// the published posts of one section or one topic (give category or tag as a slug)
export const usePostsBy = ({ category, tag, page = 1 }) =>
  useQuery({
    queryKey: ['posts', 'list', { category, tag }, page],
    queryFn: () => postsApi.listPosts({ page, category, tag }),
    placeholderData: keepPreviousData,
  })

export const useMyPosts = ({ status, page = 1 } = {}) =>
  useQuery({
    queryKey: ['posts', 'mine', status ?? 'all', page],
    queryFn: () => postsApi.listMyPosts({ status, page }),
    placeholderData: keepPreviousData,
  })

export const useReviewQueue = (page = 1) =>
  useQuery({ queryKey: ['posts', 'review', page], queryFn: () => postsApi.listReviewQueue(page), placeholderData: keepPreviousData })

export const usePost = (id) =>
  useQuery({ queryKey: ['posts', 'id', id], queryFn: () => postsApi.getPost(id), enabled: id != null })

export const usePostBySlug = (slug) =>
  useQuery({ queryKey: ['posts', 'slug', slug], queryFn: () => postsApi.getPostBySlug(slug), enabled: slug != null })

// the article being viewed, found by its public slug or by its id (the private preview)
export const useViewedPost = (by, key) => {
  const bySlug = usePostBySlug(by === 'slug' ? key : null)
  const byId = usePost(by === 'id' ? key : null)
  return by === 'slug' ? bySlug : byId
}

const usePostMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // saving a post can change a section's or a topic's post count, and which tags exist
    onSuccess: () =>
      Promise.all(['posts', 'categories', 'tags'].map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
  })
}

export const useCreatePost = () => usePostMutation(postsApi.createPost)
// save lets the edit page route every save (manual and automatic) through one queue
export const useUpdatePost = (save = postsApi.updatePost) => usePostMutation(save)
export const useChangePostStatus = () => usePostMutation(postsApi.changePostStatus)
export const useDeletePost = () => usePostMutation(postsApi.deletePost)
export const useRestoreRevision = () => usePostMutation(postsApi.restoreRevision)

export const useRevisions = (id, page = 1) =>
  useQuery({ queryKey: ['posts', 'id', id, 'revisions', page], queryFn: () => postsApi.listRevisions(id, page), placeholderData: keepPreviousData })

export const useComparison = ({ id, from, to }) =>
  useQuery({
    queryKey: ['posts', 'id', id, 'compare', from, to],
    queryFn: () => postsApi.compareRevisions({ id, from, to }),
    enabled: from != null && to != null,
  })
