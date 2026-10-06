import { z } from 'zod'
import { htmlToText } from '../lib/htmlText.js'

// mirrors Blog-api/schemas/userSchemas.js and authSchemas.js
// (passwords are never trimmed: what is typed at sign-up is exactly what must be typed at login)
const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

const mustMatch = { path: ['confirmPassword'], message: 'Passwords do not match' }

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  userName: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[A-Za-z0-9_]+$/, 'Letters, numbers and underscores only'),
  email: z.string().trim().email('Enter a valid email'),
  password: newPassword,
})

// any non-empty password is sent to the server, which answers wrong ones with 401
export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
})

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, mustMatch)

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, mustMatch)

// mirrors Blog-api/schemas/postSchemas.js
export const postSchema = z.object({
  // '' = no category; otherwise the id of one of the listed categories (the API checks it exists)
  categoryId: z.string(),
  tags: z.array(z.string()).max(5, 'A post can have at most 5 tags'),
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  // the editor produces HTML (empty string when nothing is written); the limit that matters is the text inside it
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(200000, 'Content is too long')
    .refine((html) => htmlToText(html).length > 0, 'Content is required')
    .refine((html) => htmlToText(html).length <= 50000, 'Content must be at most 50,000 characters'),
  coverMediaId: z.number().int().positive().nullable(),
  coverAlt: z.string().trim().max(200, 'The picture description must be at most 200 characters'),
  excerpt: z.string().trim().max(320, 'Excerpt must be at most 320 characters'),
  slug: z
    .string()
    .trim()
    .max(100, 'URL must be at most 100 characters')
    .refine((value) => value === '' || /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(value), 'Use letters, numbers and single hyphens'),
})

// mirrors Blog-api/schemas/profileSchemas.js (the server checks that each link points at the right site)
export const SOCIAL_PLATFORMS = ['website', 'github', 'twitter', 'linkedin', 'mastodon', 'youtube', 'instagram']

const httpsLink = z
  .string()
  .trim()
  .max(200, 'Link must be at most 200 characters')
  .refine((value) => value === '' || /^https:\/\/[^\s/]+\.[^\s/]+/i.test(value), 'Enter a full https:// link')

export const profileSchema = z.object({
  bio: z.string().max(500, 'Bio must be at most 500 characters'),
  socialLinks: z.object(Object.fromEntries(SOCIAL_PLATFORMS.map((platform) => [platform, httpsLink]))),
})

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password to confirm'),
})

// mirrors Blog-api/schemas/taxonomySchemas.js
export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters'),
  description: z.string().trim().max(300, 'Description must be at most 300 characters'),
})
