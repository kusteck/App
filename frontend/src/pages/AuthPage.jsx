import { useState } from 'react'
import { useAuth } from '../store/auth'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    login: '', password: '', confirm_password: '',
    phone: '', email: '', username: '', display_name: '', birth_date: '',
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      if (mode === 'login') {
        await login({ login: form.login, password: form.password })
      } else {
        if (form.password !== form.confirm_password) throw new Error('Пароли не совпадают')
        await register(form)
      }
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Ошибка')
    } finally { setBusy(false) }
  }

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="w-full max-w-md bg-neutral-900/70 border border-neutral-800 rounded-2xl p-8 backdrop-blur">
        <h1 className="text-2xl font-bold mb-1"><span className="text-brand-light">Multi</span>App</h1>
        <p className="text-sm text-neutral-400 mb-6">Единая экосистема: соцсеть, чат, музыка, видео, доски и новости.</p>

        <div className="flex gap-2 mb-5">
          {['login', 'register'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm ${mode === m ? 'bg-brand text-white' : 'bg-neutral-800 text-neutral-300'}`}>
              {m === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'login' ? (
            <>
              <input {...f('login')} placeholder="Email / телефон / username" className="w-full input" />
              <input {...f('password')} type="password" placeholder="Пароль" className="w-full input" />
            </>
          ) : (
            <>
              <input {...f('phone')} placeholder="Телефон" className="w-full input" required />
              <input {...f('email')} type="email" placeholder="Email" className="w-full input" required />
              <input {...f('username')} placeholder="Никнейм" className="w-full input" required />
              <input {...f('display_name')} placeholder="Имя" className="w-full input" required />
              <input {...f('birth_date')} type="date" className="w-full input" required />
              <input {...f('password')} type="password" placeholder="Пароль" className="w-full input" required />
              <input {...f('confirm_password')} type="password" placeholder="Повтор пароля" className="w-full input" required />
            </>
          )}

          {err && <div className="text-sm text-red-400">{err}</div>}
          <button disabled={busy} className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 font-medium">
            {busy ? '…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <style>{`.input{background:#171717;border:1px solid #262626;border-radius:8px;padding:.65rem .8rem;font-size:.9rem;color:#fafafa;outline:none}.input:focus{border-color:#7c3aed}`}</style>
      </div>
    </div>
  )
}