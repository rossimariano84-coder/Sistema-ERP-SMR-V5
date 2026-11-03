import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { money } from '@/lib/format'

export default async function Terceros({ params, searchParams }: { params: { empresaId: string }; searchParams: { tipo?: string } }) {
  const supabase = createClient()
  let q = supabase.from('terceros').select('id, tipo, razon_social, cuit, condicion_iva, email, activo').eq('empresa_id', params.empresaId).order('razon_social')
  if (searchParams.tipo === 'cliente') q = q.in('tipo', ['cliente', 'ambos'])
  if (searchParams.tipo === 'proveedor') q = q.in('tipo', ['proveedor', 'ambos'])
  const [{ data, error }, { data: saldos }] = await Promise.all([
    q, supabase.from('v_saldos_terceros').select('tercero_id, saldo').eq('empresa_id', params.empresaId),
  ])
  const saldoDe = new Map((saldos ?? []).map((s: any) => [s.tercero_id, Number(s.saldo)]))
  const base = `/e/${params.empresaId}/terceros`

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Clientes y proveedores</h1>
        <Link href={`${base}/nuevo`}><button>+ Nuevo</button></Link>
      </div>
      <p className="row"><Link href={base}>Todos</Link> · <Link href={`${base}?tipo=cliente`}>Clientes</Link> · <Link href={`${base}?tipo=proveedor`}>Proveedores</Link></p>
      {error && <div className="err">{error.message}</div>}
      <div className="card">
        <table>
          <thead><tr><th>Razón social</th><th>Tipo</th><th>CUIT</th><th>Condición IVA</th><th className="n">Saldo</th></tr></thead>
          <tbody>
            {(data ?? []).map((t: any) => {
              const s = saldoDe.get(t.id) ?? 0
              return (
                <tr key={t.id} style={{ opacity: t.activo ? 1 : 0.5 }}>
                  <td><Link href={`${base}/${t.id}`}>{t.razon_social}</Link></td>
                  <td>{t.tipo}</td><td>{t.cuit ?? '—'}</td><td>{t.condicion_iva.replace(/_/g, ' ')}</td>
                  <td className="n">{money(Math.abs(s))} {s > 0 ? 'nos debe' : s < 0 ? 'le debemos' : ''}</td>
                </tr>
              )
            })}
            {(data ?? []).length === 0 && <tr><td colSpan={5}>Todavía no cargaste ninguno.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
