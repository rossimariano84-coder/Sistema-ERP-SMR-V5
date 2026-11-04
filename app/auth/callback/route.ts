import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Recibe el enlace del correo de confirmación (con "code" o con "token_hash"), abre la sesión y redirige.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const supabase = createClient()

  let mensaje = ''
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash })
    if (error) mensaje = error.message
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) mensaje = error.message
  } else {
    mensaje = 'El enlace de confirmación está incompleto o venció. Pedí uno nuevo.'
  }

  if (mensaje) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(mensaje)}`)
  return NextResponse.redirect(`${origin}/`)
}
