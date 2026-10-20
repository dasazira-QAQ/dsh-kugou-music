# dsh-kugou-music · 酷狗音乐 for DeepSeek Harness

在 DSH 工作台里搜歌、读你自己的本地歌单、放歌、看逐字歌词。播放条常驻在输入框上方，点一下展开完整面板。

> 非官方插件。接口来自酷狗网页版公开接口，仅供个人学习/自用，请尊重版权。

## 功能

- 🔍 **搜索**：歌名 / 歌手，列表直接点播
- 📚 **本地歌单**：直接读你酷狗 PC 客户端的数据库，列出「最近播放」「设备列表」「本地文件」
- 🔗 **歌单链接导入**：粘贴酷狗歌单分享链接，自动翻页拉全曲目
- 🎵 **本地文件播放**：扫桌面 / 下载 / 音乐 / `D:\KuGou`，连同 `.kgm` 加密格式一起播
- 🎤 **逐字歌词**：优先 KRC（和客户端同精度），回退 LRC，本地文件按歌名自动匹配
- 🎨 **外观自定义**：白 / 黑两套玻璃主题 + 8 个预设色 + 自定义 RGB 色盘
- 🔐 **可选 Cookie**：填酷狗网页版 Cookie 后 VIP / 付费歌也能播
- 🖥️ **全程本机**：Host 只注册 `127.0.0.1` 路由，音频直连酷狗 CDN 或本地文件

## 安装

插件是标准 DSH bundle（`dsh.bundle.patch` + `dsh.client`）。

```bash
# 从本地目录安装
dsh plugin --profile <你的 profile> add "file:/绝对路径/dsh-kugou-music"
```

或手动：把本目录放进 profile 的 `node_modules/`，在 profile `package.json` 的
`dependencies` 加 `"dsh-kugou-music": "link:<绝对路径>"`、`dsh.profile.bundles` 加 `"dsh-kugou-music"`。
装完重启 DSH。

## 使用

1. 输入框上方出现播放条 → 点左侧 `^` 展开
2. **本地歌单**页签直接列出酷狗客户端里的歌单（需要本机装着酷狗 PC 版）
3. **链接导入**贴歌单分享链接，例如 `https://www.kugou.com/yy/special/single/3794830.html`
4. **齿轮 → 外观**：切主题、换颜色
5. **齿轮 → 账号**：填 Cookie

## 本地歌单是怎么读出来的

酷狗 PC 把数据存在 `%APPDATA%\KuGou8\KGMusicV3.db`，是**加密的 SQLite**。插件做了三步：

1. 用 [Project Unlock Music](https://git.unlock-music.dev/um/web) 的 WASM（`@clamber_l/crypto`）解密数据库
2. 解密结果写到系统临时文件（不动原始数据）
3. 用 Node 自带的 `node:sqlite` 读 `RecentlyPlayedItem`、`DeviceDefaultList_*`、`LocalFile`

按数据库 mtime 缓存，客户端写库后自动重解。首次约 200ms。

> 云歌单（「我喜欢」等）在本地只存名字，歌曲在服务器上，所以只列名字；要听内容请用链接导入或 Cookie。

## KGM 解密

`.kgm / .kgma / .vpr / .kgg` 会在 Host 侧用同一套 WASM 现场解密后流式返回，不落盘。
注意：酷狗现在很多「下载」实际给的是明文文件（例如无损 `.flac` 本身就是标准 FLAC），这种直接播放即可。

## Cookie 怎么拿（给找不到 Application 的人）

1. 浏览器打开 `kugou.com`，登录账号
2. 按 `F12`（笔记本 `Fn+F12`，或 `Ctrl+Shift+I`）
3. 在开发者工具顶部找 **Application**，中文界面叫 **「应用」**
   - 找不到？点顶部标签栏最右边的 `»` 展开更多
   - 还找不到？点右上角 `⋮` → More tools → Application
4. 左侧 `Storage → Cookies → https://www.kugou.com`
5. Filter 框输入 `kg_` 过滤，选中全部行复制
6. 粘成 `name=value; name2=value2` 填进插件，保存

偷懒：Console 里执行 `document.cookie`（拿不到 HttpOnly 项，偶尔不够用）。

Cookie 只存本机 `~/.dsh/kugou-music/cookie.txt`（权限 600）。

## 接口

Host 在 DSH 自带 HTTP server 注册 `/kugou-music-api`（仅 loopback）：

```
GET  /search?q=&page=&size=
GET  /playlist?id=&size=
GET  /play?hash=
GET  /lyric?hash=&duration=
GET  /local-lists                 本地歌单（解密数据库）
GET  /local-files                 扫描本地音频
GET  /local-audio?path=           本地音频流（含 KGM 解密）
GET  /cookie                      -> { hasCookie }
POST /cookie { cookie }           保存/清除
GET  /audio?url=                  酷狗 CDN 兜底代理
```

## 实现

| 环节 | 做法 |
|---|---|
| 搜索 | `songsearch.kugou.com/song_search_v2` |
| 歌单 | `m.kugou.com/plist/list/<id>`（每页 10 条，自动翻页） |
| 播放地址 | `m.kugou.com/app/i/getSongInfo.php`（匿名只给免费歌） |
| 歌词 | `krcs.kugou.com/search` → `lyrics.kugou.com/download` |
| KRC 解密 | 跳过 `krc1` 头 → 16 字节循环异或 → zlib inflate |
| 本地数据库 | WASM 解密 → 临时 SQLite → `node:sqlite` |
| 前端 | 注册到 `conversation.input.dock` 的 React 组件 |

## 已知限制

- 匿名状态下 VIP / 付费歌拿不到播放地址（酷狗侧限制）
- 播放地址有时效，长时间暂停后可能失效
- 云歌单歌曲不在本地，只能看到名字
- 只适配 Web 版（`platform: "web"`）

## 第三方

`lib/umc/` 来自 [Project Unlock Music](https://git.unlock-music.dev/um/web) 的 `@clamber_l/crypto` 0.1.12（MIT + Apache-2.0），许可证随附。

## License

MIT
