'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Filtros, { filtrosIniciales } from './Filtros'
import { Tabla } from './Tablas'
import { GraficoBarras } from './Graficos'

export default function Reporte({ titulo, inputs, cargar, grafico }: {
  titulo: string; inputs: string[]; cargar: (sb: any, f: any) => PromiseLike<{ data: any; error: any }>
  grafico?: { titulo: string; x: string; y: string; filtro?: (f: any) => boolean }
}) {
  const sb = useMemo(() => createClient(), [])
  const [f, setF] = useState<any>(filtrosIniciales)
  const [filas, setFilas] = useState<any[]>([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function ver() {
    setCargando(true); setError('')
    const r = await cargar(sb, f)
    setCargando(false)
    if (r.error) { setError(r.error.message); setFilas([]) } else setFilas(r.data ?? [])
  }
  useEffect(() => { ver() }, [])

  const datos = grafico ? filas.filter(grafico.filtro ?? (() => true)).map((x) => ({ ...x, [grafico.y]: Number(x[grafico.y]) })) : []
  return (
    <>
      <h1>{titulo}</h1>
      <Filtros inputs={inputs} f={f} setF={setF} onVer={ver} cargando={cargando} />
      {error && <div className="err">{error}</div>}
      {grafico && datos.length > 0 && <div className="charts"><GraficoBarras titulo={grafico.titulo} datos={datos} x={grafico.x} series={[{ k: grafico.y, n: 'Importe' }]} rotar /></div>}
      <Tabla filas={filas} />
    </>
  )
}
