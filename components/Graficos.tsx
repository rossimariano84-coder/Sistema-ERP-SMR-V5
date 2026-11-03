'use client'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money } from '@/lib/format'

const COLORES = ['#2f6db5', '#2e8b57', '#d9822b', '#7b5ea7', '#16808d', '#c0392b', '#8a9bb0']
const corto = (v: number) => new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
const eje = (v: any) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.slice(0, 7) : v)

export function GraficoBarras({ titulo, datos, x, series, linea, rotar }: {
  titulo: string; datos: any[]; x: string; series: { k: string; n: string }[]; linea?: { k: string; n: string }; rotar?: boolean
}) {
  if (!datos?.length) return null
  return (
    <div className="chart">
      <h4>{titulo}</h4>
      <ResponsiveContainer width="100%" height={rotar ? 310 : 270}>
        <ComposedChart data={datos} margin={{ top: 5, right: 10, left: 0, bottom: rotar ? 40 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" />
          <XAxis dataKey={x} tickFormatter={eje} tick={{ fontSize: 11 }} interval={0} angle={rotar ? -25 : 0} textAnchor={rotar ? 'end' : 'middle'} height={rotar ? 70 : 30} />
          <YAxis tickFormatter={corto} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: any) => money(v)} labelFormatter={eje} />
          {(series.length > 1 || linea) && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.length === 1
            ? <Bar dataKey={series[0].k} name={series[0].n}>{datos.map((d, i) => <Cell key={i} fill={Number(d[series[0].k]) < 0 ? '#c0392b' : COLORES[0]} />)}</Bar>
            : series.map((s, i) => <Bar key={s.k} dataKey={s.k} name={s.n} fill={COLORES[i % COLORES.length]} />)}
          {linea && <Line type="monotone" dataKey={linea.k} name={linea.n} stroke="#1f2937" strokeWidth={2} dot={{ r: 3 }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoTorta({ titulo, datos, nombre, valor }: { titulo: string; datos: any[]; nombre: string; valor: string }) {
  const d = (datos ?? []).map((x) => ({ ...x, [valor]: Number(x[valor]) })).filter((x) => x[valor] > 0)
  if (!d.length) return null
  return (
    <div className="chart">
      <h4>{titulo}</h4>
      <ResponsiveContainer width="100%" height={270}>
        <PieChart>
          <Pie data={d} dataKey={valor} nameKey={nombre} outerRadius={95} label={(e: any) => `${Math.round((e.percent ?? 0) * 100)}%`}>
            {d.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
          </Pie>
          <Tooltip formatter={(v: any) => money(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
