'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hoy } from '@/components/Filtros'
import { money } from '@/lib/format'

type Linea = { cuenta: string; debe: string; haber: string; glosa: string }
const linea = (): Linea => ({ cuenta: '', debe: '', haber: '', glosa: '' })

export default function Asiento() {
  const { empresaId, id } = useParams<{ empresaId: string; id: string }>()
  const nuevo = id === 'nuevo'
  const router = useRouter()
  const sb = useMemo(() => createClient(), [])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [cab, setCab] = useState<any>({ fecha: hoy, glosa: '', tipo: 'manual', estado: 'borrador' })
  const [lineas, setLineas] = useState<Linea[]>([linea(), linea()])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const texto = (c: any) => `${c.codigo} – ${c.nombre}`
  const resolver = (t: string) => cuentas.find((c) => texto(c) === t || c.codigo === t.trim())

  const cargar = useCallback(async () => {
    const { data: cs } = await sb.from('cuentas_contables').select('id, codigo, nombre').eq('empresa_id', empresaId).eq('activa', true).order('codigo')
    setCuentas(cs ?? [])
    if (nuevo) return
    const [a, l] = await Promise.all([
      sb.from('asientos_manuales').select('*').eq('id', id).single(),
      sb.from('asiento_lineas').select('cuenta_id, debe, haber, glosa').eq('asiento_id', id).order('created_at', { ascending: true } as any),
    ])
    if (a.data) setCab(a.data)
    const mapa = new Map((cs ?? []).map((c: any) => [c.id, c]))
    setLineas((l.data ?? []).map((x: any) => ({ cuenta: mapa.get(x.cuenta_id) ? `${(mapa.get(x.cuenta_id) as any).codigo} – ${(mapa.get(x.cuenta_id) as any).nombre}` : '', debe: Number(x.debe) ? String(x.debe) : '', haber: Number(x.haber) ? String(x.haber) : '', glosa: x.glosa ?? '' })))
  }, [id, nuevo, empresaId, sb])
  useEffect(() => { cargar() }, [cargar])

  const editable = nuevo || cab.estado === 'borrador'
  const totD = lineas.reduce((s, l) => s + Number(l.debe || 0), 0)
  const totH = lineas.reduce((s, l) => s + Number(l.haber || 0), 0)
  const dif = Math.round((totD - totH) * 100) / 100
  const setL = (i: number, p: Partial<Linea>) => setLineas(lineas.map((l, j) => (j === i ? { ...l, ...p } : l)))

  // Guarda el borrador (cabecera + líneas) y devuelve el id
  async function persistir(): Promise<string | null> {
    if (!cab.glosa.trim()) { setError('Escribí la glosa del asiento.'); return null }
    const validas: any[] = []
    for (const [i, l] of lineas.entries()) {
      if (!l.cuenta && !l.debe && !l.haber) continue
      const c = resolver(l.cuenta)
      if (!c) { setError(`Línea ${i + 1}: elegí una cuenta del plan.`); return null }
      const d = Number(l.debe || 0), h = Number(l.haber || 0)
      if ((d > 0) === (h > 0)) { setError(`Línea ${i + 1}: cargá el importe en el debe o en el haber (uno solo).`); return null }
      validas.push({ cuenta_id: c.id, debe: d, haber: h, glosa: l.glosa || null })
    }
    if (validas.length < 2) { setError('El asiento necesita al menos dos líneas.'); return null }
    const { data: { user } } = await sb.auth.getUser()
    let aid = nuevo ? crypto.randomUUID() : id
    if (nuevo) {
      const r = await sb.from('asientos_manuales').insert({ id: aid, empresa_id: empresaId, fecha: cab.fecha, glosa: cab.glosa.trim(), tipo: 'manual', created_by: user?.id })
      if (r.error) { setError(r.error.message); return null }
    } else {
      const r = await sb.from('asientos_manuales').update({ fecha: cab.fecha, glosa: cab.glosa.trim() }).eq('id', aid)
      if (r.error) { setError(r.error.message); return null }
      const d = await sb.from('asiento_lineas').delete().eq('asiento_id', aid)
      if (d.error) { setError(d.error.message); return null }
    }
    const li = await sb.from('asiento_lineas').insert(validas.map((v) => ({ ...v, empresa_id: empresaId, asiento_id: aid })))
    if (li.error) { setError(li.error.message); return null }
    return aid
  }

  async function guardar(confirmar: boolean) {
    setError(''); setOk(''); setGuardando(true)
    const aid = await persistir()
    if (!aid) { setGuardando(false); return }
    if (confirmar) {
      const r = await sb.rpc('confirmar_asiento', { p_id: aid })
      if (r.error) { setGuardando(false); setError('Se guardó como borrador, pero no se pudo confirmar: ' + r.error.message); if (nuevo) router.replace(`/e/${empresaId}/contabilidad/asientos/${aid}`); return }
    }
    setGuardando(false)
    router.push(`/e/${empresaId}/contabilidad/asientos`)
  }

  async function anular() {
    const motivo = window.prompt('Motivo de la anulación (opcional):') ?? undefined
    const { error } = await sb.rpc('anular_asiento', { p_id: id, p_motivo: motivo })
    if (error) return setError(error.message)
    setOk('Asiento anulado.'); cargar()
  }
  async function borrar() {
    if (!window.confirm('¿Eliminar este borrador?')) return
    const { error } = await sb.from('asientos_manuales').delete().eq('id', id)
    if (error) return setError(error.message)
    router.push(`/e/${empresaId}/contabilidad/asientos`)
  }

  return (
    <>
      <h1>{nuevo ? 'Nuevo asiento' : `Asiento ${id.slice(0, 8)} · ${cab.estado}`}</h1>
      <div className="card row">
        <label>Fecha<input type="date" disabled={!editable} value={cab.fecha} onChange={(e) => setCab({ ...cab, fecha: e.target.value })} /></label>
        <label style={{ flex: 1 }}>Glosa<input disabled={!editable} value={cab.glosa} onChange={(e) => setCab({ ...cab, glosa: e.target.value })} placeholder="Descripción del asiento" /></label>
        {!nuevo && <span className="tag">{cab.tipo}</span>}
      </div>
      <datalist id="cuentas">{cuentas.map((c) => <option key={c.id} value={texto(c)} />)}</datalist>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th style={{ width: 36 }}>#</th><th>Cuenta</th><th>Detalle</th><th className="n" style={{ width: 140 }}>Debe</th><th className="n" style={{ width: 140 }}>Haber</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><input list="cuentas" disabled={!editable} value={l.cuenta} onChange={(e) => setL(i, { cuenta: e.target.value })} style={{ width: '100%' }} placeholder="Código o nombre" /></td>
                <td><input disabled={!editable} value={l.glosa} onChange={(e) => setL(i, { glosa: e.target.value })} style={{ width: '100%' }} /></td>
                <td><input type="number" min="0" step="any" disabled={!editable} value={l.debe} onChange={(e) => setL(i, { debe: e.target.value, haber: e.target.value ? '' : l.haber })} style={{ width: '100%', textAlign: 'right' }} /></td>
                <td><input type="number" min="0" step="any" disabled={!editable} value={l.haber} onChange={(e) => setL(i, { haber: e.target.value, debe: e.target.value ? '' : l.debe })} style={{ width: '100%', textAlign: 'right' }} /></td>
                <td>{editable && lineas.length > 2 && <button className="sec" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>✕</button>}</td>
              </tr>
            ))}
            <tr className="sec-fila">
              <td colSpan={3} style={{ textAlign: 'right' }}>Totales</td>
              <td className="n">{money(totD)}</td><td className="n">{money(totH)}</td><td />
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ color: dif === 0 && totD > 0 ? '#166534' : '#b91c1c', fontWeight: 600 }}>
        {totD === 0 && totH === 0 ? 'Cargá las líneas del asiento.' : dif === 0 ? '✔ El asiento balancea.' : `Diferencia: ${money(Math.abs(dif))} ${dif > 0 ? 'de más en el debe' : 'de más en el haber'}`}
      </p>
      {error && <div className="err">{error}</div>}
      {ok && <div className="ok">{ok}</div>}
      <div className="row">
        {editable && <>
          <button className="sec" onClick={() => setLineas([...lineas, linea()])}>+ Agregar línea</button>
          <button className="sec" disabled={guardando} onClick={() => guardar(false)}>Guardar borrador</button>
          <button disabled={guardando || dif !== 0 || totD === 0} onClick={() => guardar(true)}>Confirmar asiento</button>
          {!nuevo && <button className="sec" onClick={borrar}>Eliminar borrador</button>}
        </>}
        {!nuevo && cab.estado === 'confirmado' && ['manual', 'ajuste'].includes(cab.tipo) && <button className="sec" onClick={anular}>Anular asiento</button>}
        {!nuevo && cab.estado === 'confirmado' && !['manual', 'ajuste'].includes(cab.tipo) && <span style={{ fontSize: 12, color: '#666' }}>Lo generó el módulo de {cab.tipo}: se corrige desde ahí.</span>}
        <Link href={`/e/${empresaId}/contabilidad/asientos`}><button className="sec">Volver</button></Link>
      </div>
    </>
  )
}
