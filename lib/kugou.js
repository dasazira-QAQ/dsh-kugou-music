/**
 * 酷狗音乐接口封装（Host 侧纯函数，可在 node 里直接单测）。
 *
 * 只用酷狗自己的公开 Web 接口：
 *  - 搜索   songsearch.kugou.com/song_search_v2
 *  - 播放   m.kugou.com/app/i/getSongInfo.php
 *  - 歌词   krcs.kugou.com/search -> lyrics.kugou.com/download
 *
 * 匿名请求只能拿到免费歌（PayType 0）的播放地址；付费/VIP 歌需要用户
 * 自己在插件里粘贴酷狗网页版 Cookie。
 */
import zlib from 'node:zlib'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const KRC_KEY = [
  0x40, 0x47, 0x61, 0x77, 0x5e, 0x32, 0x74, 0x47,
  0x51, 0x36, 0x31, 0x2d, 0xce, 0xd2, 0x6e, 0x69,
]

export class KugouError extends Error {
  constructor(message, code = 'KUGOU_ERROR') {
    super(message)
    this.code = code
  }
}

function headers(cookie) {
  const h = {
    'User-Agent': UA,
    Referer: 'https://www.kugou.com/',
    Accept: 'application/json, text/plain, */*',
  }
  if (cookie) h.Cookie = cookie
  return h
}

async function getJSON(url, cookie, timeoutMs = 12000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: headers(cookie), signal: ctrl.signal })
    if (!res.ok) throw new KugouError(`酷狗接口 HTTP ${res.status}`, 'HTTP_STATUS')
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      throw new KugouError('酷狗接口返回了非 JSON 内容', 'BAD_JSON')
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw new KugouError('酷狗接口超时', 'TIMEOUT')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** 搜索歌曲。返回精简后的列表。 */
export async function searchSongs(keyword, { page = 1, pageSize = 20, cookie } = {}) {
  const kw = String(keyword ?? '').trim()
  if (!kw) return { total: 0, songs: [] }
  const url =
    'https://songsearch.kugou.com/song_search_v2' +
    `?keyword=${encodeURIComponent(kw)}` +
    `&page=${page}&pagesize=${pageSize}` +
    '&platform=WebFilter&userid=-1&clientver=2000&iscorrection=1&privilege_filter=0&filter=10'
  const data = await getJSON(url, cookie)
  const lists = data?.data?.lists
  if (!Array.isArray(lists)) {
    throw new KugouError(data?.error_msg || '搜索失败', 'SEARCH_FAILED')
  }
  const songs = lists.map((s) => ({
    hash: s.FileHash,
    name: s.SongName || s.FileName || '',
    singer: s.SingerName || '',
    album: s.AlbumName || '',
    duration: Number(s.Duration) || 0,
    albumId: s.AlbumID ? String(s.AlbumID) : '',
    payType: Number(s.PayType) || 0,
    // 0 = 免费可播，>0 = 付费/VIP
    free: (Number(s.PayType) || 0) === 0,
    privilege: Number(s.Privilege) || 0,
    cover: '',
  }))
  return { total: Number(data?.data?.total) || songs.length, songs }
}

/** 取播放地址。返回 { url, duration, bitrate, ext }。VIP 歌匿名时 url 为空。 */
export async function resolvePlayUrl(hash, { cookie } = {}) {
  if (!hash) throw new KugouError('缺少 hash', 'BAD_PARAM')
  const url =
    'https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=' + encodeURIComponent(hash)
  const data = await getJSON(url, cookie)
  const playUrl = typeof data?.url === 'string' ? data.url : ''
  return {
    url: playUrl,
    duration: Number(data?.timeLength) || 0,
    bitrate: Number(data?.bitRate) || 0,
    ext: data?.extName || 'mp3',
    songName: data?.fileName || data?.songName || '',
    singer: data?.author_name || data?.singerName || '',
    // 有的歌只给试听片段
    trial: Boolean(playUrl) && Number(data?.timeLength) > 0 && Number(data?.timeLength) < 30,
  }
}

/** 解密 KRC：跳 4 字节 "krc1" -> 16 字节循环异或 -> zlib inflate。 */
export function decodeKrc(base64) {
  const raw = Buffer.from(base64, 'base64')
  if (raw.subarray(0, 4).toString() === 'krc1') {
    const body = raw.subarray(4)
    const out = Buffer.alloc(body.length)
    for (let i = 0; i < body.length; i++) out[i] = body[i] ^ KRC_KEY[i % 16]
    return zlib.inflateSync(out).toString('utf8')
  }
  // 少数情况返回的就是明文
  return raw.toString('utf8')
}

/** 把 KRC 文本解析成逐字歌词行。 */
export function parseKrcText(text) {
  const lines = []
  let meta = {}
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const tag = /^\[(ti|ar|al|by|offset|length):(.*)\]$/.exec(trimmed)
    if (tag) {
      meta[tag[1]] = tag[2]
      continue
    }
    const head = /^\[(\d+),(\d+)\](.*)$/.exec(trimmed)
    if (!head) continue
    const startMs = Number(head[1])
    const durMs = Number(head[2])
    const words = []
    const re = /<(\d+),(\d+),0>([^<]*)/g
    let m
    while ((m = re.exec(head[3])) !== null) {
      if (!m[3]) continue
      words.push({ t: Number(m[1]), d: Number(m[2]), text: m[3] })
    }
    if (!words.length) {
      const plain = head[3].replace(/<\d+,\d+,\d+>/g, '').trim()
      if (!plain) continue
      words.push({ t: 0, d: durMs, text: plain })
    }
    lines.push({ start: startMs, duration: durMs, words })
  }
  return { meta, lines }
}

/** 解析普通 LRC（KRC 拿不到时的回退）。 */
export function parseLrcText(text) {
  const lines = []
  let meta = {}
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const tag = /^\[(ti|ar|al|by|offset):(.*)\]$/.exec(trimmed)
    if (tag) {
      meta[tag[1]] = tag[2]
      continue
    }
    const re = /^\[(\d+):(\d+)(?:[.:](\d+))?\](.*)$/
    const m = re.exec(trimmed)
    if (!m) continue
    const startMs = Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number((m[3] || '0').padEnd(3, '0').slice(0, 3))
    const content = m[4].trim()
    if (!content) continue
    lines.push({ start: startMs, duration: 0, words: [{ t: 0, d: 0, text: content }] })
  }
  lines.sort((a, b) => a.start - b.start)
  // 用下一行时间补时长，方便前端做进度高亮
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1]
    lines[i].duration = next ? Math.max(0, next.start - lines[i].start) : 4000
  }
  return { meta, lines }
}

/** 搜歌词 + 下载 + 解密，返回 { format, meta, lines }。 */
export async function fetchLyric(hash, durationSec, { cookie } = {}) {
  if (!hash) throw new KugouError('缺少 hash', 'BAD_PARAM')
  const searchUrl =
    'https://krcs.kugou.com/search' +
    `?ver=1&man=yes&client=mobi&keyword=&duration=${encodeURIComponent(durationSec || 0)}` +
    `&hash=${encodeURIComponent(hash)}`
  const found = await getJSON(searchUrl, cookie)
  const candidates = Array.isArray(found?.candidates) ? found.candidates : []
  // 优先官方歌词，其次第一个
  const pick = candidates.find((c) => c.product_from === '官方推荐歌词') || candidates[0]
  if (!pick) return { format: 'none', meta: {}, lines: [] }

  for (const fmt of ['krc', 'lrc']) {
    const dlUrl =
      'https://lyrics.kugou.com/download' +
      `?ver=1&client=pc&id=${encodeURIComponent(pick.id)}&accesskey=${encodeURIComponent(pick.accesskey)}` +
      `&fmt=${fmt}&charset=utf8`
    try {
      const dl = await getJSON(dlUrl, cookie)
      const content = typeof dl?.content === 'string' ? dl.content : ''
      if (!content) continue
      const text = fmt === 'krc' ? decodeKrc(content) : Buffer.from(content, 'base64').toString('utf8')
      const parsed = fmt === 'krc' ? parseKrcText(text) : parseLrcText(text)
      if (parsed.lines.length) {
        return {
          format: fmt,
          meta: {
            title: parsed.meta.ti || pick.song || '',
            artist: parsed.meta.ar || pick.singer || '',
            // krc 自带逐字精度
            wordByWord: fmt === 'krc',
          },
          lines: parsed.lines,
        }
      }
    } catch {
      /* 换下一种格式 */
    }
  }
  return { format: 'none', meta: {}, lines: [] }
}
