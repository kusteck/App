import { useEffect, useState } from 'react'
import api from '../api/client'

export default function ImagesPage() {
  const [images, setImages] = useState([])
  const [boards, setBoards] = useState([])
  const [openNew, setOpenNew] = useState(false)
  const [form, setForm] = useState({ title: '', image_url: '' })
  const [boardTitle, setBoardTitle] = useState('')
  const [pickingImage, setPickingImage] = useState(null)

  const load = async () => {
    const [i, b] = await Promise.all([api.get('/images'), api.get('/boards')])
    setImages(i.data); setBoards(b.data)
  }
  useEffect(() => { load() }, [])

  const upload = async (e) => {
    e.preventDefault()
    if (!form.image_url) return
    await api.post('/images', form)
    setOpenNew(false); setForm({ title: '', image_url: '' }); load()
  }

  const like = async (img) => {
    await api.post(`/images/${img.id}/like`)
    load()
  }

  const createBoard = async (e) => {
    e.preventDefault()
    if (!boardTitle.trim()) return
    await api.post('/boards', { title: boardTitle })
    setBoardTitle(''); load()
  }

  const saveToBoard = async (boardId) => {
    if (!pickingImage) return
    await api.post(`/boards/${boardId}/images/${pickingImage.id}`)
    setPickingImage(null)
    alert('Сохранено в доску')
  }

  return (
    <div className="p-4 md:p-6 animate-slideIn">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Изображения</h1>
        <button onClick={() => setOpenNew(true)} className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-sm">Загрузить</button>
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Мои доски</h2>
        <form onSubmit={createBoard} className="flex gap-2 mb-3 max-w-md">
          <input value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="Новая доска (например, Архитектура)"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/50" />
          <button className="px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">Создать</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {boards.map((b) => (
            <span key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 text-xs">{b.title}</span>
          ))}
        </div>
      </section>

      <div className="masonry">
        {images.map((img) => (
          <div key={img.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden group">
            <img src={img.image_url} alt={img.title} loading="lazy" className="w-full block" />
            <div className="p-3">
              <div className="text-sm font-medium truncate">{img.title || 'Без названия'}</div>
              <div className="text-xs text-neutral-500 truncate">{img.display_name}</div>
              <div className="flex items-center justify-between mt-2">
                <button onClick={() => like(img)} className={`text-sm ${img.liked ? 'text-red-400' : 'text-neutral-400 hover:text-red-400'}`}>
                  {img.liked ? '❤️' : '🤍'} {img.likes}
                </button>
                <button onClick={() => setPickingImage(img)} className="text-xs text-neutral-400 hover:text-brand-light">Сохранить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {images.length === 0 && <div className="text-center text-neutral-500 py-16">Изображений пока нет</div>}

      {openNew && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-40" onClick={() => setOpenNew(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={upload} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Новое изображение</h2>
            <input className="w-full input" placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="w-full input" placeholder="URL изображения" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpenNew(false)} className="flex-1 py-2 rounded-lg bg-neutral-800 text-sm">Отмена</button>
              <button className="flex-1 py-2 rounded-lg bg-brand hover:bg-brand-dark text-sm">Добавить</button>
            </div>
          </form>
        </div>
      )}

      {pickingImage && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-40" onClick={() => setPickingImage(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-base font-semibold mb-3">Сохранить в доску</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {boards.map((b) => (
                <button key={b.id} onClick={() => saveToBoard(b.id)} className="w-full text-left px-3 py-2 rounded-lg bg-neutral-800 hover:bg-brand/30 text-sm">
                  {b.title}
                </button>
              ))}
              {boards.length === 0 && <div className="text-sm text-neutral-500">Сначала создайте доску</div>}
            </div>
          </div>
        </div>
      )}

      <style>{`.input{background:#171717;border:1px solid #262626;border-radius:8px;padding:.65rem .8rem;font-size:.9rem;color:#fafafa;outline:none}.input:focus{border-color:#7c3aed}`}</style>
    </div>
  )
}