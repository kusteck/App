import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../store/auth'

export default function ProfilePage() {
  const { id } = useParams()
  const me = useAuth((s) => s.user)
  const targetId = id || me?.id
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ display_name: '', bio: '', avatar_url: '' })

  const load = async () => {
    if (!targetId) return
    const [p, ps] = await Promise.all([
      api.get(`/users/${targetId}`),
      api.get(`/users/${targetId}/posts`),
    ])
    setProfile(p.data)
    setPosts(ps.data)
    setForm({
      display_name: p.data.display_name || '',
      bio: p.data.bio || '',
      avatar_url: p.data.avatar_url || '',
    })
  }

  useEffect(() => { load() }, [targetId])

  const follow = async () => {
    await api[profile.is_following ? 'delete' : 'post'](`/users/${targetId}/follow`)
    load()
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    await api.patch('/me', form)
    const fresh = await api.get('/me')
    useAuth.setState({ user: fresh.data })
    setEdit(false)
    load()
  }

  if (!profile) return <div className="p-8 text-neutral-500">Загрузка…</div>
  const isMe = profile.id === me?.id

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 animate-slideIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-24 h-24 rounded-full bg-brand/40 grid place-items-center text-3xl overflow-hidden">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            : (profile.display_name?.[0] || '?')}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold">{profile.display_name}</h1>
          <div className="text-sm text-neutral-400">@{profile.username}</div>
          {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
          <div className="flex gap-5 justify-center sm:justify-start mt-3 text-sm">
            <div><span className="font-semibold">{profile.followers}</span> <span className="text-neutral-500">подписчиков</span></div>
            <div><span className="font-semibold">{profile.following}</span> <span className="text-neutral-500">подписок</span></div>
          </div>
          <div className="mt-4 flex gap-2 justify-center sm:justify-start">
            {isMe ? (
              <button onClick={() => setEdit(true)} className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">
                Редактировать
              </button>
            ) : (
              <button onClick={follow} className={`px-4 py-2 rounded-lg text-sm ${profile.is_following ? 'bg-neutral-800' : 'bg-brand hover:bg-brand-dark'}`}>
                {profile.is_following ? 'Отписаться' : 'Подписаться'}
              </button>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-3">Публикации</h2>
      <div className="space-y-3">
        {posts.map((p) => (
          <article key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            {p.text && <p className="text-sm whitespace-pre-wrap">{p.text}</p>}
            {p.image_url && <img src={p.image_url} className="rounded-lg mt-2 w-full" />}
            {p.video_url && <video src={p.video_url} controls className="rounded-lg mt-2 w-full" />}
          </article>
        ))}
        {posts.length === 0 && <div className="text-sm text-neutral-500">Публикаций пока нет</div>}
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-40" onClick={() => setEdit(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveProfile} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Редактирование профиля</h2>
            <input className="w-full input" placeholder="Имя" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            <input className="w-full input" placeholder="URL аватара" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
            <textarea className="w-full input" placeholder="Описание" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEdit(false)} className="flex-1 py-2 rounded-lg bg-neutral-800 text-sm">Отмена</button>
              <button className="flex-1 py-2 rounded-lg bg-brand hover:bg-brand-dark text-sm">Сохранить</button>
            </div>
          </form>
        </div>
      )}

      <style>{`.input{background:#171717;border:1px solid #262626;border-radius:8px;padding:.65rem .8rem;font-size:.9rem;color:#fafafa;outline:none}.input:focus{border-color:#7c3aed}`}</style>
    </div>
  )
}