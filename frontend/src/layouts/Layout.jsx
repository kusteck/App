import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store/auth'
import GlobalPlayer from '../components/GlobalPlayer'

const nav = [
  { to: '/', label: 'Главная', icon: '🏠' },
  { to: '/messages', label: 'Сообщения', icon: '💬' },
  { to: '/music', label: 'Музыка', icon: '🎵' },
  { to: '/video', label: 'Видео', icon: '🎬' },
  { to: '/images', label: 'Изображения', icon: '🖼️' },
  { to: '/news', label: 'Новости', icon: '📰' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
]

export default function Layout() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const nav$ = useNavigate()
  const [q, setQ] = useState('')

  return (
    <div className="min-h-screen flex bg-neutral-950 text-neutral-100">
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <div className="p-5 text-xl font-bold tracking-tight">
          <span className="text-brand-light">Multi</span>App
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  isActive ? 'bg-brand/20 text-brand-light' : 'hover:bg-neutral-800 text-neutral-300'
                }`
              }
            >
              <span className="text-lg">{n.icon}</span>
              <span className="text-sm font-medium">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-neutral-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-brand/40 grid place-items-center text-sm overflow-hidden shrink-0">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : (user?.display_name?.[0] || '?')}
            </div>
            <div className="text-sm truncate">{user?.display_name}</div>
          </div>
          <button
            onClick={() => { logout(); nav$('/login') }}
            className="w-full text-xs text-neutral-400 hover:text-neutral-200 py-1"
          >
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
          <div className="md:hidden text-lg font-bold"><span className="text-brand-light">Multi</span>App</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && q && nav$(`/search?q=${encodeURIComponent(q)}`)}
            placeholder="Поиск по людям, постам, видео, музыке…"
            className="flex-1 max-w-xl bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <GlobalPlayer />
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur grid grid-cols-7 z-30">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `flex flex-col items-center justify-center py-2 text-xs ${isActive ? 'text-brand-light' : 'text-neutral-400'}`}
          >
            <span className="text-base">{n.icon}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}