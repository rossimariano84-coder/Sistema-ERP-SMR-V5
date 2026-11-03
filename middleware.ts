import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return new NextResponse(
      'Faltan las variables NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Cargalas en Vercel (Settings > Environment Variables) y hacé Redeploy.',
      { status: 500 },
    )
  }
  try {
    let response = NextResponse.next({ request })
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
      const dest = request.nextUrl.clone()
      dest.pathname = '/login'
      return NextResponse.redirect(dest)
    }
    return response
  } catch (e) {
    return new NextResponse('Error de configuración de Supabase (revisá la URL y la clave): ' + (e as Error).message, { status: 500 })
  }
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
