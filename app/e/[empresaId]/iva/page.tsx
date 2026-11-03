'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabla } from '@/components/Tablas'
import { hoy } from '@/components/Filtros'

export default function Iva() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const sb = useMemo(() => createClient(), [])
  const [filas, setFilas] = useState<any[]>([])
  const [mes, setMes] = useState(hoy.slice(0, 7))
  const [perc, setPerc] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function cargar() {
    const { data } = await sb.from('liquidaciones_iva')
      .select('periodo, debito_fiscal, credito_fiscal, saldo_tecnico_anterior, percepciones_retenciones, saldo_libre_anterior, saldo_tecnico_final, saldo_libre_final, iva_a_pagar, estado')
      .eq('empresa_id', empresaId).order('periodo', { ascending: false }).limit(24)
    setFilas(data ?? [])
  }
  useEffect(() => { cargar() }, [])

  async function accion(fn: 'calcular' | 'cerrar' | 'reabrir') {
    setError(''); setOk('')
    const periodo = mes + '-01'
    const r = fn === 'reabrir'
      ? await sb.rpc('reabrir_liquidacion_iva', { p_empresa: empresaId, p_periodo: periodo })
      : await sb.rpc('liquidar_iva', { p_empresa: empresaId, p_periodo: periodo, p_percepciones: perc === '' ? null : Number(perc), p_cerrar: fn === 'cerrar' })
    if (r.error) return setError(r.error.message)
    setOk(fn === 'reabrir' ? 'Período reabierto.' : fn === 'cerrar' ? 'Período cerrado.' : 'Liquidación calculada (borrador).')
    cargar()
  }

  return (
    <>
      <h1>IVA</h1>
      <p><Link href={`/e/${empresaId}/reportes/iva-ventas`}>Libro IVA Ventas</Link> · <Link href={`/e/${empresaId}/reportes/iva-compras`}>Libro IVA Compras</Link></p>
      <div className="card row">
        <label>Período<input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label>
        <label>Percepciones / retenciones de IVA sufridas<input type="number" min="0" step="any" value={perc} onChange={(e) => setPerc(e.target.value)} placeholder="(dejar vacío para conservar)" /></label>
        <button onClick={() => accion('calcular')}>Calcular</button>
        <button className="sec" onClick={() => accion('cerrar')}>Calcular y cerrar</button>
        <button className="sec" onClick={() => accion('reabrir')}>Reabrir</button>
      </div>
      {error && <div className="err">{error}</div>}
      {ok && <p>{ok}</p>}
      <Tabla filas={filas} />
      <p style={{ fontSize: 12, color: '#666' }}>Estimación de gestión: no reemplaza la declaración jurada. Cerrar un período bloquea emitir, registrar o anular comprobantes de ese mes. Los monotributistas no liquidan IVA.</p>
    </>
  )
}
