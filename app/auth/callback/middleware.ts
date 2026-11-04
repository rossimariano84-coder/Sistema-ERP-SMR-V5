import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return new NextResponse(
      'Faltan variables de entorno en este despliegue.\n' +
        `NEXT_PUBLIC_SUPABASE_URL: ${url ? 'OK' : 'FALTA'}\n` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? 'OK' : 'FALTA'}\n` +
        `Entorno de Vercel de este despliegue: ${process.env.VERCEL_ENV ?? 'desconocido'}\n\n` +
        'Revisá en Vercel > Settings > Environment Variables que cada variable esté cargada por separado, ' +
        'con el nombre exacto en "Key" y solo el valor en "Value", y tildada para ese entorno. ' +
        'Después hacé Redeploy sin usar la caché de compilación.',
      { status: 500 },
    )
  }
  if (!/^https?:\/\//.test(url)) {
    return new NextResponse('NEXT_PUBLIC_SUPABASE_URL no parece una dirección válida (tiene que empezar con https://). Empieza con: ' + url.slice(0, 20), { status: 500 })
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
    if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
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
