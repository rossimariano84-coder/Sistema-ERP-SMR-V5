'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TIPOS: [string, string][] = [['activo', 'ACTIVO'], ['pasivo', 'PASIVO'], ['patrimonio', 'PATRIMONIO NETO'], ['ingreso', 'INGRESOS'], ['egreso', 'EGRESOS (costos y gastos)']]
const NAT: [string, string][] = [['fijo', 'Fijo'], ['variable', 'Variable'], ['otro', 'Otro resultado']]
const VACIO = { id: '', codigo: '', nombre: '', tipo: 'activo', rubro: '', naturaleza_costo: 'fijo', activa: true, rol_sistema: null as string | null }

export default function Plan() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const sb = useMemo(() => createClient(), [])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [form, setForm] = useState<any>(VACIO)
  const [buscar, setBuscar] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function cargar() {
    const { data, error } = await sb.from('cuentas_contables').select('id, codigo, nombre, tipo, rubro, naturaleza_costo, rol_sistema, activa').eq('empresa_id', empresaId).order('codigo')
    if (error) setError(error.message); else setCuentas(data ?? [])
  }
  useEffect(() => { cargar() }, [])

  const editando = !!form.id
  const sistema = !!form.rol_sistema
  const rubros = Array.from(new Set(cuentas.map((c) => c.rubro)))
  const set = (k: string, v: any) => setForm({ ...form, [k]: v })

  async function guardar() {
    setError(''); setOk('')
    const base: any = { codigo: form.codigo.trim(), nombre: form.nombre.trim(), rubro: form.rubro.trim() || 'Sin rubro' }
    let r
    if (!editando) {
      r = await sb.from('cuentas_contables').insert({ ...base, empresa_id: empresaId, tipo: form.tipo, naturaleza_costo: form.tipo === 'egreso' ? form.naturaleza_costo : null })
    } else {
      if (!sistema) { base.activa = form.activa; if (form.tipo === 'egreso') base.naturaleza_costo = form.naturaleza_costo }
      r = await sb.from('cuentas_contables').update(base).eq('id', form.id)
    }
    if (r.error) return setError(r.error.message.includes('duplicate') ? 'Ya existe una cuenta con ese código.' : r.error.message)
    setOk(editando ? 'Cuenta actualizada.' : 'Cuenta creada.'); setForm(VACIO); cargar()
  }

  async function eliminar(c: any) {
    if (!window.confirm(`¿Eliminar la cuenta ${c.codigo} ${c.nombre}?`)) return
    const { error } = await sb.from('cuentas_contables').delete().eq('id', c.id)
    if (error) return setError(/foreign key|violates/i.test(error.message) ? 'La cuenta ya tiene movimientos o está en uso: desactivala en lugar de eliminarla.' : error.message)
    cargar()
  }

  const filtradas = cuentas.filter((c) => !buscar || `${c.codigo} ${c.nombre} ${c.rubro}`.toLowerCase().includes(buscar.toLowerCase()))

  return (
    <>
      <h1>Plan de cuentas</h1>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editando ? `Modificar cuenta ${form.codigo}` : 'Nueva cuenta'}</h3>
        <div className="row">
          <label>Código<input value={form.codigo} onChange={(e) => set('codigo', e.target.value)} style={{ width: 110 }} placeholder="5.2.10" /></label>
          <label>Nombre<input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} style={{ width: 260 }} /></label>
          <label>Tipo<select value={form.tipo} disabled={editando} onChange={(e) => set('tipo', e.target.value)}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
          <label>Rubro<input list="rubros" value={form.rubro} onChange={(e) => set('rubro', e.target.value)} /></label>
          <datalist id="rubros">{rubros.map((r) => <option key={r} value={r} />)}</datalist>
          {form.tipo === 'egreso' && <label>Naturaleza (punto de equilibrio)<select value={form.naturaleza_costo ?? 'fijo'} disabled={sistema} onChange={(e) => set('naturaleza_costo', e.target.value)}>{NAT.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>}
          {editando && <label>Activa<input type="checkbox" checked={form.activa} disabled={sistema} onChange={(e) => set('activa', e.target.checked)} /></label>}
          <button onClick={guardar} disabled={!form.codigo.trim() || !form.nombre.trim()}>{editando ? 'Guardar cambios' : 'Crear cuenta'}</button>
          {editando && <button className="sec" onClick={() => { setForm(VACIO); setError('') }}>Cancelar</button>}
        </div>
        {sistema && <p style={{ fontSize: 12, color: '#7a4b00' }}>Cuenta del sistema: la usan los asientos automáticos. Podés cambiar su código, nombre y rubro, pero no eliminarla ni cambiar su tipo.</p>}
      </div>
      {error && <div className="err">{error}</div>}
      {ok && <div className="ok">{ok}</div>}
      <div className="row no-print" style={{ marginBottom: 8 }}>
        <label>Buscar<input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="código, nombre o rubro" /></label>
        <button className="sec" onClick={() => window.print()}>Imprimir</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Rubro</th><th>Naturaleza</th><th>Origen</th><th>Estado</th><th className="no-print" /></tr></thead>
          <tbody>
            {TIPOS.map(([t, nombre]) => {
              const items = filtradas.filter((c) => c.tipo === t)
              if (!items.length) return null
              return [
                <tr className="sec-fila" key={t}><td colSpan={7}>{nombre}</td></tr>,
                ...items.map((c) => (
                  <tr key={c.id} style={{ opacity: c.activa ? 1 : 0.5 }}>
                    <td><strong>{c.codigo}</strong></td><td>{c.nombre}</td><td>{c.rubro}</td><td>{c.naturaleza_costo ?? ''}</td>
                    <td>{c.rol_sistema ? <span className="tag sis">Sistema</span> : <span className="tag">Propia</span>}</td>
                    <td>{c.activa ? 'Activa' : 'Inactiva'}</td>
                    <td className="no-print" style={{ whiteSpace: 'nowrap' }}>
                      <button className="sec" onClick={() => { setForm({ ...c, naturaleza_costo: c.naturaleza_costo ?? 'fijo' }); setError(''); setOk('') }}>Modificar</button>{' '}
                      {!c.rol_sistema && <button className="sec" onClick={() => eliminar(c)}>Eliminar</button>}
                    </td>
                  </tr>
                )),
              ]
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
