'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Kpis, Tabla } from '@/components/Tablas'
import { money } from '@/lib/format'

const CONCEPTOS = [
  ['amortizaciones', 'Amortizaciones (de la actividad)'], ['otro_gasto_actividad', 'Otro gasto de la actividad'],
  ['aportes_jubilatorios', 'Aportes jubilatorios'], ['gastos_medicos', 'Gastos médicos'], ['donaciones', 'Donaciones'],
  ['servicio_domestico', 'Servicio doméstico'], ['alquiler_vivienda', 'Alquiler de vivienda'], ['otra_deduccion_general', 'Otra deducción general'],
]
const ESPECIAL = [['ninguna', 'Ninguna'], ['ap1_general', 'Apartado 1 (general)'], ['ap1_nuevos_prof_emprendedores', 'Apartado 1 (nuevos profesionales / emprendedores)'], ['ap2_incrementada', 'Apartado 2 (incrementada)']]

export default function Ganancias() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const sb = useMemo(() => createClient(), [])
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [cfg, setCfg] = useState<any>({ conyuge: false, hijos: 0, hijos_incapacitados: 0, deduccion_especial: 'ninguna', quebrantos_anteriores: 0, pagos_a_cuenta: 0 })
  const [deds, setDeds] = useState<any[]>([])
  const [nueva, setNueva] = useState({ concepto: 'amortizaciones', importe: '', descripcion: '' })
  const [res, setRes] = useState<any>(null)
  const [error, setError] = useState('')

  async function cargar() {
    const [c, d, l] = await Promise.all([
      sb.from('ganancias_config').select('*').eq('empresa_id', empresaId).eq('anio', anio).maybeSingle(),
      sb.from('ganancias_deducciones').select('id, concepto, importe, descripcion').eq('empresa_id', empresaId).eq('anio', anio).order('created_at'),
      sb.from('ganancias_liquidaciones').select('*').eq('empresa_id', empresaId).eq('anio', anio).maybeSingle(),
    ])
    if (c.data) setCfg(c.data)
    setDeds(d.data ?? []); setRes(l.data)
  }
  useEffect(() => { cargar() }, [anio])

  async function guardarCfg() {
    setError('')
    const { error } = await sb.from('ganancias_config').upsert({
      empresa_id: empresaId, anio, conyuge: !!cfg.conyuge, hijos: Number(cfg.hijos), hijos_incapacitados: Number(cfg.hijos_incapacitados),
      deduccion_especial: cfg.deduccion_especial, quebrantos_anteriores: Number(cfg.quebrantos_anteriores), pagos_a_cuenta: Number(cfg.pagos_a_cuenta),
    }, { onConflict: 'empresa_id,anio' })
    if (error) setError(error.message)
  }
  async function agregar() {
    setError('')
    const { error } = await sb.from('ganancias_deducciones').insert({ empresa_id: empresaId, anio, concepto: nueva.concepto, importe: Number(nueva.importe), descripcion: nueva.descripcion || null })
    if (error) return setError(error.message)
    setNueva({ ...nueva, importe: '', descripcion: '' }); cargar()
  }
  async function borrar(id: string) { await sb.from('ganancias_deducciones').delete().eq('id', id); cargar() }
  async function calcular() {
    setError('')
    await guardarCfg()
    const { error } = await sb.rpc('calcular_ganancias', { p_empresa: empresaId, p_anio: anio })
    if (error) return setError(error.message)
    cargar()
  }

  return (
    <>
      <h1>Impuesto a las Ganancias</h1>
      <div className="card row">
        <label>Año fiscal<input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ width: 100 }} /></label>
        <label>Cónyuge a cargo<input type="checkbox" checked={!!cfg.conyuge} onChange={(e) => setCfg({ ...cfg, conyuge: e.target.checked })} /></label>
        <label>Hijos<input type="number" min="0" style={{ width: 70 }} value={cfg.hijos} onChange={(e) => setCfg({ ...cfg, hijos: e.target.value })} /></label>
        <label>Hijos incapacitados<input type="number" min="0" style={{ width: 70 }} value={cfg.hijos_incapacitados} onChange={(e) => setCfg({ ...cfg, hijos_incapacitados: e.target.value })} /></label>
        <label>Deducción especial<select value={cfg.deduccion_especial} onChange={(e) => setCfg({ ...cfg, deduccion_especial: e.target.value })}>{ESPECIAL.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <label>Quebrantos anteriores<input type="number" min="0" step="any" value={cfg.quebrantos_anteriores} onChange={(e) => setCfg({ ...cfg, quebrantos_anteriores: e.target.value })} /></label>
        <label>Pagos a cuenta<input type="number" min="0" step="any" value={cfg.pagos_a_cuenta} onChange={(e) => setCfg({ ...cfg, pagos_a_cuenta: e.target.value })} /></label>
        <button className="sec" onClick={guardarCfg}>Guardar</button>
      </div>
      <div className="card">
        <h3>Deducciones y amortizaciones cargadas</h3>
        <table>
          <tbody>{deds.map((d) => <tr key={d.id}><td>{CONCEPTOS.find(([v]) => v === d.concepto)?.[1]}</td><td>{d.descripcion}</td><td className="n">{money(d.importe)}</td><td><button className="sec" onClick={() => borrar(d.id)}>✕</button></td></tr>)}</tbody>
        </table>
        <div className="row">
          <label>Concepto<select value={nueva.concepto} onChange={(e) => setNueva({ ...nueva, concepto: e.target.value })}>{CONCEPTOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
          <label>Importe<input type="number" min="0" step="any" value={nueva.importe} onChange={(e) => setNueva({ ...nueva, importe: e.target.value })} /></label>
          <label>Detalle<input value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} /></label>
          <button onClick={agregar} disabled={!nueva.importe}>Agregar</button>
        </div>
      </div>
      <button onClick={calcular}>Calcular Ganancias {anio}</button>
      {error && <div className="err">{error}</div>}
      {res && (
        <>
          <h3>Resultado (calculado {new Date(res.calculada_at).toLocaleString('es-AR')})</h3>
          <Kpis datos={{ ingresos_netos: res.ingresos_netos, costo_mercaderia_vendida: res.costo_mercaderia_vendida, gastos_computables: res.gastos_computables, gastos_no_computados: res.gastos_no_computados, resultado_actividad: res.resultado_actividad, deducciones_generales: res.deducciones_generales, deducciones_personales: res.deducciones_personales, ganancia_imponible: res.ganancia_imponible, impuesto_determinado: res.impuesto_determinado, pagos_a_cuenta: res.pagos_a_cuenta, saldo: res.saldo }} />
          <p>Saldo positivo = a pagar; negativo = a favor. Tramo {res.detalle?.tramo}, alícuota marginal {res.detalle?.alicuota_marginal}%.</p>
        </>
      )}
      <p style={{ fontSize: 12, color: '#666' }}>Estimación de gestión con las tablas de ARCA cargadas por año. Solo cuentan gastos con comprobante y en categorías deducibles. Validá la deducción especial y los topes con tu contador. Los monotributistas no determinan Ganancias por la actividad.</p>
    </>
  )
}
