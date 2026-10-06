import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/moderation.js'

export const useReports = ({ status, type, page }) =>
  useQuery({ queryKey: ['moderation', 'reports', { status, type, page }], queryFn: () => api.listReports({ status, type, page }), placeholderData: keepPreviousData })

// who reported something and what they wrote; fetched only when a moderator opens it
export const useReportDetail = (id, enabled) => useQuery({ queryKey: ['moderation', 'report', id], queryFn: () => api.getReport(id), enabled })

export const useCreateReport = () => useMutation({ mutationFn: api.createReport })

// a decision changes the queue, and may change a comment, a story or an account
export const useResolveReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.resolveReport,
    onSuccess: () =>
      Promise.all(['moderation', 'comments', 'posts', 'admin'].map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
  })
}
