'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/format'

export default function Caja() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const sb = useMemo(() => createClient(), [])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [movs, setMovs] = useState<any[]>([])
  const [nueva, setNueva] = useState({ nombre: '', tipo: 'banco', saldo_inicial: '0' })
  const [tr, setTr] = useState({ origen: '', destino: '', importe: '' })
  const [error, setError] = useState('')

  async function cargar() {
    const [c, m] = await Promise.all([
      sb.from('v_saldos_cuentas').select('cuenta_id, nombre, tipo, saldo').eq('empresa_id', empresaId).order('nombre'),
      sb.from('v_mov_fin_vigentes').select('id, fecha, concepto, m').eq('empresa_id', empresaId).order('fecha', { ascending: false }).limit(40),
    ])
    setCuentas(c.data ?? []); setMovs(m.data ?? [])
    setTr((t) => ({ ...t, origen: t.origen || c.data?.[0]?.cuenta_id || '', destino: t.destino || c.data?.[1]?.cuenta_id || c.data?.[0]?.cuenta_id || '' }))
  }
  useEffect(() => { cargar() }, [])

  async function crear() {
    setError('')
    const { error } = await sb.from('cuentas_financieras').insert({ empresa_id: empresaId, nombre: nueva.nombre.trim(), tipo: nueva.tipo, saldo_inicial: Number(nueva.saldo_inicial || 0) })
    if (error) return setError(error.message)
    setNueva({ nombre: '', tipo: 'banco', saldo_inicial: '0' }); cargar()
  }
  async function transferir() {
    setError('')
    const { error } = await sb.rpc('transferir_entre_cuentas', { p_origen: tr.origen, p_destino: tr.destino, p_importe: Number(tr.importe) })
    if (error) return setError(error.message)
    setTr({ ...tr, importe: '' }); cargar()
  }

  return (
    <>
      <h1>Caja y bancos</h1>
      {error && <div className="err">{error}</div>}
      <div className="kpis">{cuentas.map((c) => <div className="kpi" key={c.cuenta_id}><small>{c.nombre} ({c.tipo})</small><strong>{money(c.saldo)}</strong></div>)}</div>
      <div className="card row">
        <label>Nueva cuenta<input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Banco Nación" /></label>
        <label>Tipo<select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}><option value="caja">Caja</option><option value="banco">Banco</option><option value="billetera_virtual">Billetera virtual</option><option value="tarjeta">Tarjeta</option></select></label>
        <label>Saldo inicial<input type="number" step="any" value={nueva.saldo_inicial} onChange={(e) => setNueva({ ...nueva, saldo_inicial: e.target.value })} /></label>
        <button onClick={crear} disabled={!nueva.nombre.trim()}>Crear cuenta</button>
      </div>
      <div className="card row">
        <label>Transferir desde<select value={tr.origen} onChange={(e) => setTr({ ...tr, origen: e.target.value })}>{cuentas.map((c) => <option key={c.cuenta_id} value={c.cuenta_id}>{c.nombre}</option>)}</select></label>
        <label>hacia<select value={tr.destino} onChange={(e) => setTr({ ...tr, destino: e.target.value })}>{cuentas.map((c) => <option key={c.cuenta_id} value={c.cuenta_id}>{c.nombre}</option>)}</select></label>
        <label>Importe<input type="number" min="0" step="any" value={tr.importe} onChange={(e) => setTr({ ...tr, importe: e.target.value })} /></label>
        <button className="sec" onClick={transferir} disabled={!tr.importe}>Transferir</button>
      </div>
      <h3>Últimos movimientos</h3>
      <div className="card">
        <table>
          <thead><tr><th>Fecha</th><th>Concepto</th><th className="n">Importe</th></tr></thead>
          <tbody>{movs.map((x) => <tr key={x.id}><td>{x.fecha}</td><td>{x.concepto}</td><td className="n" style={{ color: x.m < 0 ? '#b91c1c' : '#15803d' }}>{money(x.m)}</td></tr>)}
            {movs.length === 0 && <tr><td colSpan={3}>Sin movimientos.</td></tr>}</tbody>
        </table>
      </div>
    </>
  )
}
