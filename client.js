window.__ModuleLoader__.load({
  id: 'dsh-kugou-music',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo, useCallback } = React

    const API = '/kugou-music-api'
    const STORE_KEY = 'dsh-kugou-music:v1'

    /* 预设主题色 */
    const ACCENTS = [
      { name: '酷狗蓝', value: '#3f6bff' },
      { name: '青', value: '#06b6d4' },
      { name: '绿', value: '#16a34a' },
      { name: '紫', value: '#8b5cf6' },
      { name: '粉', value: '#ec4899' },
      { name: '橙', value: '#f59e0b' },
      { name: '红', value: '#ef4444' },
      { name: '石墨', value: '#64748b' },
    ]

    const CSS = `
.kgm-root {
  position: relative; width: 100%; box-sizing: border-box;
  font-size: 13px; line-height: 1.4;
  --kgm-bg: rgba(255,255,255,.74);
  --kgm-fg: #1b1f27;
  --kgm-dim: rgba(27,31,39,.58);
  --kgm-border: rgba(20,26,40,.10);
  --kgm-hover: rgba(20,26,40,.07);
  --kgm-track: rgba(20,26,40,.14);
  --kgm-shadow: 0 10px 30px rgba(20,26,40,.14), 0 1px 2px rgba(20,26,40,.06);
  --kgm-panel-bg: rgba(255,255,255,.86);
  --kgm-brand: #3f6bff;
}
.kgm-root[data-theme="dark"] {
  --kgm-bg: rgba(24,26,33,.70);
  --kgm-fg: #eef1f7;
  --kgm-dim: rgba(238,241,247,.56);
  --kgm-border: rgba(255,255,255,.12);
  --kgm-hover: rgba(255,255,255,.10);
  --kgm-track: rgba(255,255,255,.16);
  --kgm-shadow: 0 14px 36px rgba(0,0,0,.46), 0 1px 2px rgba(0,0,0,.3);
  --kgm-panel-bg: rgba(26,28,36,.90);
}
.kgm-root * { box-sizing: border-box; }
.kgm-bar {
  display: flex; align-items: center; gap: 6px; height: 52px; padding: 0 10px;
  border: 1px solid var(--kgm-border); border-radius: 14px;
  background: var(--kgm-bg); color: var(--kgm-fg);
  -webkit-backdrop-filter: blur(20px) saturate(1.6); backdrop-filter: blur(20px) saturate(1.6);
  box-shadow: var(--kgm-shadow);
}
.kgm-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; padding: 0; border: 0; border-radius: 9px;
  background: transparent; color: inherit; cursor: pointer; flex: none;
  opacity: .72; transition: background .16s, opacity .16s, transform .16s;
}
.kgm-btn:hover { background: var(--kgm-hover); opacity: 1; }
.kgm-btn:active { transform: scale(.94); }
.kgm-btn:disabled { opacity: .28; cursor: default; background: transparent; }
.kgm-btn svg { width: 16px; height: 16px; display: block; }
.kgm-main {
  width: 34px; height: 34px; border-radius: 50%; flex: none; border: 0; padding: 0;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  background: var(--kgm-brand); color: #fff;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--kgm-brand) 45%, transparent); transition: transform .16s;
}
.kgm-main:active { transform: scale(.94); }
.kgm-main svg { width: 16px; height: 16px; }
.kgm-cover {
  width: 34px; height: 34px; border-radius: 50%; flex: none;
  display: flex; align-items: center; justify-content: center;
  background: var(--kgm-brand);
  color: #fff; font-size: 14px; overflow: hidden; position: relative;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--kgm-brand) 40%, transparent), inset 0 0 0 3px rgba(255,255,255,.18);
}
.kgm-cover.kgm-spin::after {
  content: ''; position: absolute; inset: 11px; border-radius: 50%;
  background: rgba(255,255,255,.9);
}
.kgm-cover.kgm-spin { animation: kgm-spin 7s linear infinite; }
@keyframes kgm-spin { to { transform: rotate(360deg); } }
.kgm-meta { min-width: 0; max-width: 28%; display: flex; flex-direction: column; line-height: 1.3; }
.kgm-title { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-singer { font-size: 11px; color: var(--kgm-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-empty-meta { color: var(--kgm-dim); font-size: 12px; }
.kgm-progress { flex: 1; min-width: 70px; display: flex; align-items: center; gap: 8px; }
.kgm-track { position: relative; flex: 1; height: 22px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
.kgm-track-bar { position: absolute; left: 0; right: 0; height: 3px; border-radius: 999px; background: var(--kgm-track); transition: height .16s ease; }
.kgm-track:hover .kgm-track-bar { height: 5px; }
.kgm-track-fill { position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 3px; border-radius: 999px; background: var(--kgm-brand); transition: height .16s ease; pointer-events: none; }
.kgm-track:hover .kgm-track-fill { height: 5px; }
.kgm-thumb {
  position: absolute; top: 50%; width: 11px; height: 11px; border-radius: 50%;
  background: #fff; border: 2.5px solid var(--kgm-brand); pointer-events: none;
  transform: translate(-50%, -50%); opacity: 0; transition: opacity .16s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,.22);
}
.kgm-track:hover .kgm-thumb { opacity: 1; }
.kgm-time { font-size: 11px; color: var(--kgm-dim); font-variant-numeric: tabular-nums; flex: none; }
.kgm-volume { width: 58px; accent-color: var(--kgm-brand); flex: none; }
.kgm-panel {
  position: absolute; left: 0; right: 0; bottom: calc(100% + 10px); z-index: 40;
  height: 460px; display: flex; overflow: hidden;
  border: 1px solid var(--kgm-border); border-radius: 16px;
  background: var(--kgm-panel-bg); color: var(--kgm-fg);
  -webkit-backdrop-filter: blur(24px) saturate(1.7); backdrop-filter: blur(24px) saturate(1.7);
  box-shadow: var(--kgm-shadow); animation: kgm-in .18s ease-out;
}
@keyframes kgm-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.kgm-left { width: 56%; display: flex; flex-direction: column; border-right: 1px solid var(--kgm-border); min-width: 0; }
.kgm-right { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.kgm-tabs { display: flex; gap: 2px; padding: 10px 10px 6px; align-items: center; }
.kgm-tab {
  border: 0; background: transparent; color: var(--kgm-dim); cursor: pointer;
  padding: 5px 10px; border-radius: 8px; font-size: 12px; transition: .16s;
}
.kgm-tab:hover { background: var(--kgm-hover); }
.kgm-tab.kgm-on { color: var(--kgm-fg); background: var(--kgm-hover); font-weight: 600; }
.kgm-search { display: flex; gap: 6px; padding: 0 12px 8px; }
.kgm-input {
  flex: 1; min-width: 0; height: 32px; padding: 0 10px;
  border: 1px solid var(--kgm-border); border-radius: 9px;
  background: rgba(255,255,255,.06); color: inherit; font-size: 13px; outline: none;
  transition: border-color .16s, background .16s;
}
.kgm-input:focus { border-color: var(--kgm-brand); background: rgba(255,255,255,.10); }
.kgm-go {
  height: 32px; padding: 0 14px; border: 0; border-radius: 9px; cursor: pointer;
  background: var(--kgm-brand); color: #fff; font-size: 12px; font-weight: 600;
  transition: filter .16s;
}
.kgm-go:hover { filter: brightness(1.08); }
.kgm-go:disabled { opacity: .45; cursor: default; }
.kgm-list { flex: 1; overflow-y: auto; padding: 0 6px 10px; scrollbar-width: thin; }
.kgm-song {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  padding: 8px; border: 0; border-radius: 9px; background: transparent; color: inherit;
  cursor: pointer; transition: background .14s;
}
.kgm-song:hover { background: var(--kgm-hover); }
.kgm-song.kgm-current { background: color-mix(in srgb, var(--kgm-brand) 14%, transparent); }
.kgm-idx { width: 18px; text-align: right; font-size: 11px; color: var(--kgm-dim); flex: none; font-variant-numeric: tabular-nums; }
.kgm-song-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-song-singer { font-size: 11px; color: var(--kgm-dim); max-width: 30%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-tag { flex: none; font-size: 10px; padding: 1px 5px; border-radius: 4px; background: rgba(52,168,83,.16); color: #2e9e4f; }
.kgm-tag-vip { background: rgba(220,120,40,.16); color: #c26a20; }
.kgm-tag-local { background: color-mix(in srgb, var(--kgm-brand) 16%, transparent); color: var(--kgm-brand); }
.kgm-root[data-theme="dark"] .kgm-tag { color: #6ee09a; }
.kgm-root[data-theme="dark"] .kgm-tag-vip { color: #ffb066; }
.kgm-hint { padding: 16px 14px; font-size: 12px; color: var(--kgm-dim); line-height: 1.65; }
.kgm-lyric-head { padding: 12px 14px 2px; font-size: 12px; color: var(--kgm-dim); display: flex; justify-content: space-between; gap: 8px; }
.kgm-lyric-box { flex: 1; overflow-y: auto; padding: 10px 18px 28px; scrollbar-width: thin; }
.kgm-lyric-line { padding: 5px 0; font-size: 13px; line-height: 1.55; opacity: .38; transition: opacity .22s; }
.kgm-lyric-line.kgm-active { opacity: 1; font-weight: 600; color: var(--kgm-brand); }
.kgm-w { transition: color .1s; }
.kgm-w-done { color: var(--kgm-brand); }
.kgm-err { margin: 0 12px 8px; padding: 7px 10px; border-radius: 9px; font-size: 12px; background: rgba(220,80,70,.12); color: #e05a4e; }
.kgm-root[data-theme="dark"] .kgm-err { color: #ff8a80; }
.kgm-settings { padding: 2px 14px 14px; overflow-y: auto; flex: 1; }
.kgm-subtabs { display: flex; gap: 4px; margin-bottom: 12px; }
.kgm-subtab { flex: 1; height: 30px; border: 1px solid var(--kgm-border); border-radius: 8px; background: transparent; color: var(--kgm-dim); cursor: pointer; font-size: 12px; }
.kgm-subtab.kgm-on { color: var(--kgm-fg); border-color: var(--kgm-brand); background: color-mix(in srgb, var(--kgm-brand) 10%, transparent); font-weight: 600; }
.kgm-section { margin-bottom: 16px; }
.kgm-section-title { font-size: 11px; font-weight: 600; color: var(--kgm-dim); letter-spacing: .04em; margin-bottom: 8px; }
.kgm-themes { display: flex; gap: 10px; }
.kgm-theme {
  flex: 1; border: 1.5px solid var(--kgm-border); border-radius: 11px; padding: 10px;
  background: transparent; color: inherit; cursor: pointer; text-align: left; transition: .16s;
}
.kgm-theme:hover { border-color: var(--kgm-brand); }
.kgm-theme.kgm-on { border-color: var(--kgm-brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kgm-brand) 18%, transparent); }
.kgm-swatch { height: 32px; border-radius: 7px; margin-bottom: 7px; border: 1px solid rgba(0,0,0,.06); }
.kgm-swatch-light { background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(240,244,255,.75)); }
.kgm-swatch-dark { background: linear-gradient(135deg, rgba(28,30,38,.95), rgba(44,48,60,.8)); }
.kgm-theme-name { font-size: 12px; font-weight: 600; }
.kgm-colors { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.kgm-color {
  width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,.18); transition: transform .14s;
}
.kgm-color:hover { transform: scale(1.12); }
.kgm-color.kgm-on { border-color: var(--kgm-fg); transform: scale(1.12); }
.kgm-color-custom {
  width: 30px; height: 26px; padding: 0; border: 1px dashed var(--kgm-border); border-radius: 7px;
  background: transparent; cursor: pointer;
}
.kgm-color-hex { font-size: 11px; color: var(--kgm-dim); font-family: ui-monospace, Consolas, monospace; margin-left: 4px; }
.kgm-cookie textarea {
  width: 100%; height: 74px; resize: none; padding: 8px; font-size: 11px;
  border: 1px solid var(--kgm-border); border-radius: 9px;
  background: rgba(255,255,255,.06); color: inherit; outline: none;
  font-family: ui-monospace, Consolas, monospace;
}
.kgm-cookie textarea:focus { border-color: var(--kgm-brand); }
.kgm-row { display: flex; gap: 6px; align-items: center; }
.kgm-small { font-size: 11px; color: var(--kgm-dim); line-height: 1.7; margin-bottom: 8px; }
.kgm-step { display: flex; gap: 8px; margin-bottom: 7px; font-size: 11.5px; line-height: 1.6; color: var(--kgm-dim); }
.kgm-num { width: 17px; height: 17px; flex: none; border-radius: 50%; background: var(--kgm-hover); color: var(--kgm-fg); font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.kgm-code { font-family: ui-monospace, Consolas, monospace; background: var(--kgm-hover); padding: 0 4px; border-radius: 4px; color: var(--kgm-fg); }
.kgm-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--kgm-hover); color: var(--kgm-dim); }
.kgm-badge-on { background: color-mix(in srgb, var(--kgm-brand) 18%, transparent); color: var(--kgm-brand); font-weight: 600; }
.kgm-chips { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 12px 8px; }
.kgm-chip { border: 1px solid var(--kgm-border); background: transparent; color: var(--kgm-dim); border-radius: 999px; padding: 3px 10px; font-size: 11px; cursor: pointer; }
.kgm-chip.kgm-on { border-color: var(--kgm-brand); color: var(--kgm-brand); background: color-mix(in srgb, var(--kgm-brand) 10%, transparent); }
`

    /* ------------------------------------------------------------------ */
    async function api(path, init) {
      const res = await fetch(path, init)
      return res.json()
    }

    function fmt(sec) {
      if (!Number.isFinite(sec) || sec < 0) return '0:00'
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return m + ':' + String(s).padStart(2, '0')
    }

    function loadStore() {
      try {
        return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}
      } catch {
        return {}
      }
    }

    function saveStore(patch) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ ...loadStore(), ...patch }))
      } catch {
        /* ignore */
      }
    }

    const Icon = {
      play: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M8 5v14l11-7z' })),
      pause: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M7 5h4v14H7zM13 5h4v14h-4z' })),
      prev: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M7 6h2v12H7zM20 6l-9 6 9 6z' })),
      next: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M15 6h2v12h-2zM4 6l9 6-9 6z' })),
      up: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M6 15l6-6 6 6' })),
      down: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M6 9l6 6 6-6' })),
      search: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' }, h('circle', { cx: 11, cy: 11, r: 6.5 }), h('path', { d: 'M20 20l-4.2-4.2' })),
      gear: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' }, h('circle', { cx: 12, cy: 12, r: 3.2 }), h('path', { d: 'M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1z' })),
    }

    function KugouDock() {
      const cached = useMemo(() => loadStore(), [])
      const [expanded, setExpanded] = useState(false)
      const [tab, setTab] = useState(cached.tab || 'search')
      const [settingsTab, setSettingsTab] = useState('look')
      const [theme, setTheme] = useState(cached.theme === 'dark' ? 'dark' : 'light')
      const [accent, setAccent] = useState(typeof cached.accent === 'string' ? cached.accent : '#3f6bff')

      const [query, setQuery] = useState('')
      const [results, setResults] = useState([])
      const [loading, setLoading] = useState(false)
      const [queue, setQueue] = useState(Array.isArray(cached.queue) ? cached.queue : [])
      const [index, setIndex] = useState(-1)
      const [song, setSong] = useState(null)
      const [playing, setPlaying] = useState(false)
      const [cur, setCur] = useState(0)
      const [dur, setDur] = useState(0)
      const [lyric, setLyric] = useState({ lines: [], meta: {} })
      const [error, setError] = useState('')
      const [hasCookie, setHasCookie] = useState(false)
      const [cookieDraft, setCookieDraft] = useState('')
      const [volume, setVolume] = useState(typeof cached.volume === 'number' ? cached.volume : 0.8)

      // 歌单
      const [plMode, setPlMode] = useState('local')
      const [plInput, setPlInput] = useState('')
      const [plLoading, setPlLoading] = useState(false)
      const [onlineList, setOnlineList] = useState({ id: '', name: '', songs: [] })
      const [localLists, setLocalLists] = useState([])
      const [localCloud, setLocalCloud] = useState([])
      const [localError, setLocalError] = useState('')
      const [localFileList, setLocalFileList] = useState([])
      const [activeLocal, setActiveLocal] = useState('recent')

      const audioRef = useRef(null)
      const lyricRef = useRef(null)
      const proxyTried = useRef('')
      const liveRef = useRef({ queue, index })
      liveRef.current = { queue, index }

      useEffect(() => {
        saveStore({ theme, accent })
      }, [theme, accent])

      useEffect(() => {
        const a = new Audio()
        a.preload = 'auto'
        const store = loadStore()
        a.volume = typeof store.volume === 'number' ? store.volume : 0.8
        audioRef.current = a

        const onTime = () => setCur(a.currentTime || 0)
        const onMeta = () => setDur(Number.isFinite(a.duration) ? a.duration : 0)
        const onPlay = () => setPlaying(true)
        const onPause = () => setPlaying(false)
        const onEnd = () => {
          const { queue: q, index: i } = liveRef.current
          if (i + 1 < q.length) playAtRef.current(q, i + 1)
          else setPlaying(false)
        }
        const onErr = () => {
          const src = a.currentSrc || a.src
          if (!src || src.indexOf('/local-audio') !== -1) {
            setError('音频加载失败')
            return
          }
          if (proxyTried.current === src) {
            setError('音频加载失败，换一首试试')
            return
          }
          proxyTried.current = src
          const pos = a.currentTime
          a.src = API + '/audio?url=' + encodeURIComponent(src)
          a.load()
          if (pos > 0) a.currentTime = pos
          a.play().catch(() => setError('音频加载失败，换一首试试'))
        }

        a.addEventListener('timeupdate', onTime)
        a.addEventListener('loadedmetadata', onMeta)
        a.addEventListener('durationchange', onMeta)
        a.addEventListener('play', onPlay)
        a.addEventListener('pause', onPause)
        a.addEventListener('ended', onEnd)
        a.addEventListener('error', onErr)
        return () => {
          a.removeEventListener('timeupdate', onTime)
          a.removeEventListener('loadedmetadata', onMeta)
          a.removeEventListener('durationchange', onMeta)
          a.removeEventListener('play', onPlay)
          a.removeEventListener('pause', onPause)
          a.removeEventListener('ended', onEnd)
          a.removeEventListener('error', onErr)
          a.pause()
          a.src = ''
          audioRef.current = null
        }
      }, [])

      const loadLyricFor = useCallback(async (target, fallbackDuration) => {
        try {
          let hash = target.hash
          let duration = target.duration || fallbackDuration || 0
          if (!hash && target.localPath) {
            // 本地文件没有 hash：按歌名搜一首拿歌词
            const kw = ((target.singer ? target.singer + ' ' : '') + target.name).trim()
            const sr = await api(API + '/search?q=' + encodeURIComponent(kw) + '&size=1')
            const hit = sr && sr.ok && sr.songs && sr.songs[0]
            if (!hit) return
            hash = hit.hash
            duration = hit.duration || duration
          }
          if (!hash) return
          const r = await api(API + '/lyric?hash=' + encodeURIComponent(hash) + '&duration=' + duration)
          if (r && r.ok) setLyric({ lines: r.lines || [], meta: r.meta || {} })
        } catch {
          /* 歌词失败不影响播放 */
        }
      }, [])

      const playAt = useCallback(async (list, i) => {
        const target = list[i]
        if (!target) return
        setError('')
        setSong(target)
        setIndex(i)
        setQueue(list)
        setLyric({ lines: [], meta: {} })
        setCur(0)
        setDur(0)
        saveStore({ queue: list.map((s) => ({ hash: s.hash, name: s.name, singer: s.singer, duration: s.duration, localPath: s.localPath })) })

        const a = audioRef.current
        if (!a) return

        if (target.localPath) {
          proxyTried.current = ''
          a.src = API + '/local-audio?path=' + encodeURIComponent(target.localPath)
          a.volume = volume
          try {
            await a.play()
          } catch (e) {
            setError('本地文件播放失败：' + (e && e.message ? e.message : String(e)))
          }
          loadLyricFor(target)
          return
        }

        let info
        try {
          info = await api(API + '/play?hash=' + encodeURIComponent(target.hash) + '&albumId=' + encodeURIComponent(target.albumId || ''))
        } catch {
          setError('连不上 Host 接口')
          return
        }
        if (!info.ok) {
          setError(info.error || '取播放地址失败')
          return
        }
        if (!info.url) {
          setError(
            info.hasCookie
              ? '这首歌暂无版权或需要更高会员权益'
              : 'VIP 歌曲需要先在「设置 → 账号」里粘贴酷狗 Cookie',
          )
          return
        }
        proxyTried.current = ''
        a.src = info.url
        a.volume = volume
        try {
          await a.play()
        } catch (e) {
          setError('浏览器拒绝播放：' + (e && e.message ? e.message : String(e)))
        }
        loadLyricFor(target, info.duration)
      }, [volume, loadLyricFor])

      const playAtRef = useRef(playAt)
      playAtRef.current = playAt

      const next = useCallback(() => {
        const { queue: q, index: i } = liveRef.current
        if (!q.length) return
        playAtRef.current(q, (i + 1) % q.length)
      }, [])

      const prev = useCallback(() => {
        const { queue: q, index: i } = liveRef.current
        if (!q.length) return
        playAtRef.current(q, (i - 1 + q.length) % q.length)
      }, [])

      const toggle = useCallback(() => {
        const a = audioRef.current
        if (!a) return
        if (!song && queue.length) {
          playAtRef.current(queue, 0)
          return
        }
        if (a.paused) a.play().catch(() => {})
        else a.pause()
      }, [song, queue])

      const seek = useCallback((e) => {
        const a = audioRef.current
        if (!a || !Number.isFinite(a.duration) || a.duration <= 0) return
        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
        a.currentTime = ratio * a.duration
      }, [])

      const doSearch = useCallback(async () => {
        const q = query.trim()
        if (!q) return
        setLoading(true)
        setError('')
        try {
          const r = await api(API + '/search?q=' + encodeURIComponent(q) + '&size=20')
          if (!r.ok) {
            setError(r.error || '搜索失败')
            setResults([])
          } else setResults(r.songs || [])
        } catch {
          setError('搜索请求失败')
        } finally {
          setLoading(false)
        }
      }, [query])

      const importPlaylist = useCallback(async (raw) => {
        const input = String(raw || '').trim()
        if (!input) return
        setPlLoading(true)
        setError('')
        try {
          const r = await api(API + '/playlist?id=' + encodeURIComponent(input) + '&size=200')
          if (!r.ok) {
            setError(r.error || '歌单导入失败')
            return
          }
          const nextPl = { id: r.id, name: r.name, songs: r.songs || [] }
          setOnlineList(nextPl)
          setPlInput(r.id)
          saveStore({ playlist: nextPl })
        } catch {
          setError('歌单请求失败')
        } finally {
          setPlLoading(false)
        }
      }, [])

      const loadLocal = useCallback(async () => {
        setLocalError('')
        try {
          const r = await api(API + '/local-lists')
          if (!r.ok || !r.available) {
            setLocalError('没找到本地酷狗客户端数据库')
            return
          }
          setLocalLists(r.playlists || [])
          setLocalCloud(r.cloudLists || [])
          if ((r.playlists || []).length) {
            const has = (r.playlists || []).some((p) => p.id === activeLocal)
            setActiveLocal(has ? activeLocal : r.playlists[0].id)
          }
        } catch {
          setLocalError('读取本地歌单失败')
        }
        try {
          const f = await api(API + '/local-files')
          if (f && f.ok) setLocalFileList(f.files || [])
        } catch {
          /* ignore */
        }
      }, [activeLocal])

      useEffect(() => {
        if (expanded && tab === 'playlist' && plMode === 'local' && !localLists.length) loadLocal()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [expanded, tab, plMode])

      useEffect(() => {
        if (cached.playlist && cached.playlist.id && !onlineList.id) {
          api(API + '/playlist?id=' + encodeURIComponent(cached.playlist.id) + '&size=200')
            .then((r) => {
              if (r && r.ok) {
                setOnlineList({ id: r.id, name: r.name, songs: r.songs || [] })
                setPlInput(r.id)
              }
            })
            .catch(() => {})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      const checkCookie = useCallback(async () => {
        try {
          const r = await api(API + '/cookie')
          setHasCookie(Boolean(r && r.hasCookie))
        } catch {
          /* ignore */
        }
      }, [])

      useEffect(() => {
        checkCookie()
      }, [checkCookie])

      const saveCookie = useCallback(async () => {
        try {
          const r = await api(API + '/cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: cookieDraft }),
          })
          setHasCookie(Boolean(r && r.hasCookie))
          setCookieDraft('')
        } catch {
          setError('保存 Cookie 失败')
        }
      }, [cookieDraft])

      const clearCookie = useCallback(async () => {
        try {
          await api(API + '/cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: '' }),
          })
          setHasCookie(false)
        } catch {
          /* ignore */
        }
      }, [])

      const changeVolume = useCallback((e) => {
        const v = Number(e.target.value)
        setVolume(v)
        saveStore({ volume: v })
        if (audioRef.current) audioRef.current.volume = v
      }, [])

      const lineIdx = useMemo(() => {
        const ms = cur * 1000
        let idx = -1
        for (let i = 0; i < lyric.lines.length; i++) {
          if (lyric.lines[i].start <= ms) idx = i
          else break
        }
        return idx
      }, [cur, lyric])

      useEffect(() => {
        if (!expanded || lineIdx < 0) return
        const box = lyricRef.current
        if (!box) return
        const el = box.querySelector('[data-line="' + lineIdx + '"]')
        if (!el) return
        box.scrollTo({ top: Math.max(0, el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2), behavior: 'smooth' })
      }, [lineIdx, expanded])

      const progress = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0

      const renderLine = (line, i) => {
        const active = i === lineIdx
        if (!active) {
          return h('div', { key: i, className: 'kgm-lyric-line', 'data-line': i }, line.words.map((w) => w.text).join(''))
        }
        const rel = cur * 1000 - line.start
        return h(
          'div',
          { key: i, className: 'kgm-lyric-line kgm-active', 'data-line': i },
          line.words.map((w, j) => h(
            'span',
            { key: j, className: rel >= w.t ? 'kgm-w kgm-w-done' : 'kgm-w' },
            w.text,
          )),
        )
      }

      const renderSong = (s, i, list, showIdx) => {
        const isCurrent = list === queue && i === index
        return h(
          'button',
          {
            key: (s.hash || s.localPath || 'k') + i,
            className: 'kgm-song' + (isCurrent ? ' kgm-current' : ''),
            onClick: () => playAt(list, i),
            title: (s.name || '') + (s.singer ? ' - ' + s.singer : ''),
          },
          showIdx ? h('span', { className: 'kgm-idx' }, String(i + 1)) : null,
          h('span', { className: 'kgm-song-name' }, s.name || s.songName || '未知歌曲'),
          h('span', { className: 'kgm-song-singer' }, s.singer || ''),
          s.localPath
            ? h('span', { className: 'kgm-tag kgm-tag-local' }, s.kgm ? '加密' : '本地')
            : s.free === false
              ? h('span', { className: 'kgm-tag kgm-tag-vip' }, 'VIP')
              : h('span', { className: 'kgm-tag' }, '免费'),
        )
      }

      /* ---------------- 本地歌单视图 ---------------- */
      const activeList = localLists.find((p) => p.id === activeLocal)
      const localSongs = activeList ? activeList.songs : localFileList
      const localSongsForPlay = useMemo(() => {
        if (activeList) return activeList.songs
        return localFileList.map((f) => {
          const base = f.name.replace(/\.[^.]+$/, '')
          const dash = base.indexOf(' - ')
          return {
            hash: '',
            name: dash > 0 ? base.slice(dash + 3) : base,
            singer: dash > 0 ? base.slice(0, dash) : '',
            duration: 0,
            localPath: f.path,
            kgm: f.kgm,
          }
        })
      }, [activeList, localFileList])

      const searchBody = [
        h(
          'div',
          { className: 'kgm-search', key: 'search' },
          h('input', {
            className: 'kgm-input',
            placeholder: '搜索歌曲 / 歌手，回车',
            value: query,
            onChange: (e) => setQuery(e.target.value),
            onKeyDown: (e) => {
              if (e.key === 'Enter') doSearch()
            },
          }),
          h('button', { className: 'kgm-go', onClick: doSearch, disabled: loading || !query.trim() }, loading ? '搜索中' : '搜索'),
        ),
        h(
          'div',
          { className: 'kgm-list', key: 'list' },
          results.length
            ? results.map((s, i) => renderSong(s, i, results, false))
            : h('div', { className: 'kgm-hint' }, '输入歌名回车，挑一首开播。免费歌直接能听；VIP 歌在「设置 → 账号」填 Cookie。'),
        ),
      ]

      const playlistBody = [
        h(
          'div',
          { className: 'kgm-chips', key: 'chips' },
          h('button', { className: 'kgm-chip' + (plMode === 'local' ? ' kgm-on' : ''), onClick: () => { setPlMode('local'); if (!localLists.length) loadLocal() } }, '本地歌单'),
          h('button', { className: 'kgm-chip' + (plMode === 'link' ? ' kgm-on' : ''), onClick: () => setPlMode('link') }, '链接导入'),
          h('button', { className: 'kgm-chip', style: { marginLeft: 'auto' }, onClick: loadLocal }, '刷新'),
        ),
      ]

      if (plMode === 'local') {
        playlistBody.push(
          localError ? h('div', { className: 'kgm-err', key: 'e' }, localError) : null,
          h(
            'div',
            { className: 'kgm-chips', key: 'lists' },
            localLists.map((p) =>
              h('button', {
                key: p.id,
                className: 'kgm-chip' + (activeLocal === p.id ? ' kgm-on' : ''),
                onClick: () => setActiveLocal(p.id),
              }, p.name + ' · ' + p.count),
            ),
            h('button', {
              key: 'files',
              className: 'kgm-chip' + (activeLocal === 'files' ? ' kgm-on' : ''),
              onClick: () => setActiveLocal('files'),
            }, '本地文件 · ' + localFileList.length),
          ),
          localCloud.length
            ? h('div', { className: 'kgm-small', style: { padding: '0 14px' }, key: 'cloud' },
                '云端歌单（歌曲在服务器，需登录后同步）：' + localCloud.map((c) => c.name).join(' / '))
            : null,
          h(
            'div',
            { className: 'kgm-list', key: 'songs' },
            localSongsForPlay.length
              ? localSongsForPlay.map((s, i) => renderSong(s, i, localSongsForPlay, true))
              : h('div', { className: 'kgm-hint' }, '点上面的歌单看看，或者刷新一下。'),
          ),
        )
      } else {
        playlistBody.push(
          h(
            'div',
            { className: 'kgm-search', key: 'pl-search' },
            h('input', {
              className: 'kgm-input',
              placeholder: '粘贴酷狗歌单链接，或歌单 ID',
              value: plInput,
              onChange: (e) => setPlInput(e.target.value),
              onKeyDown: (e) => {
                if (e.key === 'Enter') importPlaylist(plInput)
              },
            }),
            h('button', { className: 'kgm-go', onClick: () => importPlaylist(plInput), disabled: plLoading || !plInput.trim() }, plLoading ? '拉取中' : '导入'),
          ),
          onlineList.songs.length
            ? h('div', { className: 'kgm-small', style: { padding: '0 14px' }, key: 'n' },
                '《' + onlineList.name + '》 · ' + onlineList.songs.length + ' 首')
            : null,
          h(
            'div',
            { className: 'kgm-list', key: 'list' },
            onlineList.songs.length
              ? onlineList.songs.map((s, i) => renderSong(s, i, onlineList.songs, true))
              : h('div', { className: 'kgm-hint' }, '把酷狗歌单的分享链接粘进来，例如 www.kugou.com/yy/special/single/123456.html，拉一次就记住。'),
          ),
        )
      }

      const queueBody = h(
        'div',
        { className: 'kgm-list' },
        queue.length
          ? queue.map((s, i) => renderSong(s, i, queue, true))
          : h('div', { className: 'kgm-hint' }, '队列还是空的，先去搜几首歌。'),
      )

      const lookSettings = h(
        'div',
        { className: 'kgm-section' },
        h('div', { className: 'kgm-section-title' }, '主题'),
        h(
          'div',
          { className: 'kgm-themes', style: { marginBottom: 14 } },
          h(
            'button',
            { className: 'kgm-theme' + (theme === 'light' ? ' kgm-on' : ''), onClick: () => setTheme('light') },
            h('div', { className: 'kgm-swatch kgm-swatch-light' }),
            h('div', { className: 'kgm-theme-name' }, '白 · 半透明'),
          ),
          h(
            'button',
            { className: 'kgm-theme' + (theme === 'dark' ? ' kgm-on' : ''), onClick: () => setTheme('dark') },
            h('div', { className: 'kgm-swatch kgm-swatch-dark' }),
            h('div', { className: 'kgm-theme-name' }, '黑 · 半透明'),
          ),
        ),
        h('div', { className: 'kgm-section-title' }, '按键 / 进度条颜色'),
        h(
          'div',
          { className: 'kgm-colors' },
          ACCENTS.map((c) =>
            h('button', {
              key: c.value,
              className: 'kgm-color' + (accent.toLowerCase() === c.value ? ' kgm-on' : ''),
              style: { background: c.value },
              title: c.name + ' ' + c.value,
              onClick: () => setAccent(c.value),
            }),
          ),
          h('input', {
            type: 'color',
            className: 'kgm-color-custom',
            value: accent,
            title: '自定义颜色',
            onChange: (e) => setAccent(e.target.value),
          }),
          h('span', { className: 'kgm-color-hex' }, accent.toUpperCase()),
        ),
      )

      const accountSettings = h(
        'div',
        { className: 'kgm-section' },
        h(
          'div',
          { className: 'kgm-row', style: { marginBottom: 10 } },
          h('span', { className: 'kgm-section-title', style: { margin: 0 } }, '酷狗会员登录（Cookie）'),
          h('span', { className: 'kgm-badge' + (hasCookie ? ' kgm-badge-on' : ''), style: { marginLeft: 'auto' } }, hasCookie ? '已配置' : '未配置'),
        ),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '1'),
          h('span', null, '用浏览器打开 ', h('b', null, 'kugou.com'), '，登录你的账号（有会员更好）。'),
        ),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '2'),
          h('span', null, '按 ', h('b', null, 'F12'), '（笔记本试试 ', h('span', { className: 'kgm-code' }, 'Fn+F12'), ' 或 ', h('span', { className: 'kgm-code' }, 'Ctrl+Shift+I'), '）打开开发者工具。'),
        ),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '3'),
          h('span', null, '在开发者工具顶部找 ', h('b', null, 'Application'), '（中文版叫「应用」）。', '找不到就点顶部标签栏最右边的 ', h('b', null, '»'), ' 展开更多；或者点右上角 ', h('b', null, '⋮'), ' → More tools → Application。'),
        ),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '4'),
          h('span', null, '左侧展开 ', h('b', null, 'Storage → Cookies'), ' → 点 ', h('span', { className: 'kgm-code' }, 'https://www.kugou.com'), '，右边就是所有 Cookie。'),
        ),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '5'),
          h('span', null, '在上方 ', h('b', null, 'Filter'), ' 框里输入 ', h('span', { className: 'kgm-code' }, 'kg_'), ' 只留关键项，然后从 ', h('span', { className: 'kgm-code' }, 'Name'), ' 列拖选全部行，复制。'),
        ),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '6'),
          h('span', null, '粘成 ', h('span', { className: 'kgm-code' }, 'name=value; name2=value2'), ' 的格式贴到下面，点保存。'),
        ),
        h(
          'div',
          { className: 'kgm-small', style: { marginTop: 6 } },
          '偷懒办法：开发者工具里切到 ', h('span', { className: 'kgm-code' }, 'Console'), '（控制台），输入 ',
          h('span', { className: 'kgm-code' }, 'document.cookie'), ' 回车，复制输出的字符串——但拿不到 HttpOnly 的项，偶尔不够用。',
        ),
        h(
          'div',
          { className: 'kgm-cookie', style: { marginTop: 8 } },
          h('textarea', {
            value: cookieDraft,
            placeholder: 'kg_mid=...; kg_dfid=...; KuGoo=...; kugouMusicId=...',
            onChange: (e) => setCookieDraft(e.target.value),
          }),
        ),
        h(
          'div',
          { className: 'kgm-row', style: { marginTop: 8 } },
          h('button', { className: 'kgm-go', onClick: saveCookie, disabled: !cookieDraft.trim() }, '保存'),
          h('button', { className: 'kgm-btn', onClick: clearCookie, title: '清除 Cookie' }, '清除'),
          h('span', { className: 'kgm-small', style: { margin: 0, marginLeft: 'auto' } }, '只存本机 ~/.dsh'),
        ),
      )

      const settingsBody = h(
        'div',
        { className: 'kgm-settings' },
        h(
          'div',
          { className: 'kgm-subtabs' },
          h('button', { className: 'kgm-subtab' + (settingsTab === 'look' ? ' kgm-on' : ''), onClick: () => setSettingsTab('look') }, '外观'),
          h('button', { className: 'kgm-subtab' + (settingsTab === 'account' ? ' kgm-on' : ''), onClick: () => setSettingsTab('account') }, '账号'),
        ),
        settingsTab === 'look' ? lookSettings : accountSettings,
      )

      return h(
        'div',
        { className: 'kgm-root', 'data-theme': theme, style: { '--kgm-brand': accent } },
        h('style', null, CSS),

        expanded
          ? h(
              'div',
              { className: 'kgm-panel' },
              h(
                'div',
                { className: 'kgm-left' },
                h(
                  'div',
                  { className: 'kgm-tabs' },
                  h('button', { className: 'kgm-tab' + (tab === 'search' ? ' kgm-on' : ''), onClick: () => setTab('search') }, '搜歌'),
                  h('button', { className: 'kgm-tab' + (tab === 'playlist' ? ' kgm-on' : ''), onClick: () => setTab('playlist') }, '歌单'),
                  h('button', { className: 'kgm-tab' + (tab === 'queue' ? ' kgm-on' : ''), onClick: () => setTab('queue') }, '队列' + (queue.length ? ' · ' + queue.length : '')),
                  h(
                    'button',
                    { className: 'kgm-btn', style: { marginLeft: 'auto' }, onClick: () => setTab(tab === 'settings' ? 'search' : 'settings'), title: '设置' },
                    Icon.gear(),
                  ),
                ),
                error ? h('div', { className: 'kgm-err' }, error) : null,
                tab === 'settings' ? settingsBody : null,
                tab === 'search' ? searchBody : null,
                tab === 'playlist' ? playlistBody : null,
                tab === 'queue' ? queueBody : null,
              ),
              h(
                'div',
                { className: 'kgm-right' },
                h(
                  'div',
                  { className: 'kgm-lyric-head' },
                  h('span', null, lyric.meta && lyric.meta.title ? lyric.meta.title : '歌词'),
                  h('span', null, lyric.meta && lyric.meta.wordByWord ? '逐字' : lyric.lines.length ? 'LRC' : ''),
                ),
                h(
                  'div',
                  { className: 'kgm-lyric-box', ref: lyricRef },
                  lyric.lines.length
                    ? lyric.lines.map(renderLine)
                    : h('div', { className: 'kgm-hint' }, song ? '这首暂时没有歌词数据' : '播放歌曲后这里显示歌词'),
                ),
              ),
            )
          : null,

        h(
          'div',
          { className: 'kgm-bar' },
          h('button', { className: 'kgm-btn', onClick: () => setExpanded((v) => !v), title: expanded ? '收起' : '展开' }, expanded ? Icon.down() : Icon.up()),
          h('div', { className: 'kgm-cover' + (playing ? ' kgm-spin' : '') }, playing ? '' : '♫'),
          h(
            'div',
            { className: 'kgm-meta' },
            song ? h('div', { className: 'kgm-title' }, song.name) : h('div', { className: 'kgm-empty-meta' }, '酷狗 · 未播放'),
            song ? h('div', { className: 'kgm-singer' }, song.singer || (song.localPath ? '本地文件' : '')) : null,
          ),
          h(
            'div',
            { className: 'kgm-progress' },
            h(
              'div',
              { className: 'kgm-track', onClick: seek, title: '点击跳转' },
              h('div', { className: 'kgm-track-bar' }),
              h('div', { className: 'kgm-track-fill', style: { width: progress + '%' } }),
              h('div', { className: 'kgm-thumb', style: { left: progress + '%' } }),
            ),
            h('span', { className: 'kgm-time' }, fmt(cur) + ' / ' + fmt(dur)),
          ),
          h('button', { className: 'kgm-btn', onClick: prev, disabled: !queue.length, title: '上一首' }, Icon.prev()),
          h('button', { className: 'kgm-main', onClick: toggle, title: playing ? '暂停' : '播放' }, playing ? Icon.pause() : Icon.play()),
          h('button', { className: 'kgm-btn', onClick: next, disabled: !queue.length, title: '下一首' }, Icon.next()),
          h('input', { className: 'kgm-volume', type: 'range', min: 0, max: 1, step: 0.01, value: volume, onChange: changeVolume, title: '音量' }),
          h('button', { className: 'kgm-btn', onClick: () => { setExpanded(true); setTab('search') }, title: '搜歌' }, Icon.search()),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const slots = ctx.slots
        if (!slots) return
        slots.inject('conversation.input.dock', () =>
          slots.register(
            { name: 'conversation.input.dock', id: 'kugou-music', order: 15, label: '酷狗音乐' },
            () => h(KugouDock),
          ),
        )
      },
    }
  },
})
