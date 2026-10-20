/**
 * dsh-kugou-music —— Host 侧。
 *
 * 在 DSH 自带的 HTTP 服务器上挂一组 loopback-only 的接口，把酷狗的
 * 搜索 / 播放地址 / 歌词转给浏览器里的播放条。音频本身由浏览器直接
 * 连酷狗 CDN 播放，因此这里不代理音频流。
 *
 * 路由（同源，带前缀）：/kugou-music-api
 *   GET  /search?q=关键词&page=1&size=20
 *   GET  /play?hash=...
 *   GET  /lyric?hash=...&duration=秒
 *   GET  /cookie             -> { hasCookie }
 *   POST /cookie { cookie }  -> 保存/清除
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import {
  KugouError,
  fetchLyric,
  fetchPlaylist,
  resolvePlayUrl,
  searchSongs,
} from './lib/kugou.js'
import {
  allowedRoots,
  decryptAudioFile,
  extOf,
  isAllowedPath,
  isKgmPath,
  listLocalPlaylists,
} from './lib/localdb.js'

export const name = 'kugou-music'

/** 只依赖 HTTP 服务器；没有它的 profile 里插件保持不激活。 */
export const inject = ['webServer']

const ROUTE = '/kugou-music-api'

function homeDir() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
}

function cookieFile() {
  return path.join(homeDir(), 'kugou-music', 'cookie.txt')
}

function readCookie() {
  try {
    return fs.readFileSync(cookieFile(), 'utf8').trim()
  } catch {
    return ''
  }
}

function writeCookie(value) {
  const file = cookieFile()
  if (!value) {
    try {
      fs.rmSync(file, { force: true })
    } catch {
      /* ignore */
    }
    return
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, value, { mode: 0o600 })
}

function isLoopback(req) {
  const addr = req.socket?.remoteAddress || ''
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

function json(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(text)
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 64 * 1024) throw new KugouError('请求体过大', 'BODY_TOO_LARGE')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new KugouError('请求体不是合法 JSON', 'BAD_BODY')
  }
}

const MIME = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ape': 'audio/x-ape',
  '.wma': 'audio/x-ms-wma',
}

function mimeOf(ext) {
  return MIME[String(ext || '').toLowerCase()] || 'application/octet-stream'
}

/** 扫一遍允许的目录（最多两层），列出可播放的本地音频。 */
function scanLocalFiles() {
  const out = []
  const seen = new Set()
  const walk = (dir, depth) => {
    if (depth > 2 || out.length >= 500) return
    let entries = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (out.length >= 500) return
      if (e.name.startsWith('.')) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        walk(full, depth + 1)
        continue
      }
      if (!e.isFile()) continue
      const ext = extOf(e.name)
      if (!ext || seen.has(full)) continue
      seen.add(full)
      let size = 0
      try {
        size = fs.statSync(full).size
      } catch {
        /* ignore */
      }
      out.push({ path: full, name: e.name, size, ext, kgm: isKgmPath(full) })
    }
  }
  for (const root of allowedRoots()) walk(root, 0)
  return out.slice(0, 500)
}

/** 把本地音频（含酷狗加密格式）送到浏览器。 */
function serveLocalAudio(req, res, target) {
  if (!target) {
    json(res, 400, { ok: false, error: '缺少 path' })
    return
  }
  if (!isAllowedPath(target)) {
    json(res, 403, { ok: false, error: '目录不在允许范围内' })
    return
  }
  if (!fs.existsSync(target)) {
    json(res, 404, { ok: false, error: '文件不存在' })
    return
  }
  const ext = extOf(target)
  if (!ext) {
    json(res, 415, { ok: false, error: '不支持的音频格式' })
    return
  }

  if (isKgmPath(target)) {
    decryptAudioFile(target)
      .then(({ data, ext: realExt }) => {
        res.writeHead(200, {
          'Content-Type': mimeOf(realExt),
          'Content-Length': data.length,
          'Accept-Ranges': 'none',
          'Cache-Control': 'no-store',
        })
        res.end(data)
      })
      .catch((err) => {
        json(res, 500, { ok: false, error: '解密失败：' + (err instanceof Error ? err.message : String(err)) })
      })
    return
  }

  const stat = fs.statSync(target)
  const range = req.headers.range
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (m) {
      const start = m[1] ? Number(m[1]) : 0
      let end = m[2] ? Number(m[2]) : stat.size - 1
      if (start >= stat.size) {
        res.writeHead(416)
        res.end()
        return
      }
      end = Math.min(end, stat.size - 1)
      res.writeHead(206, {
        'Content-Type': mimeOf(ext),
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
      })
      fs.createReadStream(target, { start, end }).pipe(res)
      return
    }
  }
  res.writeHead(200, {
    'Content-Type': mimeOf(ext),
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
  })
  fs.createReadStream(target).pipe(res)
}

/** 挂载路由；返回卸载函数。 */
export function mountRoutes(webServer, ctx) {
  const dispose = webServer.register({
    kind: 'prefix',
    path: ROUTE,
    async handler(req, res) {
      if (!isLoopback(req)) {
        json(res, 403, { ok: false, error: '仅允许本机访问' })
        return
      }
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const sub = url.pathname.slice(ROUTE.length).replace(/^\/+/, '')
      const cookie = readCookie()

      try {
        if (sub === 'search' && req.method === 'GET') {
          const q = url.searchParams.get('q') || ''
          const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
          const size = Math.min(50, Math.max(1, Number(url.searchParams.get('size')) || 20))
          const result = await searchSongs(q, { page, pageSize: size, cookie })
          json(res, 200, { ok: true, ...result })
          return
        }
        if (sub === 'playlist' && req.method === 'GET') {
          const id = url.searchParams.get('id') || url.searchParams.get('url') || ''
          const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
          const size = Math.min(300, Math.max(1, Number(url.searchParams.get('size')) || 100))
          const result = await fetchPlaylist(id, { page, pageSize: size, cookie })
          json(res, 200, { ok: true, ...result })
          return
        }
        if (sub === 'local-lists' && req.method === 'GET') {
          const result = await listLocalPlaylists()
          json(res, 200, { ok: true, ...result })
          return
        }
        if (sub === 'local-files' && req.method === 'GET') {
          json(res, 200, { ok: true, roots: allowedRoots(), files: scanLocalFiles() })
          return
        }
        if (sub === 'local-audio' && req.method === 'GET') {
          const target = url.searchParams.get('path') || ''
          serveLocalAudio(req, res, target)
          return
        }
        if (sub === 'play' && req.method === 'GET') {
          const hash = url.searchParams.get('hash') || ''
          const albumId = url.searchParams.get('albumId') || ''
          const result = await resolvePlayUrl(hash, { cookie, albumId })
          json(res, 200, { ok: true, ...result, hasCookie: Boolean(cookie) })
          return
        }
        if (sub === 'lyric' && req.method === 'GET') {
          const hash = url.searchParams.get('hash') || ''
          const duration = Number(url.searchParams.get('duration')) || 0
          const result = await fetchLyric(hash, duration, { cookie })
          json(res, 200, { ok: true, ...result })
          return
        }
        if (sub === 'cookie' && req.method === 'GET') {
          json(res, 200, { ok: true, hasCookie: Boolean(cookie) })
          return
        }
        if (sub === 'audio' && req.method === 'GET') {
          // 兜底音频代理：浏览器直连酷狗 CDN 失败时改走这里（支持 Range）
          const target = url.searchParams.get('url') || ''
          let origin
          try {
            origin = new URL(target)
          } catch {
            json(res, 400, { ok: false, error: '非法音频地址' })
            return
          }
          const okHost =
            origin.hostname === 'kugou.com' ||
            origin.hostname.endsWith('.kugou.com') ||
            origin.hostname.endsWith('.kugou.com.cn')
          if (!/^https?:$/.test(origin.protocol) || !okHost) {
            json(res, 403, { ok: false, error: '只允许酷狗域名' })
            return
          }
          const range = req.headers.range
          const upstream = await fetch(origin.href, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              Referer: 'https://www.kugou.com/',
              ...(range ? { Range: range } : {}),
              ...(cookie ? { Cookie: cookie } : {}),
            },
          })
          const outHeaders = {
            'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
          }
          const len = upstream.headers.get('content-length')
          const cr = upstream.headers.get('content-range')
          if (len) outHeaders['Content-Length'] = len
          if (cr) outHeaders['Content-Range'] = cr
          res.writeHead(upstream.status, outHeaders)
          if (!upstream.body) {
            res.end()
            return
          }
          Readable.fromWeb(upstream.body).pipe(res)
          return
        }
        if (sub === 'cookie' && req.method === 'POST') {
          const body = await readBody(req)
          const value = typeof body?.cookie === 'string' ? body.cookie.trim() : ''
          writeCookie(value)
          json(res, 200, { ok: true, hasCookie: Boolean(value) })
          return
        }
        json(res, 404, { ok: false, error: '未知接口：' + sub })
      } catch (err) {
        const code = err instanceof KugouError ? err.code : 'INTERNAL'
        const message = err instanceof Error ? err.message : String(err)
        ctx?.logger?.warn?.(`[kugou-music] ${sub}: ${message}`)
        json(res, 502, { ok: false, error: message, code })
      }
    },
  })
  return dispose
}

export function apply(ctx) {
  const webServer = ctx.webServer ?? ctx.get?.('webServer')
  if (!webServer) return
  ctx.effect(() => mountRoutes(webServer, ctx))
}
