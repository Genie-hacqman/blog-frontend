import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as taxonomyApi from '../api/taxonomy.js'
import { searchPosts } from '../api/search.js'

const FIVE_MINUTES = 5 * 60 * 1000

// The section menu is on every page, so its data is reused for a few minutes instead of refetched on each visit.
export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: taxonomyApi.listCategories, staleTime: FIVE_MINUTES })

export const useCategory = (slug) =>
  useQuery({ queryKey: ['categories', slug], queryFn: () => taxonomyApi.getCategory(slug), enabled: slug != null })

export const useTag = (slug) =>
  useQuery({ queryKey: ['tags', slug], queryFn: () => taxonomyApi.getTag(slug), enabled: slug != null })

// tag names that start with what is being typed, for the editor's autocomplete
export const useTagSuggestions = (prefix) =>
  useQuery({
    queryKey: ['tags', 'suggest', prefix],
    queryFn: () => taxonomyApi.listTags({ q: prefix, limit: 8 }),
    enabled: prefix.length >= 1,
    staleTime: 60 * 1000,
  })

export const useSearch = ({ q, category, tag, sort, page }) =>
  useQuery({
    queryKey: ['posts', 'search', { q, category, tag, sort }, page],
    queryFn: () => searchPosts({ q, category, tag, sort, page }),
    // the server needs at least two characters; do not ask before that
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  })

const useCategoryMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // renaming or deleting a section shows on posts too
    onSuccess: () => Promise.all(['categories', 'posts'].map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
  })
}

export const useCreateCategory = () => useCategoryMutation(taxonomyApi.createCategory)
export const useUpdateCategory = () => useCategoryMutation(taxonomyApi.updateCategory)
export const useDeleteCategory = () => useCategoryMutation(taxonomyApi.deleteCategory)
