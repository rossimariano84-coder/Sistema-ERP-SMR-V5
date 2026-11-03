'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/format'

type Item = { productoId: string; descripcion: string; cantidad: number; precio: number; alicuota: number }
const vacio = (): Item => ({ productoId: '', descripcion: '', cantidad: 1, precio: 0, alicuota: 21 })

export default function NuevaVenta() {
  const { empresaId } = useParams<{ empresaId: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [empresa, setEmpresa] = useState<any>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [tipo, setTipo] = useState('factura_b')
  const [clienteId, setClienteId] = useState('')
  const [condicion, setCondicion] = useState('contado')
  const [items, setItems] = useState<Item[]>([vacio()])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    (async () => {
      const [e, c, p] = await Promise.all([
        supabase.from('empresas').select('condicion_iva').eq('id', empresaId).single(),
        supabase.from('terceros').select('id, razon_social').eq('empresa_id', empresaId).in('tipo', ['cliente', 'ambos']).eq('activo', true).order('razon_social'),
        supabase.from('productos').select('id, sku, nombre, precio, alicuota_iva').eq('empresa_id', empresaId).eq('activo', true).order('nombre'),
      ])
      setEmpresa(e.data); setClientes(c.data ?? []); setProductos(p.data ?? [])
      if (e.data?.condicion_iva === 'monotributista') setTipo('factura_c')
    })()
  }, [empresaId, supabase])

  const mono = empresa?.condicion_iva === 'monotributista'
  const tipos = mono ? [['factura_c', 'Factura C'], ['interno', 'Comprobante interno']]
                     : [['factura_a', 'Factura A'], ['factura_b', 'Factura B'], ['interno', 'Comprobante interno']]
  const neto = items.reduce((s, i) => s + i.cantidad * i.precio, 0)
  const iva = mono ? 0 : items.reduce((s, i) => s + i.cantidad * i.precio * i.alicuota / 100, 0)

  const cambiar = (n: number, parche: Partial<Item>) => setItems(items.map((it, i) => (i === n ? { ...it, ...parche } : it)))
  const elegirProducto = (n: number, id: string) => {
    const p = productos.find((x) => x.id === id)
    cambiar(n, p ? { productoId: id, descripcion: p.nombre, precio: Number(p.precio), alicuota: Number(p.alicuota_iva) } : { productoId: '' })
  }

  async function emitir() {
    setError(''); setEnviando(true)
    const validos = items.filter((i) => i.cantidad > 0 && (i.productoId || i.descripcion.trim()))
    if (validos.length === 0) { setEnviando(false); return setError('Agregá al menos un ítem.') }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: pv } = await supabase.from('puntos_venta').select('numero').eq('empresa_id', empresaId).eq('activo', true).order('numero').limit(1).single()
    const id = crypto.randomUUID()
    const r1 = await supabase.from('comprobantes').insert({
      id, empresa_id: empresaId, cliente_id: clienteId || null, tipo, punto_venta: pv?.numero ?? 1,
      condicion_pago: condicion, created_by: user?.id,
    })
    if (r1.error) { setEnviando(false); return setError(r1.error.message) }
    const r2 = await supabase.from('comprobante_items').insert(validos.map((i) => ({
      empresa_id: empresaId, comprobante_id: id, producto_id: i.productoId || null, descripcion: i.descripcion || 'Ítem',
      cantidad: i.cantidad, precio_unitario: i.precio, alicuota_iva: i.alicuota, neto: 0, total: 0,   // el servidor recalcula
    })))
    const r3: { error: any } = r2.error ? r2 : await supabase.rpc('emitir_comprobante', { p_id: id })
    if (r3.error) {
      await supabase.from('comprobantes').delete().eq('id', id)   // no dejamos borradores huérfanos
      setEnviando(false); return setError(r3.error.message)
    }
    router.push(`/e/${empresaId}/ventas/${id}`)
  }

  return (
    <>
      <h1>Nueva venta</h1>
      <div className="card row">
        <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value)}>{tipos.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <label>Cliente
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Consumidor final</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </label>
        <label>Pago<select value={condicion} onChange={(e) => setCondicion(e.target.value)}><option value="contado">Contado</option><option value="cuenta_corriente">Cuenta corriente</option></select></label>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Producto</th><th>Descripción</th><th>Cant.</th><th>Precio neto</th><th>IVA %</th><th /></tr></thead>
          <tbody>
            {items.map((it, n) => (
              <tr key={n}>
                <td><select value={it.productoId} onChange={(e) => elegirProducto(n, e.target.value)}><option value="">(servicio / libre)</option>{productos.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.nombre}</option>)}</select></td>
                <td><input value={it.descripcion} onChange={(e) => cambiar(n, { descripcion: e.target.value })} /></td>
                <td><input type="number" min="0.001" step="any" style={{ width: 70 }} value={it.cantidad} onChange={(e) => cambiar(n, { cantidad: Number(e.target.value) })} /></td>
                <td><input type="number" min="0" step="any" style={{ width: 110 }} value={it.precio} onChange={(e) => cambiar(n, { precio: Number(e.target.value) })} /></td>
                <td><select disabled={mono} value={mono ? 0 : it.alicuota} onChange={(e) => cambiar(n, { alicuota: Number(e.target.value) })}>{[0, 10.5, 21, 27].map((a) => <option key={a} value={a}>{a}</option>)}</select></td>
                <td><button className="sec" onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== n) : [vacio()])}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><button className="sec" onClick={() => setItems([...items, vacio()])}>+ Agregar ítem</button></p>
        <p style={{ textAlign: 'right' }}>Neto {money(neto)} · IVA {money(iva)} · <strong>Total {money(neto + iva)}</strong></p>
      </div>
      {error && <div className="err">{error}</div>}
      <button disabled={enviando} onClick={emitir}>{enviando ? 'Emitiendo…' : 'Emitir comprobante'}</button>
    </>
  )
}
