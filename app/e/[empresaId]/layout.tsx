import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function EmpresaLayout({ children, params }: { children: React.ReactNode; params: { empresaId: string } }) {
  const supabase = createClient()
  const [{ data: empresa }, { data: { user } }] = await Promise.all([
    supabase.from('empresas').select('razon_social, cuit, condicion_iva').eq('id', params.empresaId).maybeSingle(),
    supabase.auth.getUser(),
  ])
  if (!empresa) notFound()

  async function salir() {
    'use server'
    await createClient().auth.signOut()
    redirect('/login')
  }

  return (
    <div className="erp">
      <header className="erp-top">
        <span className="marca">GESTIÓN PYME</span>
        <span>{empresa.razon_social}</span>
        <span className="sp" />
        <Link href="/">Cambiar empresa</Link>
        <span>{user?.email}</span>
        <form action={salir}><button className="sec">Salir</button></form>
      </header>
      <div className="erp-body">
        <aside className="erp-side"><Sidebar base={`/e/${params.empresaId}`} /></aside>
        <main className="erp-main">{children}</main>
      </div>
      <footer className="erp-status">
        <span>Empresa: {empresa.razon_social}</span><span>CUIT {empresa.cuit}</span>
        <span>{empresa.condicion_iva.replace(/_/g, ' ')}</span><span>Ejercicio {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
