'use client'
import { useParams } from 'next/navigation'
import Panel, { GraficoDef } from '@/components/Panel'

type Def = { titulo: string; inputs: string[]; cargar: (sb: any, f: any, e: string) => any; graficos: GraficoDef[] }
const P: Record<string, Def> = {
  financiero: {
    titulo: 'Tablero financiero', inputs: ['desde', 'hasta'],
    cargar: (sb, f, e) => sb.rpc('dash_financiero', { p_empresa: e, p_desde: f.desde, p_hasta: f.hasta }),
    graficos: [
      { tipo: 'barras', titulo: 'Ventas devengadas vs. ingresos cobrados y egresos pagados', fuente: 'serie', x: 'mes',
        series: [{ k: 'ventas_netas', n: 'Ventas netas' }, { k: 'ingresos_netos', n: 'Ingresos cobrados' }, { k: 'egresos_netos', n: 'Egresos pagados' }] },
      { tipo: 'barras', titulo: 'Flujo neto mensual y saldo de caja y bancos', fuente: 'serie', x: 'mes', series: [{ k: 'flujo_neto', n: 'Flujo neto' }], linea: { k: 'saldo_final', n: 'Saldo' } },
      { tipo: 'torta', titulo: 'Saldos por cuenta', fuente: 'cuentas', nombre: 'nombre', valor: 'saldo' },
    ],
  },
  economico: {
    titulo: 'Tablero económico', inputs: ['desde', 'hasta'],
    cargar: (sb, f, e) => sb.rpc('dash_economico', { p_empresa: e, p_desde: f.desde, p_hasta: f.hasta }),
    graficos: [
      { tipo: 'barras', titulo: 'Ingresos, costos y resultado por mes', fuente: 'serie', x: 'mes',
        series: [{ k: 'ingresos', n: 'Ingresos' }, { k: 'costos_variables', n: 'Costos variables' }, { k: 'costos_fijos', n: 'Costos fijos' }], linea: { k: 'resultado', n: 'Resultado' } },
      { tipo: 'kpibarras', titulo: 'Ingresos vs. punto de equilibrio', claves: [['ingresos_brutos', 'Ingresos'], ['punto_equilibrio', 'Punto de equilibrio'], ['costos_fijos', 'Costos fijos'], ['margen_contribucion', 'Margen de contribución']] },
      { tipo: 'torta', titulo: 'Composición de gastos', fuente: 'gastos_por_categoria', nombre: 'categoria', valor: 'importe' },
    ],
  },
  impositivo: {
    titulo: 'Tablero contable e impositivo', inputs: ['anio'],
    cargar: (sb, f, e) => sb.rpc('dash_impositivo', { p_empresa: e, p_anio: Number(f.anio) }),
    graficos: [
      { tipo: 'barras', titulo: 'IVA: débito vs. crédito fiscal por mes', fuente: 'iva', x: 'periodo', invertir: true,
        series: [{ k: 'debito_fiscal', n: 'Débito fiscal' }, { k: 'credito_fiscal', n: 'Crédito fiscal' }], linea: { k: 'iva_a_pagar', n: 'IVA a pagar' } },
    ],
  },
}

export default function PanelSlug() {
  const { empresaId, slug } = useParams<{ empresaId: string; slug: string }>()
  const d = P[slug]
  if (!d) return <p>Tablero inexistente.</p>
  return <Panel key={slug} titulo={d.titulo} inputs={d.inputs} graficos={d.graficos} cargar={(sb, f) => d.cargar(sb, f, empresaId)} />
}
