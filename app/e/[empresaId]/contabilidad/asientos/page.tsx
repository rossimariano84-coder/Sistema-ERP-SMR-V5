'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hoy } from '@/components/Filtros'
import { money } from '@/lib/format'

const TIPO: Record<string, string> = { manual: 'Manual', ajuste: 'Ajuste', devengamiento: 'Devengamiento', prevision: 'Previsión' }

export default function Asientos() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const sb = useMemo(() => createClient(), [])
  const [filas, setFilas] = useState<any[]>([])
  const [f, setF] = useState({ desde: hoy.slice(0, 4) + '-01-01', hasta: hoy, estado: '', tipo: '' })
  const [error, setError] = useState('')

  async function cargar() {
    let q = sb.from('asientos_manuales').select('id, fecha, glosa, tipo, estado, lineas:asiento_lineas(debe, haber)').eq('empresa_id', empresaId).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(300)
    if (f.desde) q = q.gte('fecha', f.desde)
    if (f.hasta) q = q.lte('fecha', f.hasta)
    if (f.estado) q = q.eq('estado', f.estado)
    if (f.tipo) q = q.eq('tipo', f.tipo)
    const { data, error } = await q
    if (error) setError(error.message); else setFilas(data ?? [])
  }
  useEffect(() => { cargar() }, [])

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ flex: 1 }}>Asientos contables</h1>
        <Link href={`/e/${empresaId}/contabilidad/asientos/nuevo`}><button>+ Nuevo asiento</button></Link>
      </div>
      <div className="card row">
        <label>Desde<input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></label>
        <label>Hasta<input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
        <label>Estado<select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}><option value="">Todos</option><option value="borrador">Borrador</option><option value="confirmado">Confirmado</option><option value="anulado">Anulado</option></select></label>
        <label>Tipo<select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}><option value="">Todos</option>{Object.entries(TIPO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <button className="sec" onClick={cargar}>Filtrar</button>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Fecha</th><th>Ref.</th><th>Glosa</th><th>Tipo</th><th>Estado</th><th className="n">Importe</th></tr></thead>
          <tbody>
            {filas.map((a) => (
              <tr key={a.id}>
                <td>{a.fecha}</td><td>{a.id.slice(0, 8)}</td>
                <td><Link href={`/e/${empresaId}/contabilidad/asientos/${a.id}`}>{a.glosa}</Link></td>
                <td>{TIPO[a.tipo] ?? a.tipo}</td><td><span className="tag">{a.estado}</span></td>
                <td className="n">{money((a.lineas ?? []).reduce((s: number, l: any) => s + Number(l.debe), 0))}</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={6}>No hay asientos con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#666' }}>Acá están los asientos cargados a mano y los de devengamientos y previsiones. Los asientos de ventas, compras, cobros y stock se generan solos y se ven en el Libro diario.</p>
    </>
  )
}
