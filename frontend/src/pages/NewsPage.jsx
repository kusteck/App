import { useEffect, useState } from 'react'
import api from '../api/client'
import { timeAgo } from '../utils/format'

const CATEGORIES = ['all', 'Главное', 'Технологии', 'Игры', 'Бизнес', 'Наука', 'Культура']

export default function NewsPage() {
  const [news, setNews] = useState([])
  const [cat, setCat] = useState('all')

  const load = async (c) => {
    const { data } = await api.get('/news', { params: { category: c } })
    setNews(data)
  }
  useEffect(() => { load(cat) }, [cat])

  return (
    <div className="p-4 md:p-6 animate-slideIn">
      <h1 className="text-2xl font-bold mb-1">Новости</h1>
      <p className="text-sm text-neutral-400 mb-5">Отдельная вкладка с подборкой по категориям.</p>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs border ${cat === c ? 'bg-brand border-brand' : 'border-neutral-800 text-neutral-300 hover:border-neutral-700'}`}>
            {c === 'all' ? 'Все' : c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {news.map((n) => (
          <article key={n.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-brand/40 transition">
            {n.image_url && <img src={n.image_url} className="w-full h-44 object-cover" />}
            <div className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-brand-light mb-1">{n.category}</div>
              <h3 className="font-semibold leading-snug mb-2">{n.title}</h3>
              <p className="text-sm text-neutral-400 line-clamp-3">{n.summary}</p>
              <div className="text-xs text-neutral-500 mt-3">{n.source} · {timeAgo(n.created_at)}</div>
            </div>
          </article>
        ))}
        {news.length === 0 && <div className="col-span-full text-center text-neutral-500 py-16">Новостей нет</div>}
      </div>
    </div>
  )
}