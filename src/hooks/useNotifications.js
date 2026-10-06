import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/notifications.js'
import { useAuth } from '../auth/useAuth.js'

const COUNT_KEY = ['notifications', 'count']
const PREFERENCES_KEY = ['notifications', 'preferences']
const SIXTY_SECONDS = 60 * 1000

// The number on the bell. There is no push channel yet, so it is asked for every minute while the tab is open,
// and again when the reader comes back to it.
export const useUnreadCount = () => {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: COUNT_KEY,
    queryFn: api.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: SIXTY_SECONDS,
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
  })
}

export const useNotifications = ({ unread = false } = {}) =>
  useInfiniteQuery({
    queryKey: ['notifications', 'list', { unread }],
    queryFn: ({ pageParam }) => api.listNotifications({ page: pageParam, unread }),
    initialPageParam: 1,
    getNextPageParam: ({ pagination }) => (pagination.page < pagination.totalPages ? pagination.page + 1 : undefined),
  })

// ----- changing notifications: the screen follows at once, and goes back if the server refuses -----

const isList = (key) => key[1] === 'list'

// change every cached page of every list: change(notification) returns the notification to keep, or null to drop it
const reshape = (queryClient, change) =>
  queryClient.setQueriesData({ queryKey: ['notifications', 'list'] }, (data) =>
    data && {
      ...data,
      pages: data.pages.map((page) => ({ ...page, notifications: page.notifications.map(change).filter(Boolean) })),
    },
  )

const cachedNotifications = (queryClient) =>
  queryClient
    .getQueriesData({ queryKey: ['notifications', 'list'] })
    .flatMap(([, data]) => data?.pages.flatMap((page) => page.notifications) ?? [])

const takeSnapshot = (queryClient) => ({
  count: queryClient.getQueryData(COUNT_KEY),
  lists: queryClient.getQueriesData({ queryKey: ['notifications', 'list'] }),
})

const restoreSnapshot = (queryClient, snapshot) => {
  if (!snapshot) return
  queryClient.setQueryData(COUNT_KEY, snapshot.count)
  for (const [key, data] of snapshot.lists) if (isList(key)) queryClient.setQueryData(key, data)
}

// how many of these ids are unread, as far as the screen knows (an id the screen has not seen counts as unread)
const unreadAmong = (queryClient, ids) => {
  const known = new Map(cachedNotifications(queryClient).map((n) => [n.id, n]))
  return ids.filter((id) => !known.get(id)?.readAt).length
}

const lowerCount = (queryClient, by) => queryClient.setQueryData(COUNT_KEY, (count) => (typeof count === 'number' ? Math.max(0, count - by) : count))

export const useMarkRead = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.markRead,
    onMutate: async ({ ids, all }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const snapshot = takeSnapshot(queryClient)
      const now = new Date().toISOString()
      if (all) {
        queryClient.setQueryData(COUNT_KEY, 0)
        reshape(queryClient, (n) => ({ ...n, readAt: n.readAt ?? now }))
      } else {
        lowerCount(queryClient, unreadAmong(queryClient, ids))
        reshape(queryClient, (n) => (ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n))
      }
      return snapshot
    },
    onError: (_error, _variables, snapshot) => restoreSnapshot(queryClient, snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export const useDismissNotification = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.dismissNotification,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const snapshot = takeSnapshot(queryClient)
      lowerCount(queryClient, unreadAmong(queryClient, [id]))
      reshape(queryClient, (n) => (n.id === id ? null : n))
      return snapshot
    },
    onError: (_error, _variables, snapshot) => restoreSnapshot(queryClient, snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// ----- choices -----

export const usePreferences = () => useQuery({ queryKey: PREFERENCES_KEY, queryFn: api.getPreferences })

export const useSavePreferences = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.savePreferences,
    onSuccess: (preferences) => queryClient.setQueryData(PREFERENCES_KEY, preferences),
  })
}

export const useUnsubscribe = () => useMutation({ mutationFn: api.unsubscribe })
