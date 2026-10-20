# dsh-kugou-music · 酷狗音乐 for DeepSeek Harness

在 DSH 工作台里直接搜歌、放歌、看逐字歌词。播放条常驻在输入框上方，点一下展开完整面板。

> 非官方插件。接口来自酷狗网页版公开接口，仅供个人学习/自用，请尊重版权。

## 功能

- 🔍 搜索：歌名 / 歌手，列表直接点播
- ▶️ 常驻播放条：封面旋转、进度拖动、上一首/下一首、音量
- 🎤 歌词：优先 **KRC 逐字歌词**（和酷狗客户端同精度），拿不到时回退普通 LRC
- 🎵 队列：搜到的歌自动进队列，放完自动下一首
- 🔐 可选 Cookie：填入酷狗网页版 Cookie 后，VIP/付费歌也可播
- 🖥️ 全程本机：Host 只注册 `127.0.0.1` 可访问的路由，音频直连酷狗 CDN

## 安装

插件是一个标准 DSH bundle（`dsh.bundle.patch` + `dsh.client`）。

```bash
# 从本地目录安装（当前开发版）
dsh plugin --profile <你的 profile> add "file:/绝对路径/dsh-kugou-music"
```

或者把本目录拷进 profile 的 `node_modules/`，并在 profile `package.json` 的
`dependencies` 里加 `"dsh-kugou-music": "link:<绝对路径>"`、`dsh.profile.bundles` 里加 `"dsh-kugou-music"`。
装完重启 DSH。

## 使用

1. 输入框上方出现播放条 → 点左侧 `^` 展开面板
2. 输入歌名回车 → 点歌曲开播
3. 右侧歌词随播放自动滚动、逐字高亮
4. 想听 VIP 歌：点面板右上角 `○ 未登录` → 粘贴 Cookie → 保存

### Cookie 怎么拿

1. 浏览器打开 [kugou.com](https://www.kugou.com) 并登录（有 VIP 更好）
2. `F12` → Application（应用）→ Cookies → `https://www.kugou.com`
3. 全选复制成 `k1=v1; k2=v2` 的形式，或直接 F12 Console 里 `document.cookie`（拿不到 HttpOnly 的项，够用）
4. 粘贴进插件设置，保存

Cookie 存在本机 `~/.dsh/kugou-music/cookie.txt`（权限 600），不会上传任何地方。

## 实现

| 环节 | 做法 |
|---|---|
| 搜索 | `songsearch.kugou.com/song_search_v2` |
| 播放地址 | `m.kugou.com/app/i/getSongInfo.php`（匿名只给免费歌） |
| 歌词 | `krcs.kugou.com/search` → `lyrics.kugou.com/download` |
| KRC 解密 | 跳过 `krc1` 头 → 16 字节循环异或 → zlib inflate |
| 前端 | 注册到 `conversation.input.dock` 的 React 组件 |
| 通信 | Host 在 DSH 自带 HTTP server 注册 `/kugou-music-api` 前缀路由，前端同源 `fetch` |

接口（Host，仅 loopback）：

```
GET  /kugou-music-api/search?q=&page=&size=
GET  /kugou-music-api/play?hash=
GET  /kugou-music-api/lyric?hash=&duration=
GET  /kugou-music-api/cookie            -> { hasCookie }
POST /kugou-music-api/cookie { cookie } -> 保存/清除
GET  /kugou-music-api/audio?url=        -> 音频兜底代理（只放行 *.kugou.com）
```

## 已知限制

- 匿名状态下 **VIP/付费歌拿不到播放地址**（接口返回空 url），这是酷狗侧的限制，不是插件 bug。
- 播放地址有时效（URL 里带时间戳），长时间暂停后可能失效，重新点播即可。
- 歌词并非每首歌都有 KRC，纯音乐/冷门歌可能只有 LRC 或没有。
- 只做了 Web 版（`platform: "web"`），TUI/Desktop 未适配。

## License

MIT
