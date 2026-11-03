'use client'
export const hoy = new Date().toISOString().slice(0, 10)
export const filtrosIniciales = { desde: hoy.slice(0, 4) + '-01-01', hasta: hoy, mes: hoy.slice(0, 7), cuenta: '1.1.01', anio: hoy.slice(0, 4) }
const TIPO: Record<string, string> = { desde: 'date', hasta: 'date', mes: 'month', cuenta: 'text', anio: 'number' }
const NOMBRE: Record<string, string> = { desde: 'Desde', hasta: 'Hasta', mes: 'Mes', cuenta: 'Código de cuenta', anio: 'Año' }

export default function Filtros({ inputs, f, setF, onVer, cargando }: any) {
  return (
    <div className="card row no-print">
      {inputs.map((i: string) => (
        <label key={i}>{NOMBRE[i]}<input type={TIPO[i]} value={f[i]} onChange={(e) => setF({ ...f, [i]: e.target.value })} /></label>
      ))}
      <button disabled={cargando} onClick={onVer}>{cargando ? 'Cargando…' : 'Ver'}</button>
      <button className="sec" onClick={() => window.print()}>Imprimir / PDF</button>
    </div>
  )
}
