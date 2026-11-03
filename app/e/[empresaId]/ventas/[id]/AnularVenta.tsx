'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AnularVenta({ id }: { id: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  async function anular() {
    if (!window.confirm('¿Anular este comprobante? Se revierten stock, cuenta corriente y caja.')) return
    const { error } = await createClient().rpc('anular_comprobante', { p_id: id, p_motivo: 'Anulado desde la web' })
    if (error) return setError(error.message)
    router.refresh()
  }
  return <span className="no-print"><button className="sec" onClick={anular}>Anular</button>{error && <span className="err"> {error}</span>}</span>
}
