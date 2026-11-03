'use client'
import { useParams } from 'next/navigation'
import Reporte from '@/components/Reporte'

type Def = { titulo: string; inputs: string[]; cargar: (sb: any, f: any, e: string) => any; grafico?: { titulo: string; x: string; y: string; filtro?: (f: any) => boolean } }
const R: Record<string, Def> = {
  diario: { titulo: 'Libro diario', inputs: ['desde', 'hasta'], cargar: (sb, f, e) => sb.rpc('contable_libro_diario', { p_empresa: e, p_desde: f.desde, p_hasta: f.hasta }) },
  mayor: { titulo: 'Libro mayor', inputs: ['cuenta', 'desde', 'hasta'], cargar: (sb, f, e) => sb.rpc('contable_libro_mayor', { p_empresa: e, p_cuenta: f.cuenta, p_desde: f.desde, p_hasta: f.hasta }) },
  balance: { titulo: 'Balance de sumas y saldos', inputs: ['hasta'], grafico: { titulo: 'Saldos deudores por cuenta', x: 'cuenta_nombre', y: 'saldo_deudor', filtro: (f) => Number(f.saldo_deudor) > 0 }, cargar: (sb, f, e) => sb.rpc('contable_balance_sumas_saldos', { p_empresa: e, p_hasta: f.hasta }) },
  resultados: { titulo: 'Estado de resultados', inputs: ['desde', 'hasta'], grafico: { titulo: 'Composición del resultado', x: 'concepto', y: 'importe', filtro: (f) => f.tipo_fila !== 'detalle' }, cargar: (sb, f, e) => sb.rpc('contable_estado_resultados', { p_empresa: e, p_desde: f.desde, p_hasta: f.hasta }) },
  situacion: { titulo: 'Estado de situación patrimonial', inputs: ['hasta'], cargar: (sb, f, e) => sb.rpc('contable_situacion_patrimonial', { p_empresa: e, p_hasta: f.hasta }) },
  flujo: { titulo: 'Estado de flujo de fondos', inputs: ['desde', 'hasta'], grafico: { titulo: 'Flujo de fondos del período', x: 'concepto', y: 'importe' }, cargar: (sb, f, e) => sb.rpc('contable_flujo_fondos', { p_empresa: e, p_desde: f.desde, p_hasta: f.hasta }) },
  'iva-ventas': { titulo: 'Libro IVA Ventas', inputs: ['mes'], cargar: (sb, f, e) => sb.from('v_libro_iva_ventas').select('fecha, tipo, punto_venta, numero, cliente, cuit_cliente, neto_gravado, neto_no_gravado, exento, iva_21, iva_10_5, iva_27, otros_tributos, total').eq('empresa_id', e).eq('periodo', f.mes + '-01').order('fecha') },
  'iva-compras': { titulo: 'Libro IVA Compras', inputs: ['mes'], cargar: (sb, f, e) => sb.from('v_libro_iva_compras').select('fecha, tipo_comprobante, numero_comprobante, proveedor, cuit_proveedor, neto_gravado, neto_no_gravado, exento, iva_21, iva_10_5, iva_27, otros_tributos, total, credito_computable').eq('empresa_id', e).eq('periodo', f.mes + '-01').order('fecha') },
}

export default function ReporteSlug() {
  const { empresaId, slug } = useParams<{ empresaId: string; slug: string }>()
  const d = R[slug]
  if (!d) return <p>Reporte inexistente.</p>
  return <Reporte key={slug} titulo={d.titulo} inputs={d.inputs} grafico={d.grafico} cargar={(sb, f) => d.cargar(sb, f, empresaId)} />
}
