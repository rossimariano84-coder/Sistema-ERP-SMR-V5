'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/format'

export default function Egresos() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const sb = useMemo(() => createClient(), [])
  const [filas, setFilas] = useState<any[]>([])
  const [f, setF] = useState({ desde: '', hasta: '', estado: '' })
  const [error, setError] = useState('')

  async function cargar() {
    let q = sb.from('egresos')
      .select('id, fecha, tipo_comprobante, numero_comprobante, condicion_pago, estado, total, proveedor:terceros!proveedor_id(razon_social), categoria:categorias_egreso!categoria_id(nombre, naturaleza)')
      .eq('empresa_id', empresaId).order('fecha', { ascending: false }).limit(200)
    if (f.desde) q = q.gte('fecha', f.desde)
    if (f.hasta) q = q.lte('fecha', f.hasta)
    if (f.estado) q = q.eq('estado', f.estado)
    const { data, error } = await q
    if (error) setError(error.message); else setFilas(data ?? [])
  }
  useEffect(() => { cargar() }, [])

  async function anular(id: string) {
    const motivo = window.prompt('Motivo de la anulación (opcional):') ?? undefined
    const { error } = await sb.rpc('anular_egreso', { p_id: id, p_motivo: motivo })
    if (error) setError(error.message); else { setError(''); cargar() }
  }

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Egresos</h1>
        <Link href={`/e/${empresaId}/egresos/nuevo`}><button>+ Nuevo egreso</button></Link>
      </div>
      <div className="card row">
        <label>Desde<input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></label>
        <label>Hasta<input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
        <label>Estado<select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}><option value="">Todos</option><option value="registrado">Registrado</option><option value="anulado">Anulado</option></select></label>
        <button className="sec" onClick={cargar}>Filtrar</button>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <table>
          <thead><tr><th>Fecha</th><th>Comprobante</th><th>Proveedor</th><th>Categoría</th><th>Pago</th><th>Estado</th><th className="n">Total</th><th /></tr></thead>
          <tbody>
            {filas.map((g) => (
              <tr key={g.id}>
                <td>{g.fecha}</td><td>{g.tipo_comprobante.replace(/_/g, ' ')} {g.numero_comprobante ?? ''}</td>
                <td>{g.proveedor?.razon_social ?? '—'}</td><td>{g.categoria?.nombre} <span className="tag">{g.categoria?.naturaleza}</span></td>
                <td>{g.condicion_pago === 'contado' ? 'Contado' : 'Cta. cte.'}</td><td><span className="tag">{g.estado}</span></td>
                <td className="n">{money(g.total)}</td>
                <td>{g.estado === 'registrado' && <button className="sec" onClick={() => anular(g.id)}>Anular</button>}</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={8}>No hay egresos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
