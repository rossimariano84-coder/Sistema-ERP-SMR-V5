'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hoy } from '@/components/Filtros'
import { money } from '@/lib/format'

const TIPOS = [['factura_a', 'Factura A'], ['factura_b', 'Factura B'], ['factura_c', 'Factura C'], ['ticket', 'Ticket'], ['nota_credito', 'Nota de crédito de proveedor'], ['sin_comprobante', 'Sin comprobante']]
const FORMAS = ['efectivo', 'transferencia', 'debito', 'credito', 'mercado_pago', 'cheque', 'otro']
const MONTOS = [['neto_gravado', 'Neto gravado'], ['neto_no_gravado', 'No gravado'], ['exento', 'Exento'], ['iva_21', 'IVA 21%'], ['iva_10_5', 'IVA 10,5%'], ['iva_27', 'IVA 27%'], ['otros_tributos', 'Percepciones / otros tributos']]

export default function NuevoEgreso() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const router = useRouter()
  const sb = useMemo(() => createClient(), [])
  const [provs, setProvs] = useState<any[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [prods, setProds] = useState<any[]>([])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [tipo, setTipo] = useState('factura_a')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [provId, setProvId] = useState('')
  const [catId, setCatId] = useState('')
  const [desc, setDesc] = useState('')
  const [m, setM] = useState<Record<string, string>>({})
  const [cond, setCond] = useState('contado')
  const [forma, setForma] = useState('efectivo')
  const [cuentaId, setCuentaId] = useState('')
  const [items, setItems] = useState<{ productoId: string; cantidad: string; costo: string }[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    (async () => {
      const [p, c, pr, cu] = await Promise.all([
        sb.from('terceros').select('id, razon_social').eq('empresa_id', empresaId).in('tipo', ['proveedor', 'ambos']).eq('activo', true).order('razon_social'),
        sb.from('categorias_egreso').select('id, nombre, naturaleza').eq('empresa_id', empresaId).eq('activa', true).order('nombre'),
        sb.from('productos').select('id, sku, nombre, costo').eq('empresa_id', empresaId).eq('activo', true).eq('controla_stock', true).order('nombre'),
        sb.from('cuentas_financieras').select('id, nombre').eq('empresa_id', empresaId).eq('activa', true).order('nombre'),
      ])
      setProvs(p.data ?? []); setCats(c.data ?? []); setProds(pr.data ?? []); setCuentas(cu.data ?? [])
      setCatId(c.data?.[0]?.id ?? ''); setCuentaId(cu.data?.[0]?.id ?? '')
    })()
  }, [empresaId, sb])

  const n = (k: string) => Number(m[k] || 0)
  const total = MONTOS.reduce((s, [k]) => s + n(k), 0)
  const setItem = (i: number, p: any) => setItems(items.map((it, j) => (j === i ? { ...it, ...p } : it)))

  async function guardar() {
    setError(''); setEnviando(true)
    const { data: { user } } = await sb.auth.getUser()
    const id = crypto.randomUUID()
    const montos: Record<string, number> = {}
    MONTOS.forEach(([k]) => { montos[k] = n(k) })
    const r1 = await sb.from('egresos').insert({
      id, empresa_id: empresaId, proveedor_id: provId || null, categoria_id: catId || null, fecha, tipo_comprobante: tipo,
      numero_comprobante: numero || null, descripcion: desc || null, ...montos, total, condicion_pago: cond,
      forma_pago: cond === 'contado' ? forma : null, cuenta_financiera_id: cond === 'contado' ? cuentaId || null : null, created_by: user?.id,
    })
    if (r1.error) { setEnviando(false); return setError(r1.error.message) }
    const validos = items.filter((i) => i.productoId && Number(i.cantidad) > 0)
    const r2: { error: any } = validos.length
      ? await sb.from('egreso_items').insert(validos.map((i) => ({ empresa_id: empresaId, egreso_id: id, producto_id: i.productoId, cantidad: Number(i.cantidad), costo_unitario: Number(i.costo || 0) })))
      : { error: null }
    const r3: { error: any } = r2.error ? r2 : await sb.rpc('registrar_egreso', { p_id: id })
    if (r3.error) { await sb.from('egresos').delete().eq('id', id); setEnviando(false); return setError(r3.error.message) }
    router.push(`/e/${empresaId}/egresos`)
  }

  return (
    <>
      <h1>Nuevo egreso</h1>
      <div className="card row">
        <label>Comprobante<select value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map(([v, x]) => <option key={v} value={v}>{x}</option>)}</select></label>
        <label>Número<input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0001-00000123" /></label>
        <label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label>Proveedor<select value={provId} onChange={(e) => setProvId(e.target.value)}><option value="">(sin proveedor)</option>{provs.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}</select></label>
        <label>Categoría<select value={catId} onChange={(e) => setCatId(e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.naturaleza})</option>)}</select></label>
        <label>Detalle<input value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
      </div>
      <div className="card row">
        {MONTOS.map(([k, x]) => <label key={k}>{x}<input type="number" min="0" step="any" style={{ width: 130 }} value={m[k] ?? ''} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></label>)}
        <button className="sec" onClick={() => setM({ ...m, iva_21: String(Math.round(n('neto_gravado') * 21) / 100) })}>IVA 21% sobre el neto</button>
        <strong>Total {money(total)}</strong>
      </div>
      <div className="card row">
        <label>Pago<select value={cond} onChange={(e) => setCond(e.target.value)}><option value="contado">Contado</option><option value="cuenta_corriente">Cuenta corriente (queda a pagar)</option></select></label>
        {cond === 'contado' && <>
          <label>Forma<select value={forma} onChange={(e) => setForma(e.target.value)}>{FORMAS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Sale de<select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>{cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
        </>}
      </div>
      {tipo !== 'nota_credito' && (
        <div className="card">
          <h3>Mercadería comprada (opcional: suma stock y actualiza el costo)</h3>
          {items.map((it, i) => (
            <div className="row" key={i}>
              <label>Producto<select value={it.productoId} onChange={(e) => setItem(i, { productoId: e.target.value, costo: String(prods.find((p) => p.id === e.target.value)?.costo ?? '') })}><option value="">—</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.nombre}</option>)}</select></label>
              <label>Cantidad<input type="number" min="0" step="any" style={{ width: 90 }} value={it.cantidad} onChange={(e) => setItem(i, { cantidad: e.target.value })} /></label>
              <label>Costo unitario (neto)<input type="number" min="0" step="any" style={{ width: 130 }} value={it.costo} onChange={(e) => setItem(i, { costo: e.target.value })} /></label>
              <button className="sec" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="sec" onClick={() => setItems([...items, { productoId: '', cantidad: '1', costo: '' }])}>+ Agregar producto</button>
        </div>
      )}
      {error && <div className="err">{error}</div>}
      <button disabled={enviando} onClick={guardar}>{enviando ? 'Registrando…' : 'Registrar egreso'}</button>
    </>
  )
}
