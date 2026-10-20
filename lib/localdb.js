/**
 * 本地酷狗数据：读客户端数据库里的歌单 / 最近播放 / 本地文件。
 *
 * 酷狗 PC 客户端把数据存在 %APPDATA%\KuGou8\KGMusicV3.db，是加密的 SQLite。
 * 这里用 @clamber_l/crypto（Project Unlock Music，MIT + Apache-2.0）的 WASM
 * 现场解密，再用 Node 自带的 node:sqlite 读表——解密结果只写到临时文件，
 * 不碰用户原始数据。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { KuGou, ready } from './umc/loader.mjs'

// WASM 是异步加载的；失败时由 ensureWasm 在调用点报错，这里先吞掉顶层拒绝
ready.catch(() => {})

/** 动态拿 node:sqlite，拿不到时让接口报错而不是整个插件加载失败。 */
let databaseSync = null
async function getDatabase() {
  if (databaseSync) return databaseSync
  let mod
  try {
    mod = await import('node:sqlite')
  } catch {
    throw new Error('当前运行环境不支持 node:sqlite')
  }
  if (typeof mod.DatabaseSync !== 'function') throw new Error('当前运行环境不支持 node:sqlite')
  databaseSync = mod.DatabaseSync
  return databaseSync
}

async function ensureWasm() {
  try {
    await ready
  } catch (err) {
    throw new Error('酷狗解密模块加载失败：' + (err instanceof Error ? err.message : String(err)))
  }
}

const PLAIN_PREFIX = 'SQLite format 3'
const SONG_COLS =
  'SongID, TitleName, SongName, MusicFileHash, MusicFileDuration, MusicFilePath, AlbumID'

let cache = { mtimeMs: -1, file: '', playlists: null }

/** 酷狗客户端数据库位置。 */
export function kugouDbPath() {
  const appdata = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  return path.join(appdata, 'KuGou8', 'KGMusicV3.db')
}

export function kugouAvailable() {
  try {
    return fs.statSync(kugouDbPath()).size > 0
  } catch {
    return false
  }
}

/** 解密到临时文件（按数据库 mtime 缓存，客户端写了才重解）。 */
async function decryptedFile() {
  const src = kugouDbPath()
  const st = fs.statSync(src)
  if (cache.mtimeMs === st.mtimeMs && cache.file && fs.existsSync(cache.file)) return cache.file

  const raw = fs.readFileSync(src)
  const buf = new Uint8Array(raw)
  const isPlain = Buffer.from(raw.subarray(0, PLAIN_PREFIX.length)).toString('latin1') === PLAIN_PREFIX
  if (!isPlain) {
    await ensureWasm()
    KuGou.decryptDatabase(buf)
  }
  const file = path.join(os.tmpdir(), `dsh-kugou-music-${process.pid}.sqlite`)
  fs.writeFileSync(file, Buffer.from(buf))
  cache = { mtimeMs: st.mtimeMs, file, playlists: null }
  return file
}

function splitTitle(title, fallbackName) {
  const t = String(title || '')
  const i = t.indexOf(' - ')
  if (i > 0) return { singer: t.slice(0, i), name: t.slice(i + 3) }
  return { singer: '', name: fallbackName || t }
}

function toSong(row) {
  const { singer, name } = splitTitle(row.TitleName, row.SongName)
  return {
    hash: String(row.MusicFileHash || '').toUpperCase(),
    name,
    singer,
    album: '',
    duration: Math.round((Number(row.MusicFileDuration) || 0) / 1000),
    albumId: row.AlbumID ? String(row.AlbumID) : '',
    free: false,
    local: Boolean(row.MusicFilePath),
  }
}

/** 读本地歌单：最近播放 + 当前账号的设备同步列表 + 本地文件。 */
export async function listLocalPlaylists({ userid = '' } = {}) {
  if (!kugouAvailable()) return { available: false, playlists: [] }
  const file = await decryptedFile()
  const DatabaseSync = await getDatabase()
  const db = new DatabaseSync(file, { readOnly: true })
  try {
    const out = []
    const uid = Number(userid) || 0

    // 最近播放
    try {
      const recent = db
        .prepare(`select ${SONG_COLS} from RecentlyPlayedItem order by LastPlayTime desc limit 300`)
        .all()
      const songs = recent.map(toSong).filter((s) => s.hash)
      if (songs.length) out.push({ id: 'recent', name: '最近播放', count: songs.length, songs })
    } catch {
      /* 表结构变了就跳过 */
    }

    // 只取当前登录账号的设备列表；没有账号信息时退回全部
    let devices = []
    if (uid) {
      try {
        devices = db
          .prepare('select DeviceListID, DeviceName from CloudDefaultListTable where UserID = ? order by SortID')
          .all(uid)
          .map((r) => ({ id: Number(r.DeviceListID), name: String(r.DeviceName || '') }))
      } catch {
        devices = []
      }
    }
    if (!devices.length) {
      try {
        devices = db
          .prepare("select name from sqlite_master where type = 'table' and name like 'DeviceDefaultList\\_%' escape '\\'")
          .all()
          .map((t) => ({ id: Number(String(t.name).replace('DeviceDefaultList_', '')), name: '' }))
          .filter((d) => d.id > 0)
      } catch {
        devices = []
      }
    }

    // 每个设备单独一个歌单（酷狗客户端里也是按设备分「默认列表」）
    try {
      const byName = new Map()
      for (const d of devices) {
        let rows = []
        try {
          rows = db
            .prepare(`select ${SONG_COLS} from "DeviceDefaultList_${Number(d.id)}" order by SortID`)
            .all()
        } catch {
          continue
        }
        const songs = rows.map(toSong).filter((s) => s.hash)
        if (!songs.length) continue
        const base = d.name || '设备 ' + d.id
        const dup = (byName.get(base) || 0) + 1
        byName.set(base, dup)
        const label = dup > 1 ? `${base} (${dup})` : base
        out.push({ id: 'device_' + d.id, name: label, count: songs.length, songs, device: true })
      }
    } catch {
      /* ignore */
    }

    // 本地文件（客户端里"本地音乐"的索引）
    try {
      const local = db.prepare(`select ${SONG_COLS} from LocalFile order by SortID limit 300`).all()
      const songs = local.map(toSong).filter((s) => s.hash)
      if (songs.length) out.push({ id: 'local', name: '本地文件', count: songs.length, songs })
    } catch {
      /* ignore */
    }

    // 云歌单只有名字（歌曲在服务器，本地没缓存），列出来让用户知道有这些
    let cloud = []
    try {
      const userTable = db
        .prepare("select name from sqlite_master where type = 'table' and name like 'MyCloudSongList\\_%' escape '\\'")
        .all()
      if (userTable.length) {
        const rows = db
          .prepare(`select SongListID, SongListName from "${userTable[0].name}" order by SongListSortId`)
          .all()
        cloud = rows.map((r) => ({ id: String(r.SongListID), name: String(r.SongListName || '') }))
      }
    } catch {
      /* ignore */
    }

    return { available: true, playlists: out, cloudLists: cloud }
  } finally {
    db.close()
  }
}

/* ------------------------------------------------------------------ */
/* 本地音频文件                                                        */
/* ------------------------------------------------------------------ */

const AUDIO_EXT = new Set(['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.wav', '.ape', '.wma'])
/** 酷狗加密格式（需要 WASM 解密后才能播）。 */
export const KGM_EXT = new Set(['.kgm', '.kgma', '.vpr', '.kgg', '.kgm.flac'])

/** 允许访问的本地目录（默认家目录下的常见位置）。 */
export function allowedRoots() {
  const home = os.homedir()
  const extra = String(process.env.DSH_KUGOU_MUSIC_DIRS || '')
    .split(path.delimiter)
    .map((s) => s.trim())
    .filter(Boolean)
  const roots = [path.join(home, 'Desktop'), path.join(home, 'Downloads'), path.join(home, 'Music'), path.join(home, 'Documents'), 'D:\\KuGou']
  return [...new Set([...roots, ...extra])].map((p) => path.resolve(p))
}

/** 校验路径是否在允许目录内。 */
export function isAllowedPath(target) {
  const abs = path.resolve(target)
  return allowedRoots().some((root) => abs === root || abs.startsWith(root + path.sep))
}

export function extOf(file) {
  const lower = String(file || '').toLowerCase()
  const last = path.extname(lower)
  if (KGM_EXT.has(last)) return last
  return AUDIO_EXT.has(last) ? last : ''
}

/** 是不是酷狗加密格式。 */
export function isKgmPath(file) {
  return KGM_EXT.has(path.extname(String(file || '').toLowerCase()))
}

/**
 * 解密酷狗加密音频，返回 { data, ext }。
 * 不是加密格式会抛错。
 */
export async function decryptAudioFile(file) {
  const raw = fs.readFileSync(file)
  const buf = new Uint8Array(raw)
  await ensureWasm()
  // v4 及以前：头部直接给出解密器
  const head = buf.subarray(0, Math.min(0x400, buf.length))
  const cipher = KuGou.from_header(head)
  // 数据从 offset 开始（通常 0x400），整段原地解密
  cipher.decrypt(buf, 0)
  // 解密后找真实扩展名
  let ext = '.mp3'
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) ext = '.flac'
  else if (buf.subarray(4, 8).toString() === 'ftyp') ext = '.m4a'
  else if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) ext = '.ogg'
  return { data: Buffer.from(buf), ext }
}
