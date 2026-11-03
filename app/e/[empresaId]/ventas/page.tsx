import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { money, nroComprobante, tipoNombre } from '@/lib/format'

export default async function Ventas({ params, searchParams }: {
  params: { empresaId: string }; searchParams: { desde?: string; hasta?: string; estado?: string }
}) {
  let q = createClient().from('comprobantes')
    .select('id, fecha, tipo, punto_venta, numero, estado, condicion_pago, total, cliente:terceros!cliente_id(razon_social)')
    .eq('empresa_id', params.empresaId).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(100)
  if (searchParams.desde) q = q.gte('fecha', searchParams.desde)
  if (searchParams.hasta) q = q.lte('fecha', searchParams.hasta)
  if (searchParams.estado) q = q.eq('estado', searchParams.estado)
  const { data, error } = await q

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Ventas</h1>
        <Link href={`/e/${params.empresaId}/ventas/nueva`}><button>+ Nueva venta</button></Link>
      </div>
      <form className="card row" method="get">
        <label>Desde<input type="date" name="desde" defaultValue={searchParams.desde} /></label>
        <label>Hasta<input type="date" name="hasta" defaultValue={searchParams.hasta} /></label>
        <label>Estado
          <select name="estado" defaultValue={searchParams.estado ?? ''}>
            <option value="">Todos</option><option value="emitido">Emitido</option><option value="anulado">Anulado</option><option value="borrador">Borrador</option>
          </select>
        </label>
        <button className="sec">Filtrar</button>
      </form>
      {error && <div className="err">{error.message}</div>}
      <div className="card">
        <table>
          <thead><tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Pago</th><th>Estado</th><th className="n">Total</th></tr></thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id}>
                <td>{c.fecha}</td>
                <td><Link href={`/e/${params.empresaId}/ventas/${c.id}`}>{tipoNombre(c.tipo)} {nroComprobante(c.punto_venta, c.numero)}</Link></td>
                <td>{c.cliente?.razon_social ?? 'Consumidor final'}</td>
                <td>{c.condicion_pago === 'contado' ? 'Contado' : 'Cta. cte.'}</td>
                <td><span className="tag">{c.estado}</span></td>
                <td className="n">{money(c.total)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={6}>No hay comprobantes con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
