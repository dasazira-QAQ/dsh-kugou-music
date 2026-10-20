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
import crypto from 'node:crypto'
import zlib from 'node:zlib'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'

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

function headers(cookie, ua = UA) {
  const h = {
    'User-Agent': ua,
    Referer: 'https://www.kugou.com/',
    Accept: 'application/json, text/plain, */*',
  }
  if (cookie) h.Cookie = cookie
  return h
}

async function getJSON(url, cookie, timeoutMs = 12000, ua = UA) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: headers(cookie, ua), signal: ctrl.signal })
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

async function getText(url, cookie, timeoutMs = 12000, ua = UA) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: headers(cookie, ua), signal: ctrl.signal })
    if (!res.ok) throw new KugouError(`酷狗页面 HTTP ${res.status}`, 'HTTP_STATUS')
    return await res.text()
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

/** 读 cookie 里某一项。 */
export function cookieValue(cookie, name) {
  const m = new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)').exec(
    String(cookie || ''),
  )
  return m ? m[1] : ''
}

/** 酷狗昵称用 %uXXXX 形式编码，这里转回来。 */
function decodeKuGooName(value) {
  return String(value || '').replace(/%u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** 从 KuGoo cookie 里拆出登录凭据。 */
export function parseKuGooCredential(cookie) {
  const raw = cookieValue(cookie, 'KuGoo')
  if (!raw) return { userid: '', token: '', nick: '', pic: '', mid: '', dfid: '' }
  const q = new URLSearchParams(raw)
  return {
    userid: q.get('KugooID') || '',
    token: q.get('t') || '',
    nick: decodeKuGooName(q.get('NickName')),
    pic: q.get('Pic') || '',
    mid: cookieValue(cookie, 'kg_mid'),
    dfid: cookieValue(cookie, 'kg_dfid'),
  }
}

const SIGN_SECRET = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'

/** 酷狗 web 接口签名：md5(secret + 排序后的 k=v 拼接 + secret)。 */
export function kugouSign(params) {
  const keys = Object.keys(params).sort()
  const raw = keys.map((k) => `${k}=${params[k]}`).join('')
  return crypto.createHash('md5').update(SIGN_SECRET + raw + SIGN_SECRET).digest('hex')
}

/** 登录态下取 VIP 播放地址（wwwapi play/songinfo + 签名）。 */
async function resolveVipUrl(hash, albumId, cred, cookie) {
  const params = {
    srcappid: '2919',
    clientver: '20000',
    clienttime: String(Date.now()),
    mid: cred.mid || cred.dfid || '',
    uuid: cred.mid || cred.dfid || '',
    dfid: cred.dfid || '',
    appid: '1014',
    platid: '4',
    hash,
    album_id: String(albumId || ''),
    token: cred.token,
    userid: cred.userid,
  }
  const qs = new URLSearchParams(params).toString()
  const url = `https://wwwapi.kugou.com/play/songinfo?${qs}&signature=${kugouSign(params)}`
  const data = await getJSON(url, cookie)
  const playUrl = data?.data?.play_url || data?.data?.url || data?.url || ''
  return {
    url: playUrl,
    duration: Math.round((Number(data?.data?.timelength) || 0) / 1000),
    bitrate: Number(data?.data?.bitrate) || 0,
    ext: data?.data?.extname || 'mp3',
    vip: true,
  }
}

/** 取播放地址。免费歌走匿名接口；有登录 Cookie 时再试 VIP 接口。 */
export async function resolvePlayUrl(hash, { cookie, albumId } = {}) {
  if (!hash) throw new KugouError('缺少 hash', 'BAD_PARAM')
  const url =
    'https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=' + encodeURIComponent(hash)
  const data = await getJSON(url, cookie)
  const playUrl = typeof data?.url === 'string' ? data.url : ''
  const anon = {
    url: playUrl,
    duration: Number(data?.timeLength) || 0,
    bitrate: Number(data?.bitRate) || 0,
    ext: data?.extName || 'mp3',
    songName: data?.fileName || data?.songName || '',
    singer: data?.author_name || data?.singerName || '',
    // 有的歌只给试听片段
    trial: Boolean(playUrl) && Number(data?.timeLength) > 0 && Number(data?.timeLength) < 30,
  }
  if (playUrl) return anon

  const cred = parseKuGooCredential(cookie)
  if (!cred.token) return anon
  try {
    const vip = await resolveVipUrl(hash, albumId, cred, cookie)
    return vip.url ? { ...vip, songName: anon.songName, singer: anon.singer } : anon
  } catch {
    return anon
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

/** 从歌单链接/ID 里抠出 specialid。 */
export function parsePlaylistId(input) {
  const s = String(input || '').trim()
  if (/^\d{4,}$/.test(s)) return s
  const patterns = [
    /special\/single\/(\d{4,})/i,
    /(?:specialid|global_collection_id|collection_id)["'\s:=/]+(\d{4,})/i,
    /(?:songlist|plist|playlist)\/(?:list\/)?(\d{4,})/i,
    /\/single\/(\d{4,})/i,
    /[?&](?:id|sid)=(\d{4,})/i,
  ]
  for (const re of patterns) {
    const m = re.exec(s)
    if (m) return m[1]
  }
  return ''
}

/**
 * 展开酷狗分享短链 / 分享页：跟随跳转，从最终 URL 里拿 zlist 参数。
 * 新版分享（t1.kugou.com/xxxx）会跳到 share/zlist.html?listid=&uid=&sign=...
 */
async function resolveShareLink(input, cookie) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(input, { headers: headers(cookie, MOBILE_UA), signal: ctrl.signal, redirect: 'follow' })
    const finalUrl = res.url || ''
    const q = new URL(finalUrl).searchParams
    const listid = q.get('listid') || ''
    const uid = q.get('uid') || ''
    if (listid && uid) {
      return {
        id: '',
        name: '',
        share: {
          listid,
          uid,
          sign: q.get('sign') || '',
          t: q.get('_t') || '',
          type: q.get('type') || '0',
          collection: q.get('global_collection_id') || '',
          chain: q.get('chain') || '',
        },
      }
    }
    let id = parsePlaylistId(finalUrl)
    if (id) return { id, name: '' }
    const html = await res.text()
    id = parsePlaylistId(html)
    if (!id) {
      const m = /"(?:specialid|global_collection_id)"\s*:\s*"?(\d{4,})"?/i.exec(html)
      if (m) id = m[1]
    }
    const title = /<title>([^<]*)<\/title>/i.exec(html)
    return { id, name: title ? title[1].trim() : '' }
  } catch {
    return { id: '', name: '' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 拉「分享歌单」（m3ws zlist）。参数来自分享链接，签名规则同 infSign：
 * md5(secret + 排序后的 k=v 拼接 + secret)，默认带 srcappid/clientver/clienttime/mid/uuid/dfid。
 */
async function fetchSharedPlaylist(link, { pageSize = 500, cookie } = {}) {
  const cred = parseKuGooCredential(cookie)
  const mid = cred.mid || String(Date.now())
  const dfid = cred.dfid || '-'
  const all = []
  let name = ''
  for (let page = 1; page <= 10; page++) {
    const now = Date.now()
    const params = {
      srcappid: '2919',
      clientver: '20000',
      clienttime: now,
      mid,
      uuid: now,
      dfid,
      listid: link.listid,
      type: link.type || '0',
      uid: link.uid,
      sign: link.sign,
      _t: link.t,
      pagesize: '100',
      page: String(page),
      appid: '1014',
      ...(link.chain ? { chain: link.chain } : {}),
      ...(link.collection ? { global_collection_id: link.collection } : {}),
    }
    const keys = Object.keys(params).sort()
    const signature = crypto
      .createHash('md5')
      .update(SIGN_SECRET + keys.map((k) => `${k}=${params[k]}`).join('') + SIGN_SECRET)
      .digest('hex')
    const url = `https://m3ws.kugou.com/v2/zlist/list?${new URLSearchParams({ ...params, signature })}`
    const data = await getJSON(url, cookie, 15000, MOBILE_UA)
    const info = data?.list
    if (!name && info && typeof info.name === 'string') name = info.name
    const arr = Array.isArray(info?.info) ? info.info : []
    all.push(...arr)
    if (arr.length < 100 || all.length >= pageSize) break
  }
  if (!all.length) {
    throw new KugouError('分享链接里没有歌曲（歌单可能是空的，或链接已失效）', 'PLAYLIST_EMPTY')
  }
  const songs = all.slice(0, pageSize).map((s) => {
    const full = String(s.name || '')
    const dash = full.indexOf(' - ')
    const tp = s.trans_param || {}
    // 分享接口不返回 pay_type；musicpack_advance=1 是「音乐包超前」，即 VIP 歌
    const vip = Number(tp.musicpack_advance) === 1
    return {
      hash: String(s.hash || '').toUpperCase(),
      name: dash > 0 ? full.slice(dash + 3) : full,
      singer: dash > 0 ? full.slice(0, dash) : '',
      album: '',
      duration: Math.round((Number(s.timelen) || 0) / 1000),
      albumId: s.album_id ? String(s.album_id) : '',
      payType: vip ? 3 : 0,
      free: !vip,
      privilege: 0,
      cover: '',
    }
  }).filter((s) => s.hash)
  return { id: 'share_' + link.listid, name: name || '分享歌单 ' + link.listid, total: songs.length, songs }
}

/** 拉取酷狗歌单（公开歌单不需要登录；新版分享短链走 zlist 接口）。 */
export async function fetchPlaylist(playlistId, { pageSize = 200, cookie } = {}) {
  const input = String(playlistId || '').trim()
  let id = parsePlaylistId(input)
  if (!id && /^https?:\/\//i.test(input)) {
    // 短链 / 分享页：展开后再看是新版分享还是老版 specialid
    const resolved = await resolveShareLink(input, cookie)
    if (resolved.share) return fetchSharedPlaylist(resolved.share, { pageSize: Math.max(pageSize, 200), cookie })
    id = resolved.id
  }
  if (!id) {
    throw new KugouError('链接里没找到歌单 ID。请确认复制的是「歌单分享」链接（不是单曲），链接别过期', 'BAD_PARAM')
  }

  const pageUrl = (p) =>
    `https://m.kugou.com/plist/list/${encodeURIComponent(id)}?json=true&page=${p}&pagesize=10`

  const first = await getJSON(pageUrl(1), cookie, 15000, MOBILE_UA)
  const list = first?.list?.list
  const info = Array.isArray(list?.info) ? list.info : []
  const total = Number(list?.total) || info.length
  if (!info.length && !total) {
    throw new KugouError('这个歌单拉不到内容：可能是私密歌单（只在你自己账号里可见），也可能是电台/专辑链接', 'PLAYLIST_EMPTY')
  }

  const raw = [...info]
  const perPage = Math.max(1, info.length)
  const wanted = Math.min(total, Math.max(perPage, Number(pageSize) || 200))
  const pages = Math.ceil(wanted / perPage)
  for (let p = 2; p <= pages && p <= 40; p++) {
    try {
      const next = await getJSON(pageUrl(p), cookie, 15000, MOBILE_UA)
      const nextInfo = next?.list?.list?.info
      if (Array.isArray(nextInfo) && nextInfo.length) raw.push(...nextInfo)
      else break
    } catch {
      break
    }
  }

  const songs = raw.slice(0, wanted).map((s) => {
    const filename = String(s.filename || '')
    const dash = filename.indexOf(' - ')
    const singer = dash > 0 ? filename.slice(0, dash) : ''
    const name = dash > 0 ? filename.slice(dash + 3) : filename
    const payType = Number(s.pay_type) || 0
    return {
      hash: String(s.hash || '').toUpperCase(),
      name,
      singer,
      album: '',
      duration: Number(s.duration) || 0,
      albumId: s.album_id ? String(s.album_id) : '',
      payType,
      free: payType === 0,
      privilege: Number(s.privilege) || 0,
      cover: '',
    }
  }).filter((s) => s.hash)

  return {
    id,
    name: (await fetchPlaylistName(id, cookie)) || '歌单 ' + id,
    total,
    songs,
  }
}

/** 从歌单网页 title 里取歌单名（接口本身不给名字）。 */
async function fetchPlaylistName(id, cookie) {
  try {
    const html = await getText(`https://www.kugou.com/yy/special/single/${encodeURIComponent(id)}.html`, cookie)
    const m = /<title>([^<]*)<\/title>/.exec(html)
    if (!m) return ''
    return m[1].replace(/_[^_]*_乐库频道_酷狗网$/, '').replace(/_酷狗网$/, '').trim()
  } catch {
    return ''
  }
}

