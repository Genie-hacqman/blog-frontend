const WORDS_PER_MINUTE = 225

export const wordCount = (text = '') => text.trim().split(/\s+/).filter(Boolean).length

export const readingTime = (text) => Math.max(1, Math.round(wordCount(text) / WORDS_PER_MINUTE))
