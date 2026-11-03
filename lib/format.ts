export const money = (n: number | string | null) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n ?? 0))
export const nroComprobante = (pv: number, n: number | null) =>
  n == null ? 'Borrador' : `${String(pv).padStart(4, '0')}-${String(n).padStart(8, '0')}`
export const tipoNombre = (t: string) => t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
