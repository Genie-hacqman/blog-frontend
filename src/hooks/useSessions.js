import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'

const KEY = ['sessions']

export const useSessions = () => {
  const { isAuthenticated } = useAuth()
  return useQuery({ queryKey: KEY, queryFn: api.listSessions, enabled: isAuthenticated })
}

// Ending a session removes it from the list at once and puts it back, with the reason, if the server refuses.
export const useEndSession = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.endSession,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEY })
      const previous = queryClient.getQueryData(KEY)
      queryClient.setQueryData(KEY, (sessions) => sessions?.filter((session) => session.id !== id))
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
