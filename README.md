# dsh-kugou-music · 酷狗音乐 for DeepSeek Harness

在 DSH 工作台里搜歌、读你本机的酷狗歌单、播放、看逐字歌词和翻译。两套 UI 任选：输入框播放条 / 左侧边栏，可拖动、可收起成圆形气泡。

> 非官方插件。所有接口来自酷狗公开 Web 接口，仅供个人学习自用，请尊重版权。

## 功能

**播放**

- 搜索歌曲 / 歌手，点哪首只把哪首加进队列
- 播放模式：列表循环 / 顺序播放 / 随机播放（随机模式「上一首」会回到真正播过的那首）
- 队列持久化，重启 DSH 还在
- 音量、进度拖动、上一首 / 下一首
- 自定义全局热键：播放暂停 / 上一首 / 下一首，支持组合键；可设置打字时是否响应

**歌单**

- 直接读本机酷狗客户端数据库（自动解密），列出当前账号各设备的列表、最近播放、本地文件
- 粘贴酷狗歌单分享链接（含 `t1.kugou.com` 短链）导入，自动翻页
- 导入后可一键「替换列表」或「加入列表」（自动去重）
- VIP / 免费标签（分享接口没有 pay_type 时用 `musicpack_advance` 推断）

**歌词**

- KRC 逐字歌词，普通歌回退 LRC
- 酷狗自带翻译（KRC 的 `[language:]` 段，`type: 1`）
- 无翻译时提示「暂无翻译」
- 歌词跟随播放高亮、自动滚动

**界面**

- 两套 UI：输入框播放条 / 左侧边栏（设置里切换，切换不中断播放）
- 播放条可锁定 / 解锁拖动 / 复位
- 侧边栏可收起为圆形气泡，气泡也能锁定和拖动
- 气泡歌词行数（1-4）与字号（10-16px）可调
- 白 / 黑两套玻璃主题；8 个预设色 + 自定义色盘
- 背景：毛玻璃 / 完全透明
- 可把歌词条显示在左侧边栏（工作文件夹下方）

**账号**

- 填酷狗网页版 Cookie 后可播 VIP / 付费歌
- 显示酷狗头像、昵称、UID

## 安装

标准 DSH bundle（`dsh.bundle.patch` + `dsh.client`）。

```bash
# 从本地目录
dsh plugin --profile <你的 profile> add "file:/绝对路径/dsh-kugou-music"
```

或手动：把本目录放进 profile 的 `node_modules/`，在 profile `package.json` 的 `dependencies` 加
`"dsh-kugou-music": "link:<绝对路径>"`、`dsh.profile.bundles` 加 `"dsh-kugou-music"`。

装完**完全退出 DSH 再打开**。

## 使用

1. 输入框上方出现播放条，点左侧 `^` 展开面板
2. **歌单 → 本地歌单**：直接列出本机酷狗客户端的数据
3. **歌单 → 链接导入**：粘贴歌单分享链接
4. **齿轮 → 外观**：主题、颜色、背景、气泡歌词、热键、界面切换
5. **齿轮 → 账号**：填 Cookie

## 本地歌单是怎么读的

酷狗 PC 把数据存在 `%APPDATA%\KuGou8\KGMusicV3.db`，是加密 SQLite。插件：

1. 用 [Project Unlock Music](https://git.unlock-music.dev/um/web) 的 WASM（`@clamber_l/crypto`）解密数据库
2. 解密结果写到系统临时文件（不动原始数据）
3. 用 Node 自带的 `node:sqlite` 读 `RecentlyPlayedItem`、`DeviceDefaultList_*`、`LocalFile`

按数据库 mtime 缓存，客户端写库后自动重解，首次约 200ms。

只读当前登录账号（从 Cookie 的 `KugooID` 解析）的设备列表；多个账号的数据不会混在一起。

> 云歌单（「我喜欢」等）本地只存名字，歌曲在服务器上，需要链接导入。

## KGM 解密

`.kgm / .kgma / .vpr / .kgg`（含 `xxx.kgm.flac`）在 Host 侧用同一套 WASM 解密后流式返回，不落盘。

注意：酷狗现在很多「下载」给的是明文文件（比如无损 `.flac` 本身就是标准 FLAC），这种直接播即可。

## 获取 Cookie

1. 浏览器打开 `kugou.com`，登录账号
2. 按 `F12`（`Ctrl+Shift+I` 也行）
3. 顶部找 **Application**（中文界面叫「应用」）
   - 找不到：点标签栏最右边的 `»` 展开；或右上角 `⋮` → More tools → Application
4. `Storage → Cookies → https://www.kugou.com`，Filter 输 `kg_` 过滤后全选复制
5. 粘成 `name=value; name2=value2` 填进插件

更快的办法：Console 里键盘输入（不要粘贴）`copy(document.cookie)` 回车。若弹出「不要粘贴」警告，先手输 `allow pasting`。

Cookie 只存本机 `~/.dsh/kugou-music/cookie.txt`，不上传任何地方。

## 接口

Host 在 DSH 自带 HTTP server 注册 `/kugou-music-api`（仅 loopback）：

```
GET  /search?q=&page=&size=
GET  /playlist?id=&size=           公开歌单 / 分享链接
GET  /play?hash=&albumId=          免费歌匿名，VIP 走登录态签名
GET  /lyric?hash=&duration=
GET  /local-lists                  本地歌单（解密数据库）
GET  /local-files                  扫描本地音频
GET  /local-audio?path=            本地音频流（含 KGM 解密）
GET  /profile                      账号昵称/头像/UID
GET  /avatar?url=                  头像代理
GET  /cookie                       -> { hasCookie }
POST /cookie { cookie }            保存/清除
GET  /audio?url=                   酷狗 CDN 兜底代理
```

## 实现要点

| 环节 | 做法 |
|---|---|
| 搜索 | `songsearch.kugou.com/song_search_v2` |
| 公开歌单 | `m.kugou.com/plist/list/<id>`（每页 10 条，自动翻页） |
| 分享歌单 | `m3ws.kugou.com/v2/zlist/list` + infSign 签名 |
| 播放地址 | `m.kugou.com/app/i/getSongInfo.php` |
| VIP 播放 | `wwwapi.kugou.com/play/songinfo` + `md5(secret + 排序参数 + secret)` |
| 歌词 | `krcs.kugou.com/search` → `lyrics.kugou.com/download` |
| KRC 解密 | 跳过 `krc1` 头 → 16 字节循环异或 → zlib inflate |
| 翻译 | KRC `[language:]` 段 base64 JSON，取 `type: 1` |
| 本地数据库 | WASM 解密 → 临时 SQLite → `node:sqlite` |
| 前端 | 注册到 `conversation.input.dock` 与 `shell.overlay` 的 React 组件 |

## 已知限制

- 匿名状态下 VIP / 付费歌拿不到播放地址（酷狗侧限制）
- 播放地址有时效，长时间暂停后可能失效，重新点播即可
- 云歌单内容需要链接导入或登录后另想办法
- KGM 解密依赖第三方 WASM，未在全部加密版本上验证
- 只适配 Web 版（`platform: "web"`）
- 窗口标题栏会拦截顶部点击，侧边栏已下移 54px 规避

## 第三方

`lib/umc/` 来自 [Project Unlock Music](https://git.unlock-music.dev/um/web) 的 `@clamber_l/crypto` 0.1.12（MIT + Apache-2.0），许可证已随附。

## License

MIT
