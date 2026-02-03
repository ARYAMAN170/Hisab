import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const isValidSupabaseUrl = (value: string | undefined) => {
	if (!value) return false
	try {
		const url = new URL(value)
		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return false
	}
}

export const isSupabaseConfigured = Boolean(supabaseAnonKey) && isValidSupabaseUrl(supabaseUrl)

export const supabase = isSupabaseConfigured
	? createClient(supabaseUrl as string, supabaseAnonKey as string)
	: null
