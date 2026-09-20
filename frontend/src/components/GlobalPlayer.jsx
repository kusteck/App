import { usePlayer } from '../store/player'
import { formatDuration } from '../utils/format'

export default function GlobalPlayer() {
  const {
    playing, current, duration, volume, toggle, next, prev, seek, setVolume, currentTrack,
  } = usePlayer()
  const track = currentTrack()
  if (!track) return null

  return (
    <div className="sticky bottom-0 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur px-4 py-3 md:bottom-0 bottom-14">
      <div className="flex items-center gap-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 w-56 min-w-0">
          {track.cover_url && <img src={track.cover_url} className="w-11 h-11 rounded object-cover" />}
          <div className="truncate">
            <div className="text-sm font-medium truncate">{track.title}</div>
            <div className="text-xs text-neutral-400 truncate">{track.artist}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={prev} className="text-neutral-300 hover:text-white text-lg">⏮</button>
          <button onClick={toggle} className="w-10 h-10 rounded-full bg-brand hover:bg-brand-dark grid place-items-center">
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={next} className="text-neutral-300 hover:text-white text-lg">⏭</button>
        </div>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-neutral-400 tabular-nums">{formatDuration(current)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={current}
            onChange={(e) => seek(+e.target.value)}
            className="flex-1 accent-brand"
          />
          <span className="text-xs text-neutral-400 tabular-nums">{formatDuration(duration)}</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-neutral-400">🔊</span>
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={(e) => setVolume(+e.target.value)}
            className="w-24 accent-brand"
          />
        </div>
      </div>
    </div>
  )
}