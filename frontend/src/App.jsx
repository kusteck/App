import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/auth'
import { useWS } from './store/ws'
import Layout from './layouts/Layout'
import AuthPage from './pages/AuthPage'
import FeedPage from './pages/FeedPage'
import MessagesPage from './pages/MessagesPage'
import MusicPage from './pages/MusicPage'
import VideoPage from './pages/VideoPage'
import VideoWatchPage from './pages/VideoWatchPage'
import ImagesPage from './pages/ImagesPage'
import NewsPage from './pages/NewsPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'

export default function App() {
  const user = useAuth((s) => s.user)
  const ready = useAuth((s) => s.ready)
  const init = useAuth((s) => s.init)
  const connect = useWS((s) => s.connect)
  const disconnect = useWS((s) => s.disconnect)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (user) connect()
    else disconnect()
  }, [user?.id])

  if (!ready) return <div className="p-10 text-neutral-400">Загрузка…</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<FeedPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:chatId" element={<MessagesPage />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/video" element={<VideoPage />} />
        <Route path="/video/:id" element={<VideoWatchPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/profile/:id?" element={<ProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
    </Routes>
  )
}