window.__ModuleLoader__.load({
  id: 'dsh-kugou-music',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo, useCallback } = React

    const API = '/kugou-music-api'
    const STORE_KEY = 'dsh-kugou-music:v1'

    /* ------------------------------------------------------------------ */
    /* 样式：全部走宿主主题 token，取不到时退回中性色                       */
    /* ------------------------------------------------------------------ */
    const CSS = `
.kgm-root { position: relative; width: 100%; box-sizing: border-box; font-size: 13px; }
.kgm-root * { box-sizing: border-box; }
.kgm-bar {
  display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-subtle, rgba(120,130,150,.22));
  border-radius: 12px;
  background: var(--dsw-alias-bg-elevated, rgba(250,251,253,.92));
  color: var(--dsw-alias-text-primary, #1c1f24);
  box-shadow: 0 1px 2px rgba(20, 26, 40, .04);
}
.kgm-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px;
  background: transparent; color: inherit; cursor: pointer; flex: none;
  opacity: .78; line-height: 1;
}
.kgm-btn:hover { background: var(--dsw-alias-bg-hover, rgba(120,130,150,.14)); opacity: 1; }
.kgm-btn:disabled { opacity: .3; cursor: default; }
.kgm-btn svg { width: 16px; height: 16px; display: block; }
.kgm-cover {
  width: 30px; height: 30px; border-radius: 50%; flex: none;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #4d6bfe, #9b5cff);
  color: #fff; font-size: 13px; overflow: hidden;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.35);
}
.kgm-cover.kgm-spin { animation: kgm-spin 6s linear infinite; }
@keyframes kgm-spin { to { transform: rotate(360deg); } }
.kgm-meta { min-width: 0; max-width: 34%; display: flex; flex-direction: column; line-height: 1.25; }
.kgm-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-singer { font-size: 11px; opacity: .62; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-empty-meta { opacity: .5; font-size: 12px; }
.kgm-progress { flex: 1; min-width: 60px; display: flex; align-items: center; gap: 8px; }
.kgm-track { position: relative; flex: 1; height: 16px; cursor: pointer; display: flex; align-items: center; }
.kgm-track::before {
  content: ''; position: absolute; left: 0; right: 0; height: 4px; border-radius: 2px;
  background: var(--dsw-alias-border-subtle, rgba(120,130,150,.24));
}
.kgm-fill {
  position: absolute; left: 0; height: 4px; border-radius: 2px;
  background: var(--dsw-alias-brand-primary, #4d6bfe);
  pointer-events: none;
}
.kgm-time { font-size: 11px; opacity: .6; font-variant-numeric: tabular-nums; flex: none; }
.kgm-volume { width: 64px; accent-color: #4d6bfe; }
.kgm-panel {
  position: absolute; left: 0; right: 0; bottom: calc(100% + 8px); z-index: 40;
  height: 420px; display: flex; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-subtle, rgba(120,130,150,.22));
  border-radius: 14px;
  background: var(--dsw-alias-bg-elevated, #fbfcfe);
  color: var(--dsw-alias-text-primary, #1c1f24);
  box-shadow: 0 12px 32px rgba(20, 26, 40, .16);
}
.kgm-left { width: 56%; display: flex; flex-direction: column; border-right: 1px solid var(--dsw-alias-border-subtle, rgba(120,130,150,.16)); }
.kgm-right { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.kgm-tabs { display: flex; gap: 4px; padding: 10px 12px 6px; }
.kgm-tab {
  border: 0; background: transparent; color: inherit; cursor: pointer;
  padding: 4px 10px; border-radius: 8px; font-size: 12px; opacity: .6;
}
.kgm-tab.kgm-on { opacity: 1; background: var(--dsw-alias-bg-hover, rgba(120,130,150,.14)); font-weight: 600; }
.kgm-search { display: flex; gap: 6px; padding: 0 12px 8px; }
.kgm-input {
  flex: 1; min-width: 0; height: 30px; padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-subtle, rgba(120,130,150,.26));
  border-radius: 8px; background: var(--dsw-alias-bg-base, #fff); color: inherit; font-size: 13px; outline: none;
}
.kgm-input:focus { border-color: var(--dsw-alias-brand-primary, #4d6bfe); }
.kgm-go {
  height: 30px; padding: 0 12px; border: 0; border-radius: 8px; cursor: pointer;
  background: var(--dsw-alias-brand-primary, #4d6bfe); color: #fff; font-size: 12px; font-weight: 600;
}
.kgm-go:disabled { opacity: .5; cursor: default; }
.kgm-list { flex: 1; overflow-y: auto; padding: 0 6px 10px; }
.kgm-song {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  padding: 7px 8px; border: 0; border-radius: 8px; background: transparent; color: inherit; cursor: pointer;
}
.kgm-song:hover { background: var(--dsw-alias-bg-hover, rgba(120,130,150,.12)); }
.kgm-song.kgm-current { background: rgba(77,107,254,.10); }
.kgm-song-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-song-singer { font-size: 11px; opacity: .55; max-width: 34%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-tag { flex: none; font-size: 10px; padding: 1px 5px; border-radius: 4px; background: rgba(52,168,83,.14); color: #2e9e4f; }
.kgm-tag-vip { background: rgba(220,120,40,.14); color: #c26a20; }
.kgm-hint { padding: 18px 14px; font-size: 12px; opacity: .55; line-height: 1.6; }
.kgm-lyric-head { padding: 12px 14px 4px; font-size: 12px; opacity: .6; display: flex; justify-content: space-between; gap: 8px; }
.kgm-lyric-box { flex: 1; overflow-y: auto; padding: 8px 18px 24px; scrollbar-width: thin; }
.kgm-lyric-line {
  padding: 5px 0; font-size: 13px; line-height: 1.5; opacity: .42; transition: opacity .2s;
  border-radius: 6px;
}
.kgm-lyric-line.kgm-active { opacity: 1; font-weight: 600; color: var(--dsw-alias-brand-primary, #4d6bfe); }
.kgm-w { transition: color .12s; }
.kgm-w-now { color: var(--dsw-alias-brand-primary, #4d6bfe); }
.kgm-w-done { color: var(--dsw-alias-brand-primary, #4d6bfe); }
.kgm-err {
  margin: 0 12px 8px; padding: 7px 10px; border-radius: 8px; font-size: 12px;
  background: rgba(220,80,70,.10); color: #c0392b;
}
.kgm-cookie { padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.kgm-cookie textarea {
  width: 100%; height: 92px; resize: none; padding: 8px; font-size: 11px;
  border: 1px solid var(--dsw-alias-border-subtle, rgba(120,130,150,.26));
  border-radius: 8px; background: var(--dsw-alias-bg-base, #fff); color: inherit;
  font-family: ui-monospace, Consolas, monospace; outline: none;
}
.kgm-row { display: flex; gap: 6px; }
.kgm-small { font-size: 11px; opacity: .6; line-height: 1.6; }
.kgm-dot { color: #2e9e4f; }
.kgm-off { color: #a0a6b0; }
`

    /* ------------------------------------------------------------------ */
    /* 小工具                                                               */
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
        /* 存储满了就算了 */
      }
    }

    const Icon = {
      play: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M8 5v14l11-7z' })),
      pause: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M7 5h4v14H7zM13 5h4v14h-4z' })),
      prev: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M7 6h2v12H7zM20 6l-9 6 9 6z' })),
      next: () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, h('path', { d: 'M15 6h2v12h-2zM4 6l9 6-9 6z' })),
      up: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M6 15l6-6 6 6' })),
      down: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M6 9l6 6 6-6' })),
      search: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('circle', { cx: 11, cy: 11, r: 6 }), h('path', { d: 'M20 20l-4.5-4.5' })),
      gear: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('circle', { cx: 12, cy: 12, r: 3 }), h('path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' })),
    }

    /* ------------------------------------------------------------------ */
    /* 主组件                                                               */
    /* ------------------------------------------------------------------ */
    function KugouDock() {
      const cached = useMemo(() => loadStore(), [])
      const [expanded, setExpanded] = useState(false)
      const [tab, setTab] = useState(cached.tab || 'search')
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
      const [showCookie, setShowCookie] = useState(false)
      const [cookieDraft, setCookieDraft] = useState('')
      const [volume, setVolume] = useState(typeof cached.volume === 'number' ? cached.volume : 0.8)

      const audioRef = useRef(null)
      const lyricRef = useRef(null)
      const proxyTried = useRef('')
      const liveRef = useRef({ queue, index })
      liveRef.current = { queue, index }

      /* 初始化音频对象与事件 */
      useEffect(() => {
        const a = new Audio()
        a.preload = 'auto'
        a.volume = typeof loadStore().volume === 'number' ? loadStore().volume : 0.8
        audioRef.current = a

        const onTime = () => setCur(a.currentTime || 0)
        const onMeta = () => setDur(Number.isFinite(a.duration) ? a.duration : 0)
        const onPlay = () => setPlaying(true)
        const onPause = () => setPlaying(false)
        const onEnd = () => {
          const { queue: q, index: i } = liveRef.current
          const nxt = i + 1
          if (nxt < q.length) playAtRef.current(q, nxt)
          else setPlaying(false)
        }
        const onErr = () => {
          const cur = a.currentSrc || a.src
          if (!cur) return
          if (proxyTried.current === cur) {
            setError('音频加载失败，换一首试试')
            return
          }
          proxyTried.current = cur
          const pos = a.currentTime
          a.src = API + '/audio?url=' + encodeURIComponent(cur)
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

      /* 播放列表中的第 i 首 */
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
        saveStore({ queue: list.map((s) => ({ hash: s.hash, name: s.name, singer: s.singer, duration: s.duration })) })

        let info
        try {
          info = await api(API + '/play?hash=' + encodeURIComponent(target.hash))
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
              : 'VIP 歌曲需要先在设置里粘贴酷狗 Cookie（点齿轮）',
          )
          return
        }

        const a = audioRef.current
        if (!a) return
        proxyTried.current = ''
        a.src = info.url
        a.volume = volume
        try {
          await a.play()
        } catch (e) {
          setError('浏览器拒绝播放：' + (e && e.message ? e.message : String(e)))
        }

        // 歌词：异步拉，失败不影响播放
        api(API + '/lyric?hash=' + encodeURIComponent(target.hash) + '&duration=' + (target.duration || info.duration || 0))
          .then((r) => {
            if (r && r.ok) setLyric({ lines: r.lines || [], meta: r.meta || {} })
          })
          .catch(() => {})
      }, [volume])

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
          } else {
            setResults(r.songs || [])
          }
        } catch {
          setError('搜索请求失败')
        } finally {
          setLoading(false)
        }
      }, [query])

      const openCookie = useCallback(async () => {
        setShowCookie(true)
        try {
          const r = await api(API + '/cookie')
          setHasCookie(Boolean(r && r.hasCookie))
        } catch {
          /* ignore */
        }
      }, [])

      const saveCookie = useCallback(async () => {
        try {
          const r = await api(API + '/cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: cookieDraft }),
          })
          setHasCookie(Boolean(r && r.hasCookie))
          setShowCookie(false)
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
          setCookieDraft('')
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

      /* 当前歌词行 + 自动滚动 */
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
        const top = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2
        box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }, [lineIdx, expanded])

      const progress = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0

      const renderLine = (line, i) => {
        const active = i === lineIdx
        if (!active) {
          return h(
            'div',
            { key: i, className: 'kgm-lyric-line', 'data-line': i },
            line.words.map((w) => w.text).join(''),
          )
        }
        const rel = cur * 1000 - line.start
        return h(
          'div',
          { key: i, className: 'kgm-lyric-line kgm-active', 'data-line': i },
          line.words.map((w, j) => {
            const cls =
              rel >= w.t + (w.d || 0) ? 'kgm-w kgm-w-done' : rel >= w.t ? 'kgm-w kgm-w-now' : 'kgm-w'
            return h('span', { key: j, className: cls }, w.text)
          }),
        )
      }

      const list = tab === 'search' ? results : queue

      return h(
        'div',
        { className: 'kgm-root' },
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
                  h(
                    'button',
                    { className: 'kgm-tab' + (tab === 'search' ? ' kgm-on' : ''), onClick: () => setTab('search') },
                    '搜歌',
                  ),
                  h(
                    'button',
                    { className: 'kgm-tab' + (tab === 'queue' ? ' kgm-on' : ''), onClick: () => setTab('queue') },
                    '播放队列' + (queue.length ? ' · ' + queue.length : ''),
                  ),
                  h(
                    'button',
                    { className: 'kgm-tab', style: { marginLeft: 'auto' }, onClick: openCookie, title: 'Cookie 设置' },
                    hasCookie ? '● 已登录' : '○ 未登录',
                  ),
                ),
                tab === 'search'
                  ? h(
                      'div',
                      { className: 'kgm-search' },
                      h('input', {
                        className: 'kgm-input',
                        placeholder: '搜索歌曲 / 歌手',
                        value: query,
                        onChange: (e) => setQuery(e.target.value),
                        onKeyDown: (e) => {
                          if (e.key === 'Enter') doSearch()
                        },
                      }),
                      h(
                        'button',
                        { className: 'kgm-go', onClick: doSearch, disabled: loading || !query.trim() },
                        loading ? '搜索中' : '搜索',
                      ),
                    )
                  : null,
                showCookie
                  ? h(
                      'div',
                      { className: 'kgm-cookie' },
                      h(
                        'div',
                        { className: 'kgm-small' },
                        '登录酷狗网页版后按 F12 → Application → Cookies，把整段 Cookie 粘进来。VIP 歌就能播。',
                      ),
                      h('textarea', {
                        value: cookieDraft,
                        placeholder: 'kg_mid=...; kg_dfid=...; KuGoo=...',
                        onChange: (e) => setCookieDraft(e.target.value),
                      }),
                      h(
                        'div',
                        { className: 'kgm-row' },
                        h('button', { className: 'kgm-go', onClick: saveCookie, disabled: !cookieDraft.trim() }, '保存'),
                        h('button', { className: 'kgm-btn', onClick: clearCookie, title: '清除 Cookie' }, '清除'),
                        h(
                          'button',
                          { className: 'kgm-btn', style: { marginLeft: 'auto' }, onClick: () => setShowCookie(false), title: '收起' },
                          Icon.down(),
                        ),
                      ),
                    )
                  : null,
                error ? h('div', { className: 'kgm-err' }, error) : null,
                h(
                  'div',
                  { className: 'kgm-list' },
                  tab === 'search' && !results.length && !loading
                    ? h('div', { className: 'kgm-hint' }, '输入歌名回车，挑一首开播。免费歌直接能听；VIP 歌按齿轮填 Cookie。')
                    : null,
                  tab === 'queue' && !queue.length
                    ? h('div', { className: 'kgm-hint' }, '队列还是空的，先去搜几首歌。')
                    : null,
                  list.map((s, i) =>
                    h(
                      'button',
                      {
                        key: (s.hash || 'k') + i,
                        className: 'kgm-song' + (tab === 'queue' && i === index ? ' kgm-current' : ''),
                        onClick: () => playAt(list, i),
                        title: s.name + ' - ' + s.singer,
                      },
                      h('span', { className: 'kgm-song-name' }, s.name || s.songName || '未知歌曲'),
                      h('span', { className: 'kgm-song-singer' }, s.singer || ''),
                      s.free === false
                        ? h('span', { className: 'kgm-tag kgm-tag-vip' }, 'VIP')
                        : h('span', { className: 'kgm-tag' }, '免费'),
                    ),
                  ),
                ),
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
          h(
            'button',
            { className: 'kgm-btn', onClick: () => setExpanded((v) => !v), title: expanded ? '收起' : '展开' },
            expanded ? Icon.down() : Icon.up(),
          ),
          h('div', { className: 'kgm-cover' + (playing ? ' kgm-spin' : '') }, '♫'),
          h(
            'div',
            { className: 'kgm-meta' },
            song
              ? h('div', { className: 'kgm-title' }, song.name)
              : h('div', { className: 'kgm-empty-meta' }, '酷狗 · 未播放'),
            song ? h('div', { className: 'kgm-singer' }, song.singer) : null,
          ),
          h(
            'div',
            { className: 'kgm-progress' },
            h(
              'div',
              { className: 'kgm-track', onClick: seek, title: '点击跳转' },
              h('div', { className: 'kgm-fill', style: { width: progress + '%' } }),
            ),
            h('span', { className: 'kgm-time' }, fmt(cur) + ' / ' + fmt(dur)),
          ),
          h('button', { className: 'kgm-btn', onClick: prev, disabled: !queue.length, title: '上一首' }, Icon.prev()),
          h('button', { className: 'kgm-btn', onClick: toggle, title: playing ? '暂停' : '播放' }, playing ? Icon.pause() : Icon.play()),
          h('button', { className: 'kgm-btn', onClick: next, disabled: !queue.length, title: '下一首' }, Icon.next()),
          h('input', {
            className: 'kgm-volume',
            type: 'range',
            min: 0,
            max: 1,
            step: 0.01,
            value: volume,
            onChange: changeVolume,
            title: '音量',
          }),
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
