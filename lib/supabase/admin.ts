import { createClient } from '@supabase/supabase-js'

/**
 * Cliente com a Service Role Key — ignora RLS.
 * Usar SOMENTE em código de servidor que nunca é exposto ao browser
 * (ex: route handlers como o webhook do formulário).
 * Nunca importar isso num Client Component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}