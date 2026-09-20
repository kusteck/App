import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')

  useEffect(() => {
    if (!q) { setResult(null); return }
    setLoading(true)
    setError('')
    api.get('/search', { params: { q } })
      .then((r) => { setResult(r.data); setLoading(false) })
      .catch((e) => {
        console.error('Search failed:', e)
        setError(e?.response?.data?.error || e.message || 'Ошибка поиска')
        setLoading(false)
      })
  }, [q])

  const tabs = [
    ['all', 'Все'],
    ['users', 'Люди'],
    ['posts', 'Посты'],
    ['videos', 'Видео'],
    ['tracks', 'Музыка'],
    ['images', 'Изображения'],
  ]

  return (
    <div className="p-4 md:p-6 animate-slideIn">
      <h1 className="text-xl font-bold mb-1">Поиск: «{q}»</h1>

      {!q && <div className="text-neutral-500 mt-4">Введите запрос в строке сверху…</div>}

      {q && (
        <>
          <div className="flex gap-2 flex-wrap my-4">
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-full text-xs border ${tab === k ? 'bg-brand border-brand' : 'border-neutral-800 text-neutral-300'}`}>
                {l}
              </button>
            ))}
          </div>

          {loading && <div className="text-neutral-500">Ищу…</div>}
          {error && <div className="text-red-400 text-sm">Ошибка: {error}</div>}

          {!loading && result && (
            <div className="space-y-6">
              {(tab === 'all' || tab === 'users') && result.users?.length > 0 && (
                <Section title={`Люди (${result.users.length})`}>
                  {result.users.map((u) => (
                    <Link key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/60">
                      <div className="w-9 h-9 rounded-full bg-brand/40 grid place-items-center">{(u.display_name || '?')[0]}</div>
                      <div>
                        <div className="text-sm font-medium">{u.display_name}</div>
                        <div className="text-xs text-neutral-500">@{u.username}</div>
                      </div>
                    </Link>
                  ))}
                </Section>
              )}

              {(tab === 'all' || tab === 'posts') && result.posts?.length > 0 && (
                <Section title={`Посты (${result.posts.length})`}>
                  {result.posts.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-sm">{p.text}</div>
                  ))}
                </Section>
              )}

              {(tab === 'all' || tab === 'videos') && result.videos?.length > 0 && (
                <Section title={`Видео (${result.videos.length})`}>
                  {result.videos.map((v) => (
                    <Link key={v.id} to={`/video/${v.id}`} className="block p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-sm hover:border-brand/40">
                      {v.title}
                    </Link>
                  ))}
                </Section>
              )}

              {(tab === 'all' || tab === 'tracks') && result.tracks?.length > 0 && (
                <Section title={`Музыка (${result.tracks.length})`}>
                  {result.tracks.map((t) => (
                    <div key={t.id} className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-sm">
                      <span className="font-medium">{t.title}</span> <span className="text-neutral-500">— {t.artist}</span>
                    </div>
                  ))}
                </Section>
              )}

              {(tab === 'all' || tab === 'images') && result.images?.length > 0 && (
                <Section title={`Изображения (${result.images.length})`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {result.images.map((i) => (
                      <div key={i.id} className="rounded-lg overflow-hidden border border-neutral-800">
                        {i.image_url && <img src={i.image_url} className="w-full h-32 object-cover" />}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {!result.users?.length && !result.posts?.length && !result.videos?.length &&
               !result.tracks?.length && !result.images?.length && (
                <div className="text-center text-neutral-500 py-16">Ничего не найдено</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-neutral-300 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}