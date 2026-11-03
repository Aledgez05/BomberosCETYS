import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const placeholders = /YOUR_PROJECT_REF|YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY/i

export const isSupabaseConfigured = Boolean(
  url && anonKey && !placeholders.test(url) && !placeholders.test(anonKey)
)

let client

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export async function createPrivateDocumentUrl(bucket, path, expiresIn = 300) {
  const supabase = getSupabaseClient()
  if (!supabase || !bucket || !path) return null
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function uploadPrivateDocument({ bucket, path, file }) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!bucket || !path || !file) throw new Error('Bucket, path, and file are required.')
  if (file.size > 10 * 1024 * 1024) throw new Error('File exceeds the 10 MB starter limit.')

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '300',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(error.message)
  return data.path
}
