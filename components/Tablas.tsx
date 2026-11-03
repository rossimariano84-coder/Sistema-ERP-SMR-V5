'use client'
import { money } from '@/lib/format'

const NO_MONEDA = /(^|_)(orden|numero|punto_venta|nro|tramo|cuotas|cantidad|generadas|totales|anio|alicuota)/
const OCULTAS = new Set(['id', 'orden', 'tipo_fila'])
export const etiqueta = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const esObj = (v: any) => v !== null && typeof v === 'object'
export const celda = (k: string, v: any) =>
  v === null || v === undefined ? '' : typeof v === 'number' ? (NO_MONEDA.test(k) ? String(v) : money(v))
  : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)

export function Tabla({ filas }: { filas: any[] }) {
  if (!filas?.length) return <p>Sin datos para los filtros elegidos.</p>
  const cols = Object.keys(filas[0]).filter((k) => !OCULTAS.has(k) && !k.endsWith('_id') && !esObj(filas[0][k]))
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr>{cols.map((c) => <th key={c} className={typeof filas[0][c] === 'number' ? 'n' : ''}>{etiqueta(c)}</th>)}</tr></thead>
        <tbody>{filas.map((f, i) => (
          <tr key={i} style={f.tipo_fila === 'total' ? { fontWeight: 700 } : undefined}>
            {cols.map((c) => <td key={c} className={typeof f[c] === 'number' ? 'n' : ''}>{celda(c, f[c])}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function Kpis({ datos }: { datos: Record<string, any> }) {
  return (
    <div className="kpis">
      {Object.entries(datos).filter(([, v]) => !esObj(v)).map(([k, v]) => (
        <div className="kpi" key={k}>
          <small>{etiqueta(k)}</small>
          <strong>{v === null || v === undefined ? '—' : /pct/.test(k) ? `${v} %` : celda(k, v)}</strong>
        </div>
      ))}
    </div>
  )
}
