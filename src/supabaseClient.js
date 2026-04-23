import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wrsmhfaycdmcydjqynou.supabase.co'
const supabaseKey = 'sb_publishable_u07ujHBmQrfEpRy73Lubnw_XATDln9W'

export const supabase = createClient(supabaseUrl, supabaseKey)
