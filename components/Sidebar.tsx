'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GRUPOS: { n: string; i: string; items: [string, string][] }[] = [
  { n: 'Maestros', i: '🗂️', items: [['terceros', 'Clientes y proveedores'], ['productos', 'Productos y stock'], ['contabilidad/categorias', 'Categorías de egreso']] },
  { n: 'Ventas', i: '🧾', items: [['ventas', 'Comprobantes de venta'], ['ventas/nueva', 'Nueva venta']] },
  { n: 'Compras y gastos', i: '🛒', items: [['egresos', 'Egresos'], ['egresos/nuevo', 'Nuevo egreso']] },
  { n: 'Tesorería', i: '🏦', items: [['caja', 'Caja y bancos']] },
  { n: 'Contabilidad', i: '📒', items: [
    ['contabilidad/plan', 'Plan de cuentas'], ['contabilidad/asientos', 'Asientos'], ['reportes/diario', 'Libro diario'], ['reportes/mayor', 'Libro mayor'],
    ['reportes/balance', 'Balance de sumas y saldos'], ['reportes/resultados', 'Estado de resultados'], ['reportes/situacion', 'Situación patrimonial'], ['reportes/flujo', 'Flujo de fondos'],
  ] },
  { n: 'Impuestos', i: '🏛️', items: [['iva', 'Liquidación de IVA'], ['reportes/iva-ventas', 'Libro IVA Ventas'], ['reportes/iva-compras', 'Libro IVA Compras'], ['ganancias', 'Ganancias']] },
  { n: 'Tableros', i: '📊', items: [['paneles/financiero', 'Financiero'], ['paneles/economico', 'Económico'], ['paneles/impositivo', 'Impositivo']] },
]

export default function Sidebar({ base }: { base: string }) {
  const path = usePathname()
  const todos = GRUPOS.flatMap((g) => g.items.map(([r]) => `${base}/${r}`))
  const activo = todos.filter((h) => path === h || path.startsWith(h + '/')).sort((a, b) => b.length - a.length)[0]
  return (
    <nav>
      <Link className={`side-item ${path === base ? 'activo' : ''}`} href={base} style={{ paddingLeft: 14, fontWeight: 600 }}>🏠 Inicio</Link>
      {GRUPOS.map((g) => (
        <details className="side-group" key={g.n} open={!activo || g.items.some(([r]) => `${base}/${r}` === activo)}>
          <summary>{g.i} {g.n}</summary>
          {g.items.map(([r, n]) => <Link key={r} href={`${base}/${r}`} className={`side-item ${`${base}/${r}` === activo ? 'activo' : ''}`}>{n}</Link>)}
        </details>
      ))}
    </nav>
  )
}
