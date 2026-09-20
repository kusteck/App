import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useWS } from '../store/ws'
import { useAuth } from '../store/auth'
import { timeAgo } from '../utils/format'

export default function MessagesPage() {
  const { chatId } = useParams()
  const nav = useNavigate()
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [typingPeer, setTypingPeer] = useState(false)
  const ws = useWS()
  const me = useAuth((s) => s.user)
  const scrollRef = useRef(null)

  const loadChats = async () => {
    const { data } = await api.get('/chats')
    setChats(data)
    if (!chatId && data[0]) nav(`/messages/${data[0].id}`, { replace: true })
  }

  const loadMessages = async (id) => {
    const { data } = await api.get(`/chats/${id}/messages`)
    setMessages(data)
  }

  useEffect(() => { loadChats() }, [])
  useEffect(() => { if (chatId) loadMessages(chatId) }, [chatId])

  useEffect(() => {
    const off = ws.on(({ event, payload }) => {
      if (event === 'message:new' && payload.chat_id === chatId) loadMessages(chatId)
      if (event === 'typing' && payload.chat_id === chatId) {
        setTypingPeer(true)
        setTimeout(() => setTypingPeer(false), 2000)
      }
    })
    return () => off()
  }, [chatId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !chatId) return
    await api.post(`/chats/${chatId}/messages`, { text })
    setText('')
  }

  const handleTyping = () => {
    if (chatId) api.post(`/chats/${chatId}/typing`).catch(() => {})
  }

  const uid = me?.id || ''

  return (
    <div className="h-full flex">
      <div className={`w-full md:w-80 border-r border-neutral-800 overflow-y-auto ${chatId ? 'hidden md:block' : ''}`}>
        <div className="p-4 text-sm font-semibold text-neutral-300">Диалоги</div>
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => nav(`/messages/${c.id}`)}
            className={`w-full text-left p-3 flex items-center gap-3 hover:bg-neutral-800/60 ${c.id === chatId ? 'bg-neutral-800' : ''}`}
          >
            <div className="w-10 h-10 rounded-full bg-brand/40 grid place-items-center">{(c.title || '?')[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{c.title}</div>
              <div className="text-xs text-neutral-500 truncate">{c.last_text || 'Нет сообщений'}</div>
            </div>
            {c.unread > 0 && <span className="text-[10px] bg-brand text-white rounded-full px-1.5 py-0.5">{c.unread}</span>}
          </button>
        ))}
        {chats.length === 0 && <div className="p-4 text-xs text-neutral-500">Чатов пока нет</div>}
      </div>

      {chatId ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => {
              const mine = m.user_id === uid
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand text-white' : 'bg-neutral-800'}`}>
                    {m.text}
                    <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-neutral-500'}`}>
                      {timeAgo(m.created_at)}{m.edited && ' · изм.'}
                    </div>
                  </div>
                </div>
              )
            })}
            {typingPeer && <div className="text-xs text-neutral-500 italic">печатает…</div>}
          </div>

          <form onSubmit={send} className="border-t border-neutral-800 p-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => { setText(e.target.value); handleTyping() }}
              placeholder="Сообщение…"
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/50"
            />
            <button className="px-4 rounded-lg bg-brand hover:bg-brand-dark text-sm">Отправить</button>
          </form>
        </div>
      ) : (
        <div className="hidden md:grid flex-1 place-items-center text-neutral-500">Выберите диалог</div>
      )}
    </div>
  )
}