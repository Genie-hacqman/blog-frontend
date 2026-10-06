import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '../api/users.js'
import { useAuth } from '../auth/useAuth.js'

export const useProfile = (username) =>
  useQuery({ queryKey: ['profile', username], queryFn: () => usersApi.getProfile(username) })

export const useProfilePosts = (username, page) =>
  useQuery({
    queryKey: ['profile', username, 'posts', page],
    queryFn: () => usersApi.getProfilePosts(username, page),
    // keep showing the current page while the next one loads
    placeholderData: keepPreviousData,
  })

// profile edits change what the signed-in user sees everywhere (navbar, public page, bylines on posts)
const useProfileMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  const { updateUser } = useAuth()
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      updateUser(user)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export const useUpdateProfile = () => useProfileMutation(usersApi.updateProfile)
export const useUploadAvatar = () => useProfileMutation(usersApi.uploadAvatar)
export const useRemoveAvatar = () => useProfileMutation(usersApi.removeAvatar)

export const useDeleteAccount = () => useMutation({ mutationFn: usersApi.deleteAccount })
