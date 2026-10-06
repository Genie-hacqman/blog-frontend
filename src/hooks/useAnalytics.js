import { keepPreviousData, useQuery } from '@tanstack/react-query'
import * as api from '../api/analytics.js'

// the range switch changes the key, and the old numbers stay on screen until the new ones arrive
export const useMyAnalytics = (days) =>
  useQuery({ queryKey: ['analytics', 'me', days], queryFn: () => api.getMyAnalytics(days), placeholderData: keepPreviousData })

export const useStoryAnalytics = (id, days) =>
  useQuery({ queryKey: ['analytics', 'story', id, days], queryFn: () => api.getStoryAnalytics(id, days), placeholderData: keepPreviousData })

export const useSiteAnalytics = (days) =>
  useQuery({ queryKey: ['analytics', 'site', days], queryFn: () => api.getSiteAnalytics(days), placeholderData: keepPreviousData })
