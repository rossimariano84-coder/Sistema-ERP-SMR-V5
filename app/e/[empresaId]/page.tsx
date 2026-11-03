import Link from 'next/link'

const ATAJOS = [
  ['ventas/nueva', '🧾 Nueva venta', 'Emitir un comprobante'], ['egresos/nuevo', '🛒 Nuevo egreso', 'Compras y gastos'],
  ['terceros', '🗂️ Clientes y proveedores', 'Saldos y cobranzas'], ['productos', '📦 Productos y stock', 'Inventario'],
  ['caja', '🏦 Caja y bancos', 'Saldos y transferencias'], ['contabilidad/asientos', '📒 Asientos', 'Cargar y gestionar'],
  ['contabilidad/plan', '🧮 Plan de cuentas', 'Personalizable'], ['iva', '🏛️ IVA', 'Liquidación mensual'],
  ['ganancias', '🧾 Ganancias', 'Estimación anual'], ['paneles/financiero', '📊 Tablero financiero', 'Cashflow'],
  ['paneles/economico', '📈 Tablero económico', 'Punto de equilibrio'], ['reportes/resultados', '📑 Estado de resultados', 'Contable'],
]
export default function Inicio({ params }: { params: { empresaId: string } }) {
  return (
    <>
      <h1>Inicio</h1>
      <div className="atajos">
        {ATAJOS.map(([r, t, s]) => <Link key={r} href={`/e/${params.empresaId}/${r}`} className="atajo">{t}<small>{s}</small></Link>)}
      </div>
    </>
  )
}
