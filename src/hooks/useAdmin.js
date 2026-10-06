import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/admin.js'

export const useStats = () => useQuery({ queryKey: ['admin', 'stats'], queryFn: api.getStats })

export const useUsers = (params) =>
  useQuery({ queryKey: ['admin', 'users', params], queryFn: () => api.listUsers(params), placeholderData: keepPreviousData })

export const useAuditLogs = (params) =>
  useQuery({ queryKey: ['admin', 'audit', params], queryFn: () => api.listAuditLogs(params), placeholderData: keepPreviousData })

// every change to an account refreshes the list, the numbers on the dashboard and the audit log
const useAccountMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }) })
}

export const useSuspendUser = () => useAccountMutation(api.suspendUser)
export const useUnsuspendUser = () => useAccountMutation(api.unsuspendUser)
export const useSignOutUser = () => useAccountMutation(api.signOutUser)
export const useSetUserRole = () => useAccountMutation(api.setUserRole)
