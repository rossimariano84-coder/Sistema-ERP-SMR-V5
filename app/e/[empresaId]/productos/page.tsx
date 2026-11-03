import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { money } from '@/lib/format'

export default async function Productos({ params }: { params: { empresaId: string } }) {
  const supabase = createClient()
  const [{ data, error }, { data: stocks }] = await Promise.all([
    supabase.from('productos').select('id, sku, nombre, unidad, costo, precio, controla_stock, activo').eq('empresa_id', params.empresaId).order('nombre'),
    supabase.from('v_stock_actual').select('producto_id, stock, bajo_minimo').eq('empresa_id', params.empresaId),
  ])
  const stockDe = new Map((stocks ?? []).map((s: any) => [s.producto_id, s]))
  const base = `/e/${params.empresaId}/productos`

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Productos y stock</h1>
        <Link href={`${base}/nuevo`}><button>+ Nuevo producto</button></Link>
      </div>
      {error && <div className="err">{error.message}</div>}
      <div className="card">
        <table>
          <thead><tr><th>SKU</th><th>Producto</th><th className="n">Costo</th><th className="n">Precio</th><th className="n">Stock</th></tr></thead>
          <tbody>
            {(data ?? []).map((p: any) => {
              const s: any = stockDe.get(p.id)
              return (
                <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                  <td>{p.sku}</td><td><Link href={`${base}/${p.id}`}>{p.nombre}</Link></td>
                  <td className="n">{money(p.costo)}</td><td className="n">{money(p.precio)}</td>
                  <td className="n" style={{ color: s?.bajo_minimo ? '#b91c1c' : undefined }}>
                    {p.controla_stock ? `${Number(s?.stock ?? 0)} ${p.unidad}${s?.bajo_minimo ? ' ⚠ bajo mínimo' : ''}` : '—'}
                  </td>
                </tr>
              )
            })}
            {(data ?? []).length === 0 && <tr><td colSpan={5}>Todavía no cargaste productos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
