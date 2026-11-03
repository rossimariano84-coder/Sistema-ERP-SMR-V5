'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/format'

export default function Producto() {
  const { empresaId, id } = useParams<{ empresaId: string; id: string }>()
  const nuevo = id === 'nuevo'
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [f, setF] = useState<any>({ sku: '', nombre: '', unidad: 'un', costo: 0, precio: 0, alicuota_iva: 21, controla_stock: true, stock_minimo: 0, activo: true })
  const [stockInicial, setStockInicial] = useState('')
  const [stock, setStock] = useState(0)
  const [fisico, setFisico] = useState('')
  const [ajustes, setAjustes] = useState<any[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const cargar = useCallback(async () => {
    if (nuevo) return
    const [p, s, a] = await Promise.all([
      supabase.from('productos').select('*').eq('id', id).single(),
      supabase.from('v_stock_actual').select('stock').eq('producto_id', id).maybeSingle(),
      supabase.from('ajustes_stock_items').select('ajuste_id, cantidad_sistema, cantidad_fisica, diferencia, ajuste:ajustes_stock!ajuste_id(fecha, confirmado)').eq('producto_id', id),
    ])
    if (p.data) setF(p.data)
    setStock(Number(s.data?.stock ?? 0))
    setAjustes((a.data ?? []).filter((x: any) => x.ajuste?.confirmado))
  }, [id, nuevo, supabase])
  useEffect(() => { cargar() }, [cargar])

  const set = (k: string, v: any) => setF({ ...f, [k]: v })

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const datos = {
      sku: f.sku.trim(), nombre: f.nombre.trim(), unidad: f.unidad, costo: Number(f.costo), precio: Number(f.precio),
      alicuota_iva: Number(f.alicuota_iva), controla_stock: f.controla_stock, stock_minimo: Number(f.stock_minimo), activo: f.activo,
    }
    if (!nuevo) {
      const r = await supabase.from('productos').update(datos).eq('id', id)
      if (r.error) return setError(r.error.message)
      router.push(`/e/${empresaId}/productos`); router.refresh(); return
    }
    const nid = crypto.randomUUID()
    const r = await supabase.from('productos').insert({ ...datos, id: nid, empresa_id: empresaId })
    if (r.error) return setError(r.error.message)
    if (f.controla_stock && Number(stockInicial) > 0) {
      const s = await supabase.rpc('registrar_stock_inicial', { p_producto: nid, p_cantidad: Number(stockInicial), p_costo: Number(f.costo) || null })
      if (s.error) { router.push(`/e/${empresaId}/productos/${nid}`); return }   // se creó el producto: reintentá desde su ficha
    }
    router.push(`/e/${empresaId}/productos`); router.refresh()
  }

  async function cargarInicial() {
    setError(''); setOk('')
    const { error } = await supabase.rpc('registrar_stock_inicial', { p_producto: id, p_cantidad: Number(stockInicial), p_costo: Number(f.costo) || null })
    if (error) return setError(error.message)
    setOk('Stock inicial cargado.'); setStockInicial(''); cargar()
  }

  // Ajuste por diferencia real entre el conteo físico y el stock contable (va a resultados)
  async function ajustar() {
    if (!window.confirm('Un ajuste se registra como diferencia de inventario (ganancia o pérdida). Si estás cargando el stock de partida, usá "Stock inicial". ¿Continuar con el ajuste?')) return
    setError(''); setOk('')
    const { data: { user } } = await supabase.auth.getUser()
    const aid = crypto.randomUUID()
    const a = await supabase.from('ajustes_stock').insert({ id: aid, empresa_id: empresaId, motivo: 'Conteo físico', usuario_id: user?.id })
    if (a.error) return setError(a.error.message)
    const i = await supabase.from('ajustes_stock_items').insert({ empresa_id: empresaId, ajuste_id: aid, producto_id: id, cantidad_sistema: stock, cantidad_fisica: Number(fisico) })
    const r: { error: any } = i.error ? i : await supabase.rpc('confirmar_ajuste_stock', { p_id: aid })
    if (r.error) { await supabase.from('ajustes_stock').delete().eq('id', aid); return setError(r.error.message) }
    setOk('Ajuste confirmado.'); setFisico(''); cargar()
  }

  async function reclasificar(ajusteId: string) {
    if (!window.confirm('Esto pasa la ganancia por diferencia de inventario a Capital (stock inicial). ¿Confirmás?')) return
    setError(''); setOk('')
    const { error } = await supabase.rpc('reclasificar_ajuste_a_stock_inicial', { p_ajuste: ajusteId })
    if (error) return setError(error.message)
    setOk('Listo: el ajuste quedó reclasificado como stock inicial.')
  }

  const sinStock = !nuevo && f.controla_stock && stock === 0

  return (
    <>
      <h1>{nuevo ? 'Nuevo producto' : f.nombre}</h1>
      <form className="card row" onSubmit={guardar}>
        <label>SKU<input required value={f.sku} onChange={(e) => set('sku', e.target.value)} /></label>
        <label>Nombre<input required value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></label>
        <label>Unidad<input style={{ width: 70 }} value={f.unidad} onChange={(e) => set('unidad', e.target.value)} /></label>
        <label>Costo (neto)<input type="number" min="0" step="any" value={f.costo} onChange={(e) => set('costo', e.target.value)} /></label>
        <label>Precio (neto)<input type="number" min="0" step="any" value={f.precio} onChange={(e) => set('precio', e.target.value)} /></label>
        <label>IVA %<select value={Number(f.alicuota_iva)} onChange={(e) => set('alicuota_iva', e.target.value)}>{[0, 10.5, 21, 27].map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
        <label>Controla stock<input type="checkbox" checked={f.controla_stock} onChange={(e) => set('controla_stock', e.target.checked)} /></label>
        <label>Stock mínimo<input type="number" min="0" step="any" value={f.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} /></label>
        {nuevo && f.controla_stock && (
          <label>Stock inicial (cantidad)<input type="number" min="0" step="any" value={stockInicial} onChange={(e) => setStockInicial(e.target.value)} placeholder="0" /></label>
        )}
        <label>Activo<input type="checkbox" checked={f.activo} onChange={(e) => set('activo', e.target.checked)} /></label>
        <button>Guardar</button>
      </form>
      {nuevo && f.controla_stock && <p style={{ fontSize: 12, color: '#666' }}>El stock inicial se valúa al <strong>costo</strong> indicado y entra al inventario contra Capital (no es una ganancia). Con costo 0 no suma valor al inventario.</p>}
      {error && <div className="err">{error}</div>}
      {ok && <p>{ok}</p>}

      {sinStock && (
        <div className="card">
          <h3>Cargar stock inicial</h3>
          <div className="row">
            <label>Cantidad<input type="number" min="0" step="any" value={stockInicial} onChange={(e) => setStockInicial(e.target.value)} /></label>
            <button disabled={!stockInicial} onClick={cargarInicial}>Cargar stock inicial</button>
          </div>
          <p style={{ fontSize: 12, color: '#666' }}>Solo si el producto todavía no tiene movimientos. Se valúa al costo de la ficha.</p>
        </div>
      )}

      {!nuevo && f.controla_stock && (
        <div className="card">
          <h3>Stock contable: {stock} {f.unidad}</h3>
          <p style={{ fontSize: 12, color: '#666' }}>El stock entra por <strong>compras</strong> (Egresos con mercadería) o como <strong>stock inicial</strong>, y sale por ventas. El conteo físico es solo para corregir diferencias reales: se registra como diferencia de inventario en resultados.</p>
          <div className="row">
            <label>Cantidad contada (físico)<input type="number" min="0" step="any" value={fisico} onChange={(e) => setFisico(e.target.value)} /></label>
            <button className="sec" disabled={fisico === ''} onClick={ajustar}>Ajustar por diferencia real</button>
          </div>
        </div>
      )}

      {!nuevo && ajustes.some((a) => Number(a.diferencia) > 0) && (
        <div className="card">
          <h3>Ajustes anteriores</h3>
          <table>
            <thead><tr><th>Fecha</th><th className="n">Sistema</th><th className="n">Físico</th><th className="n">Diferencia</th><th /></tr></thead>
            <tbody>{ajustes.map((a) => (
              <tr key={a.ajuste_id}>
                <td>{a.ajuste?.fecha}</td><td className="n">{Number(a.cantidad_sistema)}</td><td className="n">{Number(a.cantidad_fisica)}</td><td className="n">{Number(a.diferencia)}</td>
                <td>{Number(a.diferencia) > 0 && <button className="sec" onClick={() => reclasificar(a.ajuste_id)}>Era stock inicial: reclasificar</button>}</td>
              </tr>
            ))}</tbody>
          </table>
          <p style={{ fontSize: 12, color: '#666' }}>Si cargaste el stock de partida con un ajuste, "reclasificar" saca esa ganancia de resultados y la pasa a Capital. Se puede deshacer anulando el asiento.</p>
        </div>
      )}
    </>
  )
}
