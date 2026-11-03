import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient()
  const { data: empresas } = await supabase.from('empresas').select('id, razon_social, cuit, condicion_iva').order('razon_social')

  async function crear(formData: FormData) {
    'use server'
    const { data, error } = await createClient().rpc('crear_empresa', {
      p_razon_social: String(formData.get('razon_social') ?? ''),
      p_cuit: String(formData.get('cuit') ?? ''),
      p_condicion_iva: String(formData.get('condicion_iva')),
    })
    if (error) redirect('/?error=' + encodeURIComponent(error.message))
    redirect(`/e/${data}`)
  }

  return (
    <div className="wrap">
      <h1>Tus empresas</h1>
      {(empresas ?? []).map((e) => (
        <Link key={e.id} href={`/e/${e.id}`}>
          <div className="card"><strong>{e.razon_social}</strong> · CUIT {e.cuit} · <span className="tag">{e.condicion_iva.replace('_', ' ')}</span></div>
        </Link>
      ))}
      <h2>Nueva empresa</h2>
      <form className="card row" action={crear}>
        <label>Razón social<input name="razon_social" required /></label>
        <label>CUIT<input name="cuit" required placeholder="20-12345678-9" /></label>
        <label>Condición ante IVA
          <select name="condicion_iva"><option value="responsable_inscripto">Responsable Inscripto</option><option value="monotributista">Monotributista</option></select>
        </label>
        <button>Crear empresa</button>
        {searchParams.error && <div className="err">{searchParams.error}</div>}
      </form>
    </div>
  )
}
