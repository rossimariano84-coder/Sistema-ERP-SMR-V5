import Link from 'next/link'

const LINKS = [
  ['diario', 'Libro diario'], ['mayor', 'Libro mayor'], ['balance', 'Balance de sumas y saldos'],
  ['resultados', 'Estado de resultados'], ['situacion', 'Estado de situación patrimonial'], ['flujo', 'Estado de flujo de fondos'],
]
export default function Contabilidad({ params }: { params: { empresaId: string } }) {
  return (
    <>
      <h1>Contabilidad</h1>
      <div className="card"><ul>{LINKS.map(([s, n]) => <li key={s}><Link href={`/e/${params.empresaId}/reportes/${s}`}>{n}</Link></li>)}</ul></div>
      <p style={{ fontSize: 12, color: '#666' }}>Los asientos se generan solos desde ventas, egresos, cobros, pagos y stock.</p>
    </>
  )
}
