'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/format'

const TIPOS = [['cliente', 'Cliente'], ['proveedor', 'Proveedor'], ['ambos', 'Cliente y proveedor']]
const CONDS = [['responsable_inscripto', 'Responsable Inscripto'], ['monotributista', 'Monotributista'], ['exento', 'Exento'], ['consumidor_final', 'Consumidor final']]
const FORMAS = ['efectivo', 'transferencia', 'debito', 'credito', 'mercado_pago', 'cheque', 'otro']

export default function Tercero() {
  const { empresaId, id } = useParams<{ empresaId: string; id: string }>()
  const nuevo = id === 'nuevo'
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [f, setF] = useState<any>({ tipo: 'cliente', razon_social: '', cuit: '', condicion_iva: 'consumidor_final', email: '', telefono: '', domicilio: '', activo: true })
  const [saldo, setSaldo] = useState(0)
  const [cuentas, setCuentas] = useState<any[]>([])
  const [mov, setMov] = useState<any>({ tipo: 'cobro', importe: '', cuenta: '', forma: 'efectivo' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const cargar = useCallback(async () => {
    if (nuevo) return
    const [t, s, c] = await Promise.all([
      supabase.from('terceros').select('*').eq('id', id).single(),
      supabase.from('v_saldos_terceros').select('saldo').eq('tercero_id', id).maybeSingle(),
      supabase.from('cuentas_financieras').select('id, nombre').eq('empresa_id', empresaId).eq('activa', true).order('nombre'),
    ])
    if (t.data) { setF(t.data); setMov((m: any) => ({ ...m, tipo: t.data.tipo === 'proveedor' ? 'pago' : 'cobro' })) }
    setSaldo(Number(s.data?.saldo ?? 0)); setCuentas(c.data ?? [])
    setMov((m: any) => ({ ...m, cuenta: m.cuenta || c.data?.[0]?.id || '' }))
  }, [id, nuevo, empresaId, supabase])
  useEffect(() => { cargar() }, [cargar])

  const set = (k: string, v: any) => setF({ ...f, [k]: v })

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const datos = {
      tipo: f.tipo, razon_social: f.razon_social.trim(), cuit: f.cuit?.trim() || null, condicion_iva: f.condicion_iva,
      email: f.email || null, telefono: f.telefono || null, domicilio: f.domicilio || null, activo: f.activo,
    }
    const r = nuevo ? await supabase.from('terceros').insert({ ...datos, empresa_id: empresaId }) : await supabase.from('terceros').update(datos).eq('id', id)
    if (r.error) return setError(r.error.message)
    router.push(`/e/${empresaId}/terceros`); router.refresh()
  }

  async function registrar() {
    setError(''); setOk('')
    const { error } = await supabase.rpc('registrar_pago_cobro', {
      p_tercero_id: id, p_tipo: mov.tipo, p_importe: Number(mov.importe), p_cuenta_id: mov.cuenta, p_forma: mov.forma,
    })
    if (error) return setError(error.message)
    setOk(`${mov.tipo === 'cobro' ? 'Cobro' : 'Pago'} registrado.`); setMov({ ...mov, importe: '' }); cargar()
  }

  return (
    <>
      <h1>{nuevo ? 'Nuevo cliente o proveedor' : f.razon_social}</h1>
      <form className="card row" onSubmit={guardar}>
        <label>Tipo<select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <label>Razón social<input required value={f.razon_social} onChange={(e) => set('razon_social', e.target.value)} /></label>
        <label>CUIT<input value={f.cuit ?? ''} onChange={(e) => set('cuit', e.target.value)} /></label>
        <label>Condición IVA<select value={f.condicion_iva} onChange={(e) => set('condicion_iva', e.target.value)}>{CONDS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <label>Email<input type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></label>
        <label>Teléfono<input value={f.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} /></label>
        <label>Domicilio<input value={f.domicilio ?? ''} onChange={(e) => set('domicilio', e.target.value)} /></label>
        <label>Activo<input type="checkbox" checked={f.activo} onChange={(e) => set('activo', e.target.checked)} /></label>
        <button>Guardar</button>
      </form>
      {error && <div className="err">{error}</div>}
      {!nuevo && (
        <div className="card">
          <h3>Saldo: {money(Math.abs(saldo))} {saldo > 0 ? 'nos debe' : saldo < 0 ? 'le debemos' : '(al día)'}</h3>
          <div className="row">
            {f.tipo === 'ambos' && <label>Operación<select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}><option value="cobro">Cobro</option><option value="pago">Pago</option></select></label>}
            <label>Importe<input type="number" min="0" step="any" value={mov.importe} onChange={(e) => setMov({ ...mov, importe: e.target.value })} /></label>
            <label>Cuenta<select value={mov.cuenta} onChange={(e) => setMov({ ...mov, cuenta: e.target.value })}>{cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
            <label>Forma<select value={mov.forma} onChange={(e) => setMov({ ...mov, forma: e.target.value })}>{FORMAS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <button className="sec" onClick={registrar}>Registrar {mov.tipo === 'cobro' ? 'cobro' : 'pago'}</button>
          </div>
          {ok && <p>{ok}</p>}
        </div>
      )}
    </>
  )
}
