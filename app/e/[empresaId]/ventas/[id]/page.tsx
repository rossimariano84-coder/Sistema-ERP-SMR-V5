import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { money, nroComprobante, tipoNombre } from '@/lib/format'
import PrintButton from './PrintButton'
import AnularVenta from './AnularVenta'

export default async function Comprobante({ params }: { params: { empresaId: string; id: string } }) {
  const supabase = createClient()
  const { data: c } = await supabase.from('comprobantes')
    .select('*, cliente:terceros!cliente_id(razon_social, cuit), empresa:empresas!empresa_id(razon_social, cuit, condicion_iva)')
    .eq('id', params.id).maybeSingle()
  if (!c) notFound()
  const { data: items } = await supabase.from('comprobante_items').select('*').eq('comprobante_id', params.id)

  return (
    <>
      <div className="row no-print" style={{ justifyContent: 'space-between' }}>
        <Link href={`/e/${params.empresaId}/ventas`}>← Volver a ventas</Link>
        <span className="row">{c.estado === 'emitido' && <AnularVenta id={c.id} />}<PrintButton /></span>
      </div>
      <div className="card">
        <h2>{tipoNombre(c.tipo)} {nroComprobante(c.punto_venta, c.numero)}</h2>
        <p><strong>{c.empresa.razon_social}</strong> · CUIT {c.empresa.cuit}<br />Fecha {c.fecha} · {c.condicion_pago === 'contado' ? 'Contado' : 'Cuenta corriente'} · {c.estado}</p>
        <p>Cliente: {c.cliente?.razon_social ?? 'Consumidor final'}{c.cliente?.cuit ? ` · CUIT ${c.cliente.cuit}` : ''}</p>
        <table>
          <thead><tr><th>Descripción</th><th className="n">Cant.</th><th className="n">Precio</th><th className="n">IVA %</th><th className="n">Total</th></tr></thead>
          <tbody>{(items ?? []).map((i: any) => (
            <tr key={i.id}><td>{i.descripcion}</td><td className="n">{Number(i.cantidad)}</td><td className="n">{money(i.precio_unitario)}</td><td className="n">{Number(i.alicuota_iva)}</td><td className="n">{money(i.total)}</td></tr>
          ))}</tbody>
        </table>
        <p style={{ textAlign: 'right' }}>
          Neto {money(Number(c.neto_gravado) + Number(c.neto_no_gravado) + Number(c.exento))}
          {c.empresa.condicion_iva === 'responsable_inscripto' && <> · IVA {money(Number(c.iva_21) + Number(c.iva_10_5) + Number(c.iva_27))}</>}
          <br /><strong>Total {money(c.total)}</strong>
        </p>
        <p style={{ fontSize: 12, color: '#666' }}>
          {c.cae ? `CAE ${c.cae}` : 'Comprobante de gestión: sin CAE no tiene validez fiscal (integración con ARCA pendiente).'}
        </p>
      </div>
    </>
  )
}
