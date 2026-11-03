'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const router = useRouter()
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true); setMsg('')
    const supabase = createClient()
    const { data, error } = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setCargando(false)
    if (error) return setMsg(error.message)
    if (!data.session) return setMsg('Te enviamos un mail para confirmar la cuenta.')
    router.push('/'); router.refresh()
  }

  return (
    <div className="wrap" style={{ maxWidth: 380 }}>
      <h1>Gestión Pyme</h1>
      <form className="card" onSubmit={enviar} style={{ display: 'grid', gap: 12 }}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Contraseña<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {msg && <div className="err">{msg}</div>}
        <button disabled={cargando}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
        <button type="button" className="sec" onClick={() => setModo(modo === 'entrar' ? 'crear' : 'entrar')}>
          {modo === 'entrar' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}
