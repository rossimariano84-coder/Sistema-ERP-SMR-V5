'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const VACIO = { id: '', nombre: '', naturaleza: 'fijo', deducible_ganancias: true, es_compra_mercaderia: false, cuenta_id: '', activa: true }

export default function Categorias() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const sb = useMemo(() => createClient(), [])
  const [cats, setCats] = useState<any[]>([])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [form, setForm] = useState<any>(VACIO)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function cargar() {
    const [c, a] = await Promise.all([
      sb.from('categorias_egreso').select('*').eq('empresa_id', empresaId).order('nombre'),
      sb.from('cuentas_contables').select('id, codigo, nombre, tipo').eq('empresa_id', empresaId).eq('activa', true).in('tipo', ['egreso', 'activo', 'pasivo']).order('codigo'),
    ])
    setCats(c.data ?? []); setCuentas(a.data ?? [])
  }
  useEffect(() => { cargar() }, [])

  const set = (k: string, v: any) => setForm({ ...form, [k]: v })
  const nombreCuenta = (id: string | null) => { const c = cuentas.find((x) => x.id === id); return c ? `${c.codigo} ${c.nombre}` : 'Automática según naturaleza' }

  async function guardar() {
    setError(''); setOk('')
    const datos = { nombre: form.nombre.trim(), naturaleza: form.naturaleza, deducible_ganancias: form.deducible_ganancias, es_compra_mercaderia: form.es_compra_mercaderia, cuenta_id: form.cuenta_id || null, activa: form.activa }
    const r = form.id ? await sb.from('categorias_egreso').update(datos).eq('id', form.id) : await sb.from('categorias_egreso').insert({ ...datos, empresa_id: empresaId })
    if (r.error) return setError(r.error.message.includes('duplicate') ? 'Ya existe una categoría con ese nombre.' : r.error.message)
    setOk('Categoría guardada.'); setForm(VACIO); cargar()
  }

  return (
    <>
      <h1>Categorías de egreso</h1>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Modificar categoría' : 'Nueva categoría'}</h3>
        <div className="row">
          <label>Nombre<input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} style={{ width: 230 }} /></label>
          <label>Naturaleza<select value={form.naturaleza} onChange={(e) => set('naturaleza', e.target.value)}><option value="fijo">Costo fijo</option><option value="variable">Costo variable</option></select></label>
          <label>Cuenta contable<select value={form.cuenta_id} onChange={(e) => set('cuenta_id', e.target.value)} style={{ minWidth: 250 }}>
            <option value="">Automática según naturaleza</option>{cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nombre} ({c.tipo})</option>)}
          </select></label>
          <label>Deduce Ganancias<input type="checkbox" checked={form.deducible_ganancias} onChange={(e) => set('deducible_ganancias', e.target.checked)} /></label>
          <label>Compra de mercadería<input type="checkbox" checked={form.es_compra_mercaderia} onChange={(e) => set('es_compra_mercaderia', e.target.checked)} /></label>
          <label>Activa<input type="checkbox" checked={form.activa} onChange={(e) => set('activa', e.target.checked)} /></label>
          <button onClick={guardar} disabled={!form.nombre.trim()}>Guardar</button>
          {form.id && <button className="sec" onClick={() => setForm(VACIO)}>Cancelar</button>}
        </div>
        <p style={{ fontSize: 12, color: '#666' }}>Si vinculás una cuenta propia, los egresos de esta categoría se imputan a ella (por ejemplo un seguro pagado por adelantado a "Gastos pagados por adelantado"). La naturaleza de esa cuenta decide si cuenta como costo fijo o variable en el punto de equilibrio.</p>
      </div>
      {error && <div className="err">{error}</div>}
      {ok && <div className="ok">{ok}</div>}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Categoría</th><th>Naturaleza</th><th>Cuenta contable</th><th>Ganancias</th><th>Mercadería</th><th>Estado</th><th /></tr></thead>
          <tbody>{cats.map((c) => (
            <tr key={c.id} style={{ opacity: c.activa ? 1 : 0.5 }}>
              <td><strong>{c.nombre}</strong></td><td>{c.naturaleza}</td><td>{nombreCuenta(c.cuenta_id)}</td>
              <td>{c.deducible_ganancias ? 'Deduce' : 'No deduce'}</td><td>{c.es_compra_mercaderia ? 'Sí' : ''}</td><td>{c.activa ? 'Activa' : 'Inactiva'}</td>
              <td><button className="sec" onClick={() => setForm({ ...c, cuenta_id: c.cuenta_id ?? '' })}>Modificar</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  )
}
