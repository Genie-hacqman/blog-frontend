import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as postsApi from '../api/posts.js'

export const usePosts = () => useQuery({ queryKey: ['posts'], queryFn: postsApi.listPosts })

export const usePost = (id) =>
  useQuery({ queryKey: ['posts', id], queryFn: () => postsApi.getPost(id) })

const usePostMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })
}

export const useCreatePost = () => usePostMutation(postsApi.createPost)
export const useUpdatePost = () => usePostMutation(postsApi.updatePost)
export const useDeletePost = () => usePostMutation(postsApi.deletePost)
