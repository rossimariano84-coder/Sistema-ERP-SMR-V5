'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Filtros, { filtrosIniciales } from './Filtros'
import { Kpis, Tabla, etiqueta } from './Tablas'
import { GraficoBarras, GraficoTorta } from './Graficos'

export type GraficoDef =
  | { tipo: 'barras'; titulo: string; fuente: string; x: string; series: { k: string; n: string }[]; linea?: { k: string; n: string }; invertir?: boolean }
  | { tipo: 'torta'; titulo: string; fuente: string; nombre: string; valor: string }
  | { tipo: 'kpibarras'; titulo: string; claves: [string, string][] }

export default function Panel({ titulo, inputs, cargar, graficos }: {
  titulo: string; inputs: string[]; cargar: (sb: any, f: any) => PromiseLike<{ data: any; error: any }>; graficos?: GraficoDef[]
}) {
  const sb = useMemo(() => createClient(), [])
  const [f, setF] = useState<any>(filtrosIniciales)
  const [d, setD] = useState<any>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function ver() {
    setCargando(true); setError('')
    const r = await cargar(sb, f)
    setCargando(false)
    if (r.error) { setError(r.error.message); setD(null) } else setD(r.data)
  }
  useEffect(() => { ver() }, [])

  const entradas = d ? Object.entries(d) : []
  return (
    <>
      <h1>{titulo}</h1>
      <Filtros inputs={inputs} f={f} setF={setF} onVer={ver} cargando={cargando} />
      {error && <div className="err">{error}</div>}
      {entradas.filter(([, v]: any) => v && !Array.isArray(v) && typeof v === 'object').map(([k, v]: [string, any]) => (
        <div key={k}><h3>{etiqueta(k)}</h3><Kpis datos={v} /></div>
      ))}
      {d && graficos && (
        <div className="charts">
          {graficos.map((g, i) => {
            if (g.tipo === 'kpibarras') {
              const datos = g.claves.map(([k, n]) => ({ nombre: n, valor: Number(d.kpis?.[k] ?? 0) }))
              return <GraficoBarras key={i} titulo={g.titulo} datos={datos} x="nombre" series={[{ k: 'valor', n: 'Importe' }]} />
            }
            const fuente = Array.isArray(d[g.fuente]) ? d[g.fuente] : []
            if (g.tipo === 'torta') return <GraficoTorta key={i} titulo={g.titulo} datos={fuente} nombre={g.nombre} valor={g.valor} />
            return <GraficoBarras key={i} titulo={g.titulo} datos={g.invertir ? [...fuente].reverse() : fuente} x={g.x} series={g.series} linea={g.linea} />
          })}
        </div>
      )}
      {entradas.filter(([, v]) => Array.isArray(v)).map(([k, v]: [string, any]) => (
        <div key={k}><h3>{etiqueta(k)}</h3><Tabla filas={v} /></div>
      ))}
      {d && !error && <p style={{ fontSize: 12, color: '#666' }}>Estimación de gestión basada en lo registrado en el sistema.</p>}
    </>
  )
}
