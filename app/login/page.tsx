'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function traducir(e: any): string {
  const msg = String(e?.message ?? e ?? '')
  if (e?.code === 'over_email_send_rate_limit' || /rate limit/i.test(msg))
    return 'Se alcanzó el límite de correos del servicio de Supabase (2 por hora). Esperá una hora, o pedile al administrador que desactive la confirmación por email o configure un servidor de correo propio.'
  if (/email not confirmed/i.test(msg)) return 'Tu email todavía no está confirmado. Abrí el correo de confirmación y tocá el enlace.'
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.'
  if (/already (been )?registered/i.test(msg)) return 'Ese email ya tiene una cuenta: usá "Ya tengo cuenta" para entrar.'
  return msg
}

export default function Login() {
  const router = useRouter()
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(false)

  // Errores que llegan desde el enlace de confirmación (/auth/callback)
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error')
    if (e) setMsg(traducir(e))
  }, [])

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    setCargando(true); setMsg(''); setAviso('')
    const supabase = createClient()
    const { data, error } = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    setCargando(false)
    if (error) return setMsg(traducir(error))
    if (!data.session) return setAviso('Te enviamos un correo para confirmar la cuenta. Abrí el enlace y vas a entrar al sistema.')
    router.push('/'); router.refresh()
  }

  return (
    <div className="wrap" style={{ maxWidth: 380 }}>
      <h1>Gestión Pyme</h1>
      <form className="card" onSubmit={enviar} style={{ display: 'grid', gap: 12 }}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Contraseña<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {msg && <div className="err">{msg}</div>}
        {aviso && <div className="ok">{aviso}</div>}
        <button disabled={cargando}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
        <button type="button" className="sec" onClick={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setMsg(''); setAviso('') }}>
          {modo === 'entrar' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}

