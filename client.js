window.__ModuleLoader__.load({
  id: 'dsh-kugou-music',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo, useCallback } = React

    const API = '/kugou-music-api'
    const STORE_KEY = 'dsh-kugou-music:v1'

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

    const MODE_LABEL = { loop: '循环', order: '顺序', shuffle: '随机' }
    const MODE_ORDER = ['loop', 'order', 'shuffle']
    const nextPlayMode = (mode) => MODE_ORDER[(MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length]

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
.kgm-root[data-theme="dark"], .kgm-side[data-theme="dark"] {
  --kgm-bg: rgba(24,26,33,.70);
  --kgm-fg: #eef1f7;
  --kgm-dim: rgba(238,241,247,.56);
  --kgm-border: rgba(255,255,255,.12);
  --kgm-hover: rgba(255,255,255,.10);
  --kgm-track: rgba(255,255,255,.16);
  --kgm-shadow: 0 14px 36px rgba(0,0,0,.46), 0 1px 2px rgba(0,0,0,.3);
  --kgm-panel-bg: rgba(26,28,36,.90);
}
.kgm-side {
  position: fixed; z-index: 60;
  top: 54px; bottom: 10px;
  left: calc(var(--dsh-windows-sidebar-width, 300px) + 10px);
  width: 344px; display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid var(--kgm-border); border-radius: 16px;
  background: var(--kgm-panel-bg); color: var(--kgm-fg);
  -webkit-backdrop-filter: blur(24px) saturate(1.7); backdrop-filter: blur(24px) saturate(1.7);
  box-shadow: var(--kgm-shadow); pointer-events: auto;
  font-size: 13px; line-height: 1.4;
  animation: kgm-side-in .24s cubic-bezier(.2, .8, .25, 1);
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
.kgm-side.kgm-collapsed { width: 54px; }
.kgm-side * { box-sizing: border-box; }
.kgm-side-head { display: flex; align-items: center; gap: 8px; padding: 10px 10px 8px; border-bottom: 1px solid var(--kgm-border); }
.kgm-side-head button, .kgm-side-tabs button, .kgm-side-player button, .kgm-bubble button, .kgm-mini button {
  -webkit-app-region: no-drag;
}
.kgm-hk-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.kgm-hk-label { font-size: 12px; width: 64px; flex: none; }
.kgm-hk-btn {
  flex: 1; height: 28px; border: 1px solid var(--kgm-border); border-radius: 8px;
  background: transparent; color: var(--kgm-dim); cursor: pointer; font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
}
.kgm-hk-btn.kgm-on { border-color: var(--kgm-brand); color: var(--kgm-brand); background: color-mix(in srgb, var(--kgm-brand) 10%, transparent); }
.kgm-modes-mini { display: flex; gap: 6px; }
.kgm-mode-pill { flex: none; white-space: nowrap; border: 1px solid var(--kgm-border); background: transparent; color: var(--kgm-dim); border-radius: 8px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
/* 拖动期间关掉毛玻璃：移动中的 backdrop-filter 会每帧重采样导致闪烁 */
.kgm-root.kgm-dragging[data-bg="glass"] .kgm-bar,
.kgm-root.kgm-dragging[data-bg="glass"] .kgm-panel,
.kgm-bubble.kgm-dragging[data-bg="glass"] {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.kgm-root.kgm-dragging[data-bg="glass"][data-theme="light"] .kgm-bar,
.kgm-root.kgm-dragging[data-bg="glass"][data-theme="light"] .kgm-panel,
.kgm-bubble.kgm-dragging[data-bg="glass"][data-theme="light"] {
  background: rgba(248, 250, 253, .97);
}
.kgm-root.kgm-dragging[data-bg="glass"][data-theme="dark"] .kgm-bar,
.kgm-root.kgm-dragging[data-bg="glass"][data-theme="dark"] .kgm-panel,
.kgm-bubble.kgm-dragging[data-bg="glass"][data-theme="dark"] {
  background: rgba(26, 28, 36, .97);
}
.kgm-root.kgm-dragging .kgm-bar { cursor: grabbing; }
/* 播放条变窄时按档位渐进隐藏次要控件，避免文字挤出边框 */
.kgm-dock-wide .kgm-volume { display: none; }
.kgm-dock-slim .kgm-volume,
.kgm-dock-slim .kgm-cover { display: none; }
.kgm-dock-slim .kgm-meta { max-width: 30%; }
.kgm-dock-slim .kgm-bar { gap: 4px; padding: 0 8px; }
.kgm-mode-pill.kgm-on { border-color: var(--kgm-brand); color: var(--kgm-brand); background: color-mix(in srgb, var(--kgm-brand) 10%, transparent); }
.kgm-root[data-bg="transparent"] .kgm-bar,
.kgm-root[data-bg="transparent"] .kgm-panel,
.kgm-side[data-bg="transparent"],
.kgm-bubble[data-bg="transparent"],
.kgm-mini[data-bg="transparent"] {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
/* 完全透明：字幕式白字 + 黑描边，深浅背景都能读 */
.kgm-root[data-bg="transparent"] .kgm-bar,
.kgm-root[data-bg="transparent"] .kgm-panel,
.kgm-side[data-bg="transparent"],
.kgm-bubble[data-bg="transparent"],
.kgm-mini[data-bg="transparent"] {
  color: #fff;
  --kgm-fg: #ffffff;
  --kgm-dim: rgba(255, 255, 255, .78);
  text-shadow:
    0 0 2px rgba(0, 0, 0, .95),
    0 1px 3px rgba(0, 0, 0, .8),
    1px 0 2px rgba(0, 0, 0, .7),
    -1px 0 2px rgba(0, 0, 0, .7);
}
.kgm-root[data-bg="transparent"] .kgm-input,
.kgm-side[data-bg="transparent"] .kgm-input,
.kgm-root[data-bg="transparent"] .kgm-cookie textarea,
.kgm-side[data-bg="transparent"] .kgm-cookie textarea {
  background: rgba(0, 0, 0, .28);
  border-color: rgba(255, 255, 255, .28);
  color: #fff;
  text-shadow: none;
}
.kgm-root[data-bg="transparent"] .kgm-tag,
.kgm-side[data-bg="transparent"] .kgm-tag {
  text-shadow: none;
}
/* 浅色主题 + 毛玻璃：字重加深，避免半透明白底上发虚 */
.kgm-root[data-theme="light"][data-bg="glass"] .kgm-bar,
.kgm-side[data-theme="light"][data-bg="glass"],
.kgm-bubble[data-theme="light"][data-bg="glass"],
.kgm-mini[data-theme="light"][data-bg="glass"] {
  --kgm-fg: #0f1218;
  --kgm-dim: rgba(15, 18, 24, .74);
  font-weight: 600;
}
.kgm-root[data-theme="light"][data-bg="glass"] .kgm-song-name,
.kgm-root[data-theme="light"][data-bg="glass"] .kgm-title,
.kgm-side[data-theme="light"][data-bg="glass"] .kgm-song-name,
.kgm-side[data-theme="light"][data-bg="glass"] .kgm-title {
  font-weight: 700;
}
.kgm-avatar { width: 34px; height: 34px; border-radius: 50%; flex: none; object-fit: cover; background: var(--kgm-hover); }
.kgm-avatar-empty { display: flex; align-items: center; justify-content: center; color: var(--kgm-dim); font-size: 15px; }
.kgm-nick { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-uid { font-size: 10px; color: var(--kgm-dim); }
.kgm-side-tabs { display: flex; gap: 2px; padding: 8px 8px 6px; }
.kgm-side-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.kgm-side-lyric { height: 190px; border-top: 1px solid var(--kgm-border); border-bottom: 1px solid var(--kgm-border); display: flex; flex-direction: column; }
.kgm-side-player { padding: 8px 10px 10px; }
.kgm-side-row { display: flex; align-items: center; gap: 6px; }
.kgm-side-cover {
  width: 40px; height: 40px; border-radius: 10px; flex: none; position: relative; overflow: hidden;
  background: var(--kgm-brand); color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 15px; box-shadow: 0 2px 8px color-mix(in srgb, var(--kgm-brand) 40%, transparent);
}
.kgm-side-cover.kgm-spin::after { content: ''; position: absolute; inset: 14px; border-radius: 50%; background: rgba(255,255,255,.9); }
.kgm-side-cover.kgm-spin { animation: kgm-spin 7s linear infinite; }
.kgm-collapsed-body { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0; }
.kgm-root * { box-sizing: border-box; }
.kgm-root, .kgm-side, .kgm-bubble, .kgm-mini, .kgm-mini * { user-select: none; -webkit-user-select: none; }
.kgm-root input, .kgm-root textarea, .kgm-side input, .kgm-side textarea {
  user-select: text; -webkit-user-select: text;
}
.kgm-bar {
  display: flex; align-items: center; gap: 6px; height: 52px; padding: 0 10px;
  border: 1px solid var(--kgm-border); border-radius: 14px;
  background: var(--kgm-bg); color: var(--kgm-fg);
  -webkit-backdrop-filter: blur(20px) saturate(1.6); backdrop-filter: blur(20px) saturate(1.6);
  box-shadow: var(--kgm-shadow);
}
.kgm-floating { position: fixed; z-index: 60; width: min(680px, 92vw); cursor: grab; }
.kgm-floating:active { cursor: grabbing; }
.kgm-floating .kgm-bar { box-shadow: 0 16px 40px rgba(0,0,0,.28); }
.kgm-dock-spacer { height: 52px; }
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
.kgm-btn.kgm-locked { opacity: 1; background: color-mix(in srgb, var(--kgm-brand) 16%, transparent); color: var(--kgm-brand); }
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
  background: var(--kgm-brand); color: #fff; font-size: 14px; overflow: hidden; position: relative;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--kgm-brand) 40%, transparent), inset 0 0 0 3px rgba(255,255,255,.18);
}
.kgm-cover.kgm-spin::after { content: ''; position: absolute; inset: 11px; border-radius: 50%; background: rgba(255,255,255,.9); }
.kgm-cover.kgm-spin { animation: kgm-spin 7s linear infinite; }
@keyframes kgm-spin { to { transform: rotate(360deg); } }
@keyframes kgm-side-in { from { opacity: 0; transform: translateX(-14px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes kgm-bubble-in { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
.kgm-meta { min-width: 0; max-width: 26%; display: flex; flex-direction: column; line-height: 1.3; }
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
.kgm-floating .kgm-panel { bottom: calc(100% + 10px); }
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
.kgm-del {
  width: 22px; height: 22px; flex: none; border: 0; border-radius: 6px;
  background: transparent; color: var(--kgm-dim); cursor: pointer;
  font-size: 15px; line-height: 1; opacity: 0;
  transition: opacity .15s, background .15s, color .15s;
}
.kgm-song:hover .kgm-del { opacity: .65; }
.kgm-del:hover { opacity: 1; background: rgba(220, 80, 70, .16); color: #e05a4e; }
.kgm-song-singer { font-size: 11px; color: var(--kgm-dim); max-width: 30%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kgm-tag { flex: none; font-size: 10px; padding: 1px 5px; border-radius: 4px; background: rgba(52,168,83,.16); color: #2e9e4f; }
.kgm-tag-vip { background: rgba(220,120,40,.16); color: #c26a20; }
.kgm-tag-local { background: color-mix(in srgb, var(--kgm-brand) 16%, transparent); color: var(--kgm-brand); }
.kgm-root[data-theme="dark"] .kgm-tag, .kgm-side[data-theme="dark"] .kgm-tag { color: #6ee09a; }
.kgm-root[data-theme="dark"] .kgm-tag-vip, .kgm-side[data-theme="dark"] .kgm-tag-vip { color: #ffb066; }
.kgm-hint { padding: 16px 14px; font-size: 12px; color: var(--kgm-dim); line-height: 1.65; }
.kgm-lyric-head { padding: 10px 14px 2px; font-size: 12px; color: var(--kgm-dim); display: flex; justify-content: space-between; gap: 8px; }
.kgm-lyric-box { flex: 1; overflow-y: auto; padding: 8px 18px 20px; scrollbar-width: thin; }
.kgm-lyric-line {
  padding: 5px 0; font-size: 13px; line-height: 1.55; opacity: .34;
  transition: opacity .34s ease;
}
.kgm-lyric-line.kgm-active {
  opacity: 1; font-weight: 600; color: var(--kgm-brand);
}
/* 由 JS 每次切句重新挂这个 class，确保动画必然重播 */
.kgm-lyric-line.kgm-anim {
  animation: kgm-lyric-in .45s cubic-bezier(.22, .8, .3, 1);
  will-change: transform, opacity;
}
@keyframes kgm-lyric-in {
  from { opacity: .1; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
.kgm-lyric-line.kgm-active { opacity: 1; font-weight: 600; color: var(--kgm-brand); }
.kgm-lyric-trans { font-size: 11px; line-height: 1.45; opacity: .68; font-weight: 400; margin-top: 2px; color: var(--kgm-fg); }
.kgm-lyric-line.kgm-active .kgm-lyric-trans { opacity: .82; }
.kgm-w { transition: color .1s; }
.kgm-w-done { color: var(--kgm-brand); }
.kgm-err { margin: 0 12px 8px; padding: 7px 10px; border-radius: 9px; font-size: 12px; background: rgba(220,80,70,.12); color: #e05a4e; }
.kgm-root[data-theme="dark"] .kgm-err, .kgm-side[data-theme="dark"] .kgm-err { color: #ff8a80; }
.kgm-settings { padding: 2px 14px 14px; overflow-y: auto; flex: 1; }
.kgm-subtabs { display: flex; gap: 4px; margin-bottom: 12px; }
.kgm-subtab { flex: 1; height: 30px; border: 1px solid var(--kgm-border); border-radius: 8px; background: transparent; color: var(--kgm-dim); cursor: pointer; font-size: 12px; }
.kgm-subtab.kgm-on { color: var(--kgm-fg); border-color: var(--kgm-brand); background: color-mix(in srgb, var(--kgm-brand) 10%, transparent); font-weight: 600; }
.kgm-section { margin-bottom: 14px; }
.kgm-section-title { font-size: 11px; font-weight: 600; color: var(--kgm-dim); letter-spacing: .04em; margin-bottom: 8px; }
.kgm-themes { display: flex; gap: 10px; }
.kgm-theme {
  flex: 1; border: 1.5px solid var(--kgm-border); border-radius: 11px; padding: 10px;
  background: transparent; color: inherit; cursor: pointer; text-align: left; transition: .16s;
}
.kgm-theme:hover { border-color: var(--kgm-brand); }
.kgm-theme.kgm-on { border-color: var(--kgm-brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kgm-brand) 18%, transparent); }
.kgm-swatch { height: 28px; border-radius: 7px; margin-bottom: 6px; border: 1px solid rgba(0,0,0,.06); }
.kgm-swatch-light { background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(240,244,255,.75)); }
.kgm-swatch-dark { background: linear-gradient(135deg, rgba(28,30,38,.95), rgba(44,48,60,.8)); }
.kgm-theme-name { font-size: 12px; font-weight: 600; }
.kgm-colors { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.kgm-color { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,.18); transition: transform .14s; }
.kgm-color:hover { transform: scale(1.12); }
.kgm-color.kgm-on { border-color: var(--kgm-fg); transform: scale(1.12); }
.kgm-color-custom { width: 30px; height: 26px; padding: 0; border: 1px dashed var(--kgm-border); border-radius: 7px; background: transparent; cursor: pointer; }
.kgm-color-hex { font-size: 11px; color: var(--kgm-dim); font-family: ui-monospace, Consolas, monospace; margin-left: 4px; }
.kgm-cookie textarea {
  width: 100%; height: 70px; resize: none; padding: 8px; font-size: 11px;
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
.kgm-modes { display: flex; gap: 8px; }
.kgm-mode { flex: 1; border: 1.5px solid var(--kgm-border); border-radius: 10px; padding: 9px; background: transparent; color: inherit; cursor: pointer; text-align: left; }
.kgm-mode.kgm-on { border-color: var(--kgm-brand); background: color-mix(in srgb, var(--kgm-brand) 8%, transparent); }
.kgm-mode-name { font-size: 12px; font-weight: 600; }
.kgm-mode-desc { font-size: 10.5px; color: var(--kgm-dim); margin-top: 2px; }
.kgm-opacity { display: flex; align-items: center; gap: 10px; }
.kgm-opacity input { flex: 1; accent-color: var(--kgm-brand); }
.kgm-opacity-val { font-size: 11px; color: var(--kgm-dim); font-variant-numeric: tabular-nums; width: 40px; text-align: right; }
.kgm-switch { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.kgm-switch input { accent-color: var(--kgm-brand); width: 15px; height: 15px; }
.kgm-switch-text { font-size: 12px; }
.kgm-bubble {
  position: fixed; left: 24px; bottom: 88px; z-index: 60;
  width: 184px; height: 184px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 0;
  padding: 28px 20px 18px; text-align: center;
  border: 1px solid var(--kgm-border); color: var(--kgm-fg);
  -webkit-backdrop-filter: blur(20px) saturate(1.6); backdrop-filter: blur(20px) saturate(1.6);
  box-shadow: var(--kgm-shadow); pointer-events: auto; font-size: 13px;
  opacity: 0; transform: scale(.82);
  transition:
    opacity .24s cubic-bezier(.2, .8, .25, 1),
    transform .24s cubic-bezier(.2, .8, .25, 1),
    box-shadow .2s;
  --kgm-bg: rgba(255,255,255,.74); --kgm-fg: #1b1f27; --kgm-dim: rgba(27,31,39,.58);
  --kgm-border: rgba(20,26,40,.10); --kgm-hover: rgba(20,26,40,.07);
  --kgm-shadow: 0 10px 30px rgba(20,26,40,.14); --kgm-brand: #3f6bff;
}
.kgm-bubble.kgm-in { opacity: 1; transform: none; }
.kgm-bubble[data-theme="dark"] {
  --kgm-fg: #eef1f7; --kgm-dim: rgba(238,241,247,.56); --kgm-border: rgba(255,255,255,.12);
  --kgm-hover: rgba(255,255,255,.10); --kgm-shadow: 0 14px 36px rgba(0,0,0,.46);
}
.kgm-bubble-lyric {
  position: relative; flex: 1; min-height: 0; width: 100%; overflow: hidden;
}
.kgm-bubble-lyric-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; line-height: 1.45;
}
.kgm-bubble-line { font-size: var(--kgm-bubble-fs, 12px); opacity: .46; }
.kgm-bubble-line.kgm-active { opacity: 1; font-weight: 600; color: var(--kgm-brand); }
/* 整块歌词向上滚动：旧窗口滑出、新窗口从下方补入 */
.kgm-bubble-roller { position: relative; width: 100%; height: 100%; overflow: hidden; }
.kgm-bubble-roll-out,
.kgm-bubble-roll-in {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px;
}
.kgm-bubble-roll-out { animation: kgm-roll-out .44s cubic-bezier(.4, 0, .2, 1) forwards; }
.kgm-bubble-roll-in { animation: kgm-roll-in .44s cubic-bezier(.2, .8, .3, 1); }
@keyframes kgm-roll-out {
  from { transform: translateY(0); opacity: .85; }
  to { transform: translateY(-105%); opacity: 0; }
}
@keyframes kgm-roll-in {
  from { transform: translateY(105%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.kgm-bubble-trans { font-size: calc(var(--kgm-bubble-fs, 12px) - 1.5px); opacity: .7; line-height: 1.35; font-weight: 400; color: var(--kgm-fg); }
.kgm-bubble-actions { display: flex; gap: 6px; align-items: center; }
.kgm-mini {
  position: fixed; left: 8px; bottom: 62px; z-index: 59;
  width: calc(var(--dsh-windows-sidebar-width, 300px) - 16px);
  padding: 8px 10px; border-radius: 10px;
  border: 1px solid var(--kgm-border); color: var(--kgm-fg);
  -webkit-backdrop-filter: blur(16px) saturate(1.5); backdrop-filter: blur(16px) saturate(1.5);
  box-shadow: var(--kgm-shadow); pointer-events: auto; font-size: 12px;
  --kgm-fg: #1b1f27; --kgm-dim: rgba(27,31,39,.58);
  --kgm-border: rgba(20,26,40,.10); --kgm-hover: rgba(20,26,40,.07);
  --kgm-shadow: 0 10px 30px rgba(20,26,40,.14); --kgm-brand: #3f6bff;
}
.kgm-mini[data-theme="dark"] {
  --kgm-fg: #eef1f7; --kgm-dim: rgba(238,241,247,.56); --kgm-border: rgba(255,255,255,.12);
  --kgm-shadow: 0 14px 36px rgba(0,0,0,.46);
}
.kgm-mini-line { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.kgm-mini-song { font-size: 10.5px; color: var(--kgm-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
`

    /* ------------------------------------------------------------------ */
    /* 存储                                                                */
    /* ------------------------------------------------------------------ */
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

    async function api(path, init, timeoutMs = 15000) {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        const res = await fetch(path, init ? { ...init, signal: ctrl.signal } : { signal: ctrl.signal })
        return await res.json()
      } finally {
        clearTimeout(timer)
      }
    }

    function fmt(sec) {
      if (!Number.isFinite(sec) || sec < 0) return '0:00'
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return m + ':' + String(s).padStart(2, '0')
    }

    /* ------------------------------------------------------------------ */
    /* 全局设置 store（跨模块重复加载保持单例）                              */
    /* ------------------------------------------------------------------ */
    function createSettings() {
      const initial = loadStore()
      const state = {
        theme: initial.theme === 'dark' ? 'dark' : 'light',
        accent: typeof initial.accent === 'string' ? initial.accent : '#3f6bff',
        ui: initial.ui === 'side' ? 'side' : 'dock',
        dockLocked: initial.dockLocked !== false,
        dockPos: initial.dockPos || null,
        dockWidth: ['full', 'wide', 'slim'].includes(initial.dockWidth) ? initial.dockWidth : 'full',
        // 每次打开 DSH 都从收起的圆形气泡开始
        sideCollapsed: true,
        bgOpacity: typeof initial.bgOpacity === 'number' ? initial.bgOpacity : 0.86,
        bgMode: initial.bgMode === 'transparent' ? 'transparent' : 'glass',
        showTrans: initial.showTrans === true,
        profileVersion: 0,
        bubbleLines: Math.min(4, Math.max(1, Number(initial.bubbleLines) || 2)),
        bubbleFontSize: Math.min(16, Math.max(10, Number(initial.bubbleFontSize) || 12)),
        hotkeysWhileTyping: initial.hotkeysWhileTyping !== false,
        lyricSidebar: initial.lyricSidebar === true,
        bubbleLocked: initial.bubbleLocked !== false,
        bubblePos: initial.bubblePos || null,
        playMode: ['loop', 'order', 'shuffle'].includes(initial.playMode) ? initial.playMode : 'loop',
        hotkeys: Object.assign({ toggle: '', next: '', prev: '' }, initial.hotkeys || {}),
        // 记住上次播放的歌和进度，下次启动时恢复（不自动播放，等用户点）
        resumePlayback: initial.resumePlayback !== false,
      }
      const listeners = new Set()
      return {
        state,
        subscribe(fn) {
          listeners.add(fn)
          return () => listeners.delete(fn)
        },
        update(patch) {
          Object.assign(state, patch)
          // 收起状态不持久化：每次打开 DSH 都从收起的气泡开始
          const { sideCollapsed, ...persist } = patch
          saveStore(persist)
          listeners.forEach((fn) => fn())
        },
      }
    }

    // 模块可能被重复加载（HMR / slot 重挂），设置与播放器必须全局唯一
    const settings = (() => {
      if (typeof window !== 'undefined' && window.__dshKugouSettings) return window.__dshKugouSettings
      const store = createSettings()
      if (typeof window !== 'undefined') window.__dshKugouSettings = store
      return store
    })()

    function useSettings() {
      const [, force] = useState(0)
      useEffect(() => settings.subscribe(() => force((v) => v + 1)), [])
      return settings.state
    }

    /* ------------------------------------------------------------------ */
    /* 播放器单例：两个 UI 共享，切换界面不中断                             */
    /* ------------------------------------------------------------------ */
    function createPlayer() {
      const bootStore = loadStore()
      const resume = settings.state.resumePlayback && bootStore.resume && bootStore.resume.song ? bootStore.resume : null
      const state = {
        song: resume ? resume.song : null,
        playing: false,
        cur: resume ? Number(resume.cur) || 0 : 0,
        dur: resume && resume.song && resume.song.duration ? Number(resume.song.duration) : 0,
        queue: Array.isArray(bootStore.queue) ? bootStore.queue : [],
        index: resume && Array.isArray(bootStore.queue)
          ? bootStore.queue.findIndex((s) => (s.hash || s.localPath) === (resume.song.hash || resume.song.localPath))
          : -1,
        lyric: { lines: [], meta: {} },
        error: '',
        volume: typeof bootStore.volume === 'number' ? bootStore.volume : 0.8,
      }
      const listeners = new Set()
      let audio = null
      let proxyTried = ''
      let playSeq = 0
      let lastProgressSave = 0
      const history = []

      const emit = () => listeners.forEach((fn) => fn())

      function ensureAudio() {
        if (audio) return audio
        audio = new Audio()
        audio.preload = 'auto'
        audio.volume = state.volume
        audio.addEventListener('timeupdate', () => {
          state.cur = audio.currentTime || 0
          emit()
          // 每 4 秒把进度落一次盘，退出后能接着听
          const now = Date.now()
          if (state.song && now - lastProgressSave > 4000) {
            lastProgressSave = now
            saveStore({ resume: { song: state.song, cur: Math.round(audio.currentTime || 0) } })
          }
        })
        const onMeta = () => {
          state.dur = Number.isFinite(audio.duration) ? audio.duration : 0
          emit()
        }
        audio.addEventListener('loadedmetadata', onMeta)
        audio.addEventListener('durationchange', onMeta)
        audio.addEventListener('play', () => {
          state.playing = true
          emit()
        })
        audio.addEventListener('pause', () => {
          state.playing = false
          emit()
          if (state.song) {
            saveStore({ resume: { song: state.song, cur: Math.round(audio.currentTime || 0) } })
          }
        })
        audio.addEventListener('ended', () => playNext(true))
        audio.addEventListener('error', () => {
          const src = audio.currentSrc || audio.src
          if (!src || src.indexOf('/local-audio') !== -1) {
            state.error = '音频加载失败'
            emit()
            return
          }
          if (proxyTried === src) {
            state.error = '音频加载失败，换一首试试'
            emit()
            return
          }
          proxyTried = src
          const pos = audio.currentTime
          audio.src = API + '/audio?url=' + encodeURIComponent(src)
          audio.load()
          if (pos > 0) audio.currentTime = pos
          audio.play().catch(() => {
            state.error = '音频加载失败，换一首试试'
            emit()
          })
        })
        return audio
      }

      const sameSong = (a, b) => {
        if (!a || !b) return false
        if (a.localPath || b.localPath) return a.localPath === b.localPath
        return a.hash && b.hash && a.hash === b.hash
      }

      async function loadLyric(song, seq) {
        try {
          let hash = song.hash
          let duration = song.duration || 0
          if (!hash && song.localPath) {
            const kw = ((song.singer ? song.singer + ' ' : '') + song.name).trim()
            const sr = await api(API + '/search?q=' + encodeURIComponent(kw) + '&size=1')
            if (seq !== undefined && seq !== playSeq) return
            const hit = sr && sr.ok && sr.songs && sr.songs[0]
            if (!hit) return
            hash = hit.hash
            duration = hit.duration || duration
          }
          if (!hash) return
          const r = await api(API + '/lyric?hash=' + encodeURIComponent(hash) + '&duration=' + duration)
          // 切歌后旧请求晚到：丢掉，避免歌词串台
          if (seq !== undefined && seq !== playSeq) return
          if (r && r.ok) {
            state.lyric = { lines: r.lines || [], meta: r.meta || {} }
            emit()
          }
        } catch {
          /* 歌词失败不影响播放 */
        }
      }

      /** 点一首歌：已经在队列里就跳过去，否则追加到队列末尾。 */
      async function playSong(song) {
        if (!song) return
        const a = ensureAudio()
        const seq = ++playSeq
        state.error = ''
        let idx = state.queue.findIndex((s) => sameSong(s, song))
        if (idx < 0) {
          state.queue = [...state.queue, song]
          idx = state.queue.length - 1
        }
        state.index = idx
        state.song = state.queue[idx] || song
        state.cur = 0
        state.dur = 0
        state.lyric = { lines: [], meta: {} }
        emit()
        saveStore({
          queue: state.queue.map((s) => ({ hash: s.hash, name: s.name, singer: s.singer, duration: s.duration, localPath: s.localPath, albumId: s.albumId, kgm: s.kgm })),
          // 新歌从 0 开始，退出后恢复的是这首
          resume: { song: state.song, cur: 0 },
        })

        if (String(song.localPath || '').trim()) {
          if (seq !== playSeq) return
          proxyTried = ''
          a.src = API + '/local-audio?path=' + encodeURIComponent(song.localPath)
          a.volume = state.volume
          try {
            await a.play()
          } catch (e) {
            state.error = '本地文件播放失败：' + (e && e.message ? e.message : String(e))
            emit()
          }
          loadLyric(song, seq)
          return
        }

        let info
        try {
          info = await api(
            API + '/play?hash=' + encodeURIComponent(song.hash) + '&albumId=' + encodeURIComponent(song.albumId || ''),
          )
        } catch {
          if (seq !== playSeq) return
          state.error = '连不上 Host 接口'
          emit()
          return
        }
        // 请求期间用户又切了歌：丢弃这次结果，避免两首同时播
        if (seq !== playSeq) return
        if (!info.ok) {
          state.error = info.error || '取播放地址失败'
          emit()
          return
        }
        if (!info.url) {
          state.error = info.hasCookie
            ? '这首歌暂无版权或需要更高会员权益'
            : 'VIP 歌曲需要先在「设置 → 账号」里粘贴酷狗 Cookie'
          emit()
          return
        }
        if (info.trial) {
          // 服务端不报错，只降级给试听片段——通常是登录 token 过期了
          state.error = '只拿到试听片段：酷狗登录可能已过期，请到「设置 → 账号」重新粘贴 Cookie'
          emit()
        }
        proxyTried = ''
        a.src = info.url
        a.volume = state.volume
        try {
          await a.play()
        } catch (e) {
          if (seq !== playSeq) return
          state.error = '浏览器拒绝播放：' + (e && e.message ? e.message : String(e))
          emit()
        }
        loadLyric(song, seq)
      }

      function pickShuffle() {
        const q = state.queue
        if (q.length <= 1) return q.length === 1 ? 0 : -1
        let i = state.index
        while (i === state.index) i = Math.floor(Math.random() * q.length)
        return i
      }

      function playNext(fromEnded = false) {
        const q = state.queue
        if (!q.length) return
        const mode = settings.state.playMode
        if (mode === 'shuffle') {
          // 记下当前这首，上一首才能真的回到它
          if (state.song) history.push(songKey(state.song))
          if (history.length > 200) history.shift()
          const i = pickShuffle()
          if (i >= 0) playSong(q[i])
          return
        }
        if (mode === 'order') {
          if (state.index + 1 >= q.length) {
            if (fromEnded) {
              state.playing = false
              emit()
            }
            return
          }
          playSong(q[state.index + 1])
          return
        }
        playSong(q[(state.index + 1) % q.length])
      }

      function playPrev() {
        const q = state.queue
        if (!q.length) return
        if (settings.state.playMode === 'shuffle') {
          // 优先回到真正播过的那一首
          while (history.length) {
            const key = history.pop()
            const idx = q.findIndex((s) => songKey(s) === key)
            if (idx >= 0) {
              playSong(q[idx])
              return
            }
          }
          const i = pickShuffle()
          if (i >= 0) playSong(q[i])
          return
        }
        // index=-1（刚替换队列还没播）时，上一首落在最后
        const from = state.index < 0 ? q.length : state.index
        playSong(q[(from - 1 + q.length) % q.length])
      }

      function toggle() {
        const a = ensureAudio()
        if (!state.song && state.queue.length) {
          playSong(state.queue[0])
          return
        }
        if (!a.paused) {
          a.pause()
          return
        }
        // 启动时恢复的场景：音频还没加载过，先拿地址再跳回上次的进度
        if (!a.src && state.song) {
          const resumeAt = state.cur
          playSong(state.song).then(() => {
            if (resumeAt > 0) {
              const el = ensureAudio()
              try {
                el.currentTime = resumeAt
                // 立刻把恢复点写回去，避免下次又被 4 秒节流覆盖成 0
                saveStore({ resume: { song: state.song, cur: resumeAt } })
              } catch {
                /* 有些流不支持 seek，忽略 */
              }
            }
          })
          return
        }
        a.play().catch(() => {})
      }

      function seekTo(ratio) {
        const a = ensureAudio()
        if (!Number.isFinite(a.duration) || a.duration <= 0) return
        a.currentTime = Math.min(1, Math.max(0, ratio)) * a.duration
      }

      function setVolume(v) {
        const a = ensureAudio()
        a.volume = v
        state.volume = v
        saveStore({ volume: v })
        emit()
      }

      const songKey = (s) => (s && (s.hash || s.localPath)) || ''

      const persistQueue = () => {
        saveStore({
          queue: state.queue.map((s) => ({
            hash: s.hash,
            name: s.name,
            singer: s.singer,
            duration: s.duration,
            localPath: s.localPath,
            albumId: s.albumId,
            kgm: s.kgm,
          })),
        })
      }

      /** 用一张歌单替换整个队列；当前歌还在列表里就留在原位。 */
      function setQueue(list) {
        const songs = Array.isArray(list) ? list.filter(Boolean) : []
        const curKey = songKey(state.song)
        const idx = curKey ? songs.findIndex((s) => songKey(s) === curKey) : -1
        state.queue = songs
        if (idx >= 0) {
          state.index = idx
          state.song = songs[idx]
        } else {
          state.index = -1
          state.song = null
          state.playing = false
          state.lyric = { lines: [], meta: {} }
          if (audio) {
            audio.pause()
            audio.src = ''
          }
        }
        persistQueue()
        emit()
        return songs.length
      }

      /** 把一张歌单追加到现有队列，自动去重。 */
      function appendQueue(list) {
        const songs = Array.isArray(list) ? list.filter(Boolean) : []
        const seen = new Set(state.queue.map(songKey))
        const added = songs.filter((s) => {
          const k = songKey(s)
          if (!k || seen.has(k)) return false
          seen.add(k)
          return true
        })
        state.queue = [...state.queue, ...added]
        persistQueue()
        emit()
        return added.length
      }

      /** 从队列里删掉一首；删的是当前播放的那首就停下。 */
      function removeAt(idx) {
        if (idx < 0 || idx >= state.queue.length) return
        state.queue = state.queue.filter((_, i) => i !== idx)
        if (state.index === idx) {
          state.index = -1
          state.song = null
          state.playing = false
          state.cur = 0
          state.dur = 0
          state.lyric = { lines: [], meta: {} }
          if (audio) {
            audio.pause()
            audio.src = ''
          }
        } else if (state.index > idx) {
          state.index -= 1
        }
        persistQueue()
        emit()
      }

      return {
        state,
        subscribe(fn) {
          listeners.add(fn)
          return () => listeners.delete(fn)
        },
        playSong,
        next: playNext,
        prev: playPrev,
        toggle,
        seekTo,
        setVolume,
        setQueue,
        appendQueue,
        removeAt,
      }
    }

    const player = (() => {
      if (typeof window !== 'undefined' && window.__dshKugouPlayer) return window.__dshKugouPlayer
      const instance = createPlayer()
      if (typeof window !== 'undefined') window.__dshKugouPlayer = instance
      return instance
    })()

    /* ---------------- 全局热键 ---------------- */
    function normalizeKey(e) {
      const k = e.key
      if (!k) return ''
      if (k === ' ') return 'Space'
      if (k.length === 1) return k.toUpperCase()
      return k
    }

    function comboMatches(e, combo) {
      const parts = String(combo || '').split('+').map((s) => s.trim()).filter(Boolean)
      if (!parts.length) return false
      const key = parts[parts.length - 1]
      const mods = parts.slice(0, -1)
      if (mods.includes('Ctrl') !== Boolean(e.ctrlKey)) return false
      if (mods.includes('Alt') !== Boolean(e.altKey)) return false
      if (mods.includes('Shift') !== Boolean(e.shiftKey)) return false
      if (mods.includes('Meta') !== Boolean(e.metaKey)) return false
      return normalizeKey(e) === key
    }

    let hotkeyRecording = false

    /** 热键里是否带 Ctrl/Alt/Shift/Meta。 */
    function comboHasModifier(combo) {
      return String(combo || '')
        .split('+')
        .slice(0, -1)
        .some((m) => ['Ctrl', 'Alt', 'Shift', 'Meta'].includes(m.trim()))
    }

    function bindHotkeys() {
      window.addEventListener(
        'keydown',
        (e) => {
          if (hotkeyRecording) return
          const t = e.target
          const typing = Boolean(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))
          const hk = settings.state.hotkeys || {}
          const acts = [
            ['toggle', () => player.toggle()],
            ['next', () => player.next()],
            ['prev', () => player.prev()],
          ]
          for (const [name, run] of acts) {
            if (!hk[name] || !comboMatches(e, hk[name])) continue
            if (typing) {
              // 打字时：开关关掉就一律不响应；开着也只放行带修饰键的组合，
              // 免得空格/方向键这种单键把输入吃掉
              if (!settings.state.hotkeysWhileTyping) return
              if (!comboHasModifier(hk[name])) return
            }
            e.preventDefault()
            e.stopPropagation()
            run()
            return
          }
        },
        true,
      )
    }

    // 热键监听只绑定一次，避免模块重复加载后一次按键触发多份
    if (typeof window !== 'undefined' && !window.__dshKugouHotkeysBound) {
      window.__dshKugouHotkeysBound = true
      bindHotkeys()
    }

    function usePlayer() {
      const [, force] = useState(0)
      useEffect(() => player.subscribe(() => force((v) => v + 1)), [])
      return player.state
    }

    /* 账号资料 */
    function useProfile() {
      const cfg = useSettings()
      const [profile, setProfile] = useState({ loggedIn: false, nick: '', userid: '', avatar: '' })
      useEffect(() => {
        let alive = true
        api(API + '/profile')
          .then((r) => {
            if (alive && r && r.ok) setProfile(r)
          })
          .catch(() => {})
        return () => {
          alive = false
        }
      }, [cfg.profileVersion])
      return profile
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
      lock: (locked) => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' },
        h('rect', { x: 4.5, y: 10.5, width: 15, height: 10, rx: 2.5 }),
        locked ? h('path', { d: 'M8 10.5V7a4 4 0 0 1 8 0v3.5' }) : h('path', { d: 'M8 10.5V7a4 4 0 0 1 7.5-2' })),
      reset: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }, h('path', { d: 'M4 9a8 8 0 1 1 0 6' }), h('path', { d: 'M4 4v5h5' })),
      collapse: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' }, h('path', { d: 'M14 6l-6 6 6 6' })),
      expand: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' }, h('path', { d: 'M10 6l6 6-6 6' })),
    }

    /* ------------------------------------------------------------------ */
    /* 通用小组件                                                           */
    /* ------------------------------------------------------------------ */
    function SongRow({ song, i, listKey, current, showIdx, onPick, onRemove }) {
      const isCurrent = current
      return h(
        'div',
        {
          className: 'kgm-song' + (isCurrent ? ' kgm-current' : ''),
          role: 'button',
          tabIndex: 0,
          onClick: () => onPick(song, listKey),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPick(song, listKey)
            }
          },
          title: (song.name || '') + (song.singer ? ' - ' + song.singer : ''),
        },
        showIdx ? h('span', { className: 'kgm-idx' }, String(i + 1)) : null,
        h('span', { className: 'kgm-song-name' }, song.name || song.songName || '未知歌曲'),
        h('span', { className: 'kgm-song-singer' }, song.singer || ''),
        song.localPath
          ? h('span', { className: 'kgm-tag kgm-tag-local' }, song.kgm ? '加密' : '本地')
          : song.free === false
            ? h('span', { className: 'kgm-tag kgm-tag-vip' }, 'VIP')
            : h('span', { className: 'kgm-tag' }, '免费'),
        onRemove
          ? h(
              'button',
              {
                className: 'kgm-del',
                onClick: (e) => {
                  e.stopPropagation()
                  onRemove(i)
                },
                title: '从队列移除',
              },
              '×',
            )
          : null,
      )
    }

    /** 热键录制按钮。 */
    function HotkeyInput({ value, onChange }) {
      const [recording, setRecording] = useState(false)
      useEffect(() => {
        hotkeyRecording = recording
        if (!recording) return
        const onKey = (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (e.key === 'Escape') {
            setRecording(false)
            return
          }
          if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
          const parts = []
          if (e.ctrlKey) parts.push('Ctrl')
          if (e.altKey) parts.push('Alt')
          if (e.shiftKey) parts.push('Shift')
          if (e.metaKey) parts.push('Meta')
          const key = normalizeKey(e)
          if (!key) return
          if (
            !parts.length &&
            !/^(F\d{1,2}|Arrow\w+|Space|Enter|Escape|Delete|Home|End|PageUp|PageDown)$/.test(key)
          ) {
            return
          }
          onChange([...parts, key].join('+'))
          setRecording(false)
        }
        window.addEventListener('keydown', onKey, true)
        return () => {
          hotkeyRecording = false
          window.removeEventListener('keydown', onKey, true)
        }
      }, [recording, onChange])
      return h(
        'div',
        { style: { display: 'flex', gap: 6, flex: 1, alignItems: 'center' } },
        h(
          'button',
          { className: 'kgm-hk-btn' + (recording ? ' kgm-on' : ''), onClick: () => setRecording(true) },
          recording ? '按下按键…（Esc 取消）' : value || '未设置',
        ),
        value ? h('button', { className: 'kgm-btn', onClick: () => onChange(''), title: '清除' }, '×') : null,
      )
    }

    /** 当前正在唱的那一句。 */
    function currentLine(lyric, cur) {
      const ms = cur * 1000
      let idx = -1
      for (let i = 0; i < lyric.lines.length; i++) {
        if (lyric.lines[i].start <= ms) idx = i
        else break
      }
      if (idx < 0) return ''
      return lyric.lines[idx].words.map((w) => w.text).join('')
    }

    /** 当前行的翻译（酷狗词库，没有就空串）。 */
    function currentTrans(lyric, cur) {
      const ms = cur * 1000
      let idx = -1
      for (let i = 0; i < lyric.lines.length; i++) {
        if (lyric.lines[i].start <= ms) idx = i
        else break
      }
      if (idx < 0) return ''
      return lyric.lines[idx].trans || ''
    }

    /** 气泡里显示的 N 行歌词（以当前行为中心，最多 4 行）。 */
    function bubbleLinesOf(lyric, cur, count) {
      const n = Math.max(1, Math.min(4, Number(count) || 1))
      if (!lyric.lines.length) return []
      const ms = cur * 1000
      let idx = -1
      for (let i = 0; i < lyric.lines.length; i++) {
        if (lyric.lines[i].start <= ms) idx = i
        else break
      }
      if (idx < 0) idx = 0
      const half = Math.floor(n / 2)
      let start = Math.max(0, idx - half)
      const end = Math.min(lyric.lines.length, start + n)
      start = Math.max(0, end - n)
      const out = []
      for (let i = start; i < end; i++) {
        out.push({
          text: lyric.lines[i].words.map((w) => w.text).join(''),
          active: i === idx,
          // 绝对行号：作为 React key，切句时才能重建当前行触发动画
          abs: i,
        })
      }
      return out
    }

    function LyricView({ lyric, cur, boxRef, showTrans }) {
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
        const box = boxRef.current
        if (!box || lineIdx < 0) return
        const el = box.querySelector('[data-line="' + lineIdx + '"]')
        if (!el) return
        // 强制重启动画：同一帧内 remove/add 会被浏览器视为连续变更而不重播，
        // 必须跨帧——先摘掉 class，下一帧再加回来
        el.classList.remove('kgm-anim')
        requestAnimationFrame(() => {
          if (el.isConnected) el.classList.add('kgm-anim')
        })
        // 用视口坐标算差值，比 offsetTop 更稳（不受定位祖先影响）
        const boxRect = box.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const delta = elRect.top - boxRect.top - (box.clientHeight - elRect.height) / 2
        box.scrollTo({ top: Math.max(0, box.scrollTop + delta), behavior: 'smooth' })
      }, [lineIdx, boxRef])

      if (!lyric.lines.length) return h('div', { className: 'kgm-hint' }, '播放歌曲后这里显示歌词')
      return lyric.lines.map((line, i) => {
        const active = i === lineIdx
        const trans = showTrans && line.trans ? h('div', { className: 'kgm-lyric-trans' }, line.trans) : null
        if (!active) {
          return h(
            'div',
            { key: i, className: 'kgm-lyric-line', 'data-line': i },
            line.words.map((w) => w.text).join(''),
            trans,
          )
        }
        const rel = cur * 1000 - line.start
        return h(
          'div',
          { key: i, className: 'kgm-lyric-line kgm-active', 'data-line': i },
          line.words.map((w, j) => h('span', { key: j, className: rel >= w.t ? 'kgm-w kgm-w-done' : 'kgm-w' }, w.text)),
          trans,
        )
      })
    }

    /* ------------------------------------------------------------------ */
    /* 曲库（搜索/歌单/队列）                                               */
    /* ------------------------------------------------------------------ */
    function Library({ tab, profile, onProfile, compact }) {
      const p = usePlayer()
      const [query, setQuery] = useState('')
      const [results, setResults] = useState([])
      const [loading, setLoading] = useState(false)
      const [plMode, setPlMode] = useState('local')
      const [plInput, setPlInput] = useState('')
      const [plLoading, setPlLoading] = useState(false)
      const [onlineList, setOnlineList] = useState({ id: '', name: '', songs: [] })
      const [localLists, setLocalLists] = useState([])
      const [localCloud, setLocalCloud] = useState([])
      const [localFileList, setLocalFileList] = useState([])
      const [activeLocal, setActiveLocal] = useState('recent')
      const [localError, setLocalError] = useState('')
      const [notice, setNotice] = useState('')
      const [queueQuery, setQueueQuery] = useState('')

      useEffect(() => {
        if (!notice) return
        const timer = setTimeout(() => setNotice(''), 2600)
        return () => clearTimeout(timer)
      }, [notice])

      const doSearch = useCallback(async () => {
        const q = query.trim()
        if (!q) return
        setLoading(true)
        try {
          const r = await api(API + '/search?q=' + encodeURIComponent(q) + '&size=20')
          setResults(r && r.ok ? r.songs || [] : [])
        } catch {
          setResults([])
        } finally {
          setLoading(false)
        }
      }, [query])

      const importPlaylist = useCallback(async (raw) => {
        const input = String(raw || '').trim()
        if (!input) return
        setPlLoading(true)
        try {
          const r = await api(API + '/playlist?id=' + encodeURIComponent(input) + '&size=200')
          if (r && r.ok) {
            setOnlineList({ id: r.id, name: r.name, songs: r.songs || [] })
            setPlInput(r.id)
            saveStore({ playlist: { id: r.id, name: r.name, songs: r.songs || [] } })
          }
        } catch {
          /* ignore */
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
            const has = (r.playlists || []).some((x) => x.id === activeLocal)
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
        if (tab === 'playlist' && plMode === 'local' && !localLists.length) loadLocal()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [tab, plMode])

      useEffect(() => {
        const cachedPl = loadStore().playlist
        if (cachedPl && cachedPl.id && !onlineList.id) {
          setOnlineList(cachedPl)
          setPlInput(cachedPl.id)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      /** 只把点中的这一首加入现有队列 */
      const pick = useCallback((song) => {
        player.playSong(song)
      }, [])

      const activeList = localLists.find((x) => x.id === activeLocal)
      const localSongs = useMemo(() => {
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

      const currentKey = p.song ? p.song.hash || p.song.localPath : ''

      if (tab === 'search') {
        return h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
          h(
            'div',
            { className: 'kgm-search' },
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
            { className: 'kgm-list' },
            results.length
              ? results.map((s, i) =>
                  h(SongRow, {
                    key: (s.hash || 'k') + i,
                    song: s,
                    i,
                    listKey: 'search',
                    current: currentKey === s.hash,
                    showIdx: false,
                    onPick: pick,
                  }),
                )
              : h('div', { className: 'kgm-hint' }, '搜一首点一首，只会把点中的那首加进队列。'),
          ),
        )
      }

      if (tab === 'playlist') {
        return h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
          h(
            'div',
            { className: 'kgm-chips', style: { paddingTop: 2 } },
            h('button', { className: 'kgm-chip' + (plMode === 'local' ? ' kgm-on' : ''), onClick: () => { setPlMode('local'); if (!localLists.length) loadLocal() } }, '本地歌单'),
            h('button', { className: 'kgm-chip' + (plMode === 'link' ? ' kgm-on' : ''), onClick: () => setPlMode('link') }, '链接导入'),
            h('button', { className: 'kgm-chip', style: { marginLeft: 'auto' }, onClick: loadLocal }, '刷新'),
          ),
          plMode === 'local'
            ? [
                localError ? h('div', { className: 'kgm-err' }, localError) : null,
                h(
                  'div',
                  { className: 'kgm-chips', key: 'lists' },
                  localLists.map((x) =>
                    h('button', { key: x.id, className: 'kgm-chip' + (activeLocal === x.id ? ' kgm-on' : ''), onClick: () => setActiveLocal(x.id) }, x.name + ' · ' + x.count),
                  ),
                  h('button', { key: 'files', className: 'kgm-chip' + (activeLocal === 'files' ? ' kgm-on' : ''), onClick: () => setActiveLocal('files') }, '本地文件 · ' + localFileList.length),
                ),
                localCloud.length
                  ? h('div', { className: 'kgm-small', style: { padding: '0 14px' }, key: 'cloud' },
                      '云端歌单（歌曲在服务器）：' + localCloud.map((c) => c.name).join(' / '))
                  : null,
                localSongs.length
                  ? h(
                      'div',
                      { className: 'kgm-row', style: { padding: '4px 14px 6px' }, key: 'ops' },
                      h('button', { className: 'kgm-go', onClick: () => { player.setQueue(localSongs); setNotice('已替换为 ' + localSongs.length + ' 首') } }, '替换列表'),
                      h('button', { className: 'kgm-mode-pill', onClick: () => { const n = player.appendQueue(localSongs); setNotice('已加入 ' + n + ' 首') } }, '加入列表'),
                      notice ? h('span', { className: 'kgm-small', style: { margin: 0 } }, notice) : null,
                    )
                  : null,
                h(
                  'div',
                  { className: 'kgm-list', key: 'songs' },
                  localSongs.length
                    ? localSongs.map((s, i) =>
                        h(SongRow, {
                          key: (s.hash || s.localPath || 'l') + i,
                          song: s,
                          i,
                          listKey: 'local',
                          current: currentKey === (s.hash || s.localPath),
                          showIdx: true,
                          onPick: pick,
                        }),
                      )
                    : h('div', { className: 'kgm-hint' }, '点上面的歌单看看。'),
                ),
              ]
            : [
                h(
                  'div',
                  { className: 'kgm-search', key: 'pls' },
                  h('input', {
                    className: 'kgm-input',
                    placeholder: '粘贴酷狗歌单链接或 ID',
                    value: plInput,
                    onChange: (e) => setPlInput(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key === 'Enter') importPlaylist(plInput)
                    },
                  }),
                  h('button', { className: 'kgm-go', onClick: () => importPlaylist(plInput), disabled: plLoading || !plInput.trim() }, plLoading ? '拉取中' : '导入'),
                ),
                onlineList.songs.length
                  ? h(
                      'div',
                      { key: 'plname' },
                      h('div', { className: 'kgm-small', style: { padding: '0 14px', margin: 0 } },
                        '《' + onlineList.name + '》 · ' + onlineList.songs.length + ' 首' + (notice ? ' · ' + notice : '')),
                      h(
                        'div',
                        { className: 'kgm-row', style: { padding: '6px 14px' } },
                        h('button', { className: 'kgm-go', onClick: () => { player.setQueue(onlineList.songs); setNotice('已替换为 ' + onlineList.songs.length + ' 首') } }, '替换列表'),
                        h('button', { className: 'kgm-mode-pill', onClick: () => { const n = player.appendQueue(onlineList.songs); setNotice('已加入 ' + n + ' 首') } }, '加入列表'),
                      ),
                    )
                  : null,
                h(
                  'div',
                  { className: 'kgm-list', key: 'pllist' },
                  onlineList.songs.length
                    ? onlineList.songs.map((s, i) =>
                        h(SongRow, { key: (s.hash || 'k') + i, song: s, i, listKey: 'online', current: currentKey === s.hash, showIdx: true, onPick: pick }),
                      )
                    : h('div', { className: 'kgm-hint' }, '例如 www.kugou.com/yy/special/single/123456.html'),
                ),
              ],
        )
      }

      // 队列搜索：保留原始索引，删除/播放不会错位
      const queueKw = queueQuery.trim().toLowerCase()
      const queueRows = p.queue
        .map((song, index) => ({ song, index }))
        .filter(({ song }) => {
          if (!queueKw) return true
          return ((song.name || '') + ' ' + (song.singer || '')).toLowerCase().includes(queueKw)
        })

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
        h(
          'div',
          { className: 'kgm-search', style: { paddingTop: 2 } },
          h('input', {
            className: 'kgm-input',
            placeholder: '在队列里搜索（歌名 / 歌手）',
            value: queueQuery,
            onChange: (e) => setQueueQuery(e.target.value),
            onKeyDown: (e) => {
              if (e.key === 'Escape') setQueueQuery('')
            },
          }),
          queueKw
            ? h('button', { className: 'kgm-btn', onClick: () => setQueueQuery(''), title: '清除搜索' }, '×')
            : null,
        ),
        queueKw
          ? h('div', { className: 'kgm-small', style: { padding: '0 14px 4px', margin: 0 } },
              '匹配 ' + queueRows.length + ' / ' + p.queue.length + ' 首')
          : null,
        h(
          'div',
          { className: 'kgm-list' },
          queueRows.length
            ? queueRows.map(({ song, index }) =>
                h(SongRow, {
                  key: (song.hash || song.localPath || 'q') + index,
                  song,
                  i: index,
                  listKey: 'queue',
                  current: currentKey === (song.hash || song.localPath),
                  showIdx: true,
                  onPick: pick,
                  onRemove: (idx) => player.removeAt(idx),
                }),
              )
            : h('div', { className: 'kgm-hint' }, queueKw ? '队列里没有匹配的歌' : '队列还是空的，先去搜几首歌。'),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* 设置                                                                */
    /* ------------------------------------------------------------------ */
    function Settings({ profile, onCookieSaved }) {
      const cfg = useSettings()
      const [sub, setSub] = useState('look')
      const [draft, setDraft] = useState('')
      const [hasCookie, setHasCookie] = useState(false)
      const [err, setErr] = useState('')

      useEffect(() => {
        api(API + '/cookie').then((r) => setHasCookie(Boolean(r && r.hasCookie))).catch(() => {})
      }, [])

      const saveCookie = useCallback(async () => {
        try {
          const r = await api(API + '/cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: draft }),
          })
          setHasCookie(Boolean(r && r.hasCookie))
          setDraft('')
          // 通知所有用到账号资料的组件重新拉一次（头像/昵称/会员状态）
          settings.update({ profileVersion: (settings.state.profileVersion || 0) + 1 })
          onCookieSaved && onCookieSaved()
        } catch {
          setErr('保存 Cookie 失败')
        }
      }, [draft, onCookieSaved])

      const look = h(
        'div',
        { className: 'kgm-section' },
        h('div', { className: 'kgm-section-title' }, '界面'),
        h(
          'div',
          { className: 'kgm-modes', style: { marginBottom: 12 } },
          h(
            'button',
            { className: 'kgm-mode' + (cfg.ui === 'dock' ? ' kgm-on' : ''), onClick: () => settings.update({ ui: 'dock' }) },
            h('div', { className: 'kgm-mode-name' }, '输入框播放条'),
            h('div', { className: 'kgm-mode-desc' }, '常驻输入框上方，可解锁拖动'),
          ),
          h(
            'button',
            { className: 'kgm-mode' + (cfg.ui === 'side' ? ' kgm-on' : ''), onClick: () => settings.update({ ui: 'side' }) },
            h('div', { className: 'kgm-mode-name' }, '左侧边栏'),
            h('div', { className: 'kgm-mode-desc' }, '固定左侧，带歌词面板'),
          ),
        ),
        cfg.ui === 'dock'
          ? h(
              'div',
              { style: { marginBottom: 12 } },
              h('div', { className: 'kgm-section-title' }, '播放条宽度'),
              h(
                'div',
                { className: 'kgm-modes-mini' },
                h('button', { className: 'kgm-mode-pill' + (cfg.dockWidth === 'full' ? ' kgm-on' : ''), onClick: () => settings.update({ dockWidth: 'full' }) }, '贴合对话框'),
                h('button', { className: 'kgm-mode-pill' + (cfg.dockWidth === 'wide' ? ' kgm-on' : ''), onClick: () => settings.update({ dockWidth: 'wide' }) }, '略窄'),
                h('button', { className: 'kgm-mode-pill' + (cfg.dockWidth === 'slim' ? ' kgm-on' : ''), onClick: () => settings.update({ dockWidth: 'slim' }) }, '紧凑'),
              ),
              h('div', { className: 'kgm-small' }, '调整播放条与输入框的对齐宽度，锁定和悬浮状态都生效。'),
            )
          : null,
        h('div', { className: 'kgm-section-title' }, '播放模式'),
        h(
          'div',
          { className: 'kgm-modes-mini', style: { marginBottom: 12 } },
          h('button', { className: 'kgm-mode-pill' + (cfg.playMode === 'loop' ? ' kgm-on' : ''), onClick: () => settings.update({ playMode: 'loop' }) }, '列表循环'),
          h('button', { className: 'kgm-mode-pill' + (cfg.playMode === 'order' ? ' kgm-on' : ''), onClick: () => settings.update({ playMode: 'order' }) }, '顺序播放'),
          h('button', { className: 'kgm-mode-pill' + (cfg.playMode === 'shuffle' ? ' kgm-on' : ''), onClick: () => settings.update({ playMode: 'shuffle' }) }, '随机播放'),
        ),
        h('div', { className: 'kgm-section-title' }, '快捷键'),
        h(
          'div',
          { className: 'kgm-hk-row' },
          h('span', { className: 'kgm-hk-label' }, '播放/暂停'),
          h(HotkeyInput, {
            value: cfg.hotkeys.toggle,
            onChange: (v) => settings.update({ hotkeys: { ...cfg.hotkeys, toggle: v } }),
          }),
        ),
        h(
          'div',
          { className: 'kgm-hk-row' },
          h('span', { className: 'kgm-hk-label' }, '上一首'),
          h(HotkeyInput, {
            value: cfg.hotkeys.prev,
            onChange: (v) => settings.update({ hotkeys: { ...cfg.hotkeys, prev: v } }),
          }),
        ),
        h(
          'div',
          { className: 'kgm-hk-row' },
          h('span', { className: 'kgm-hk-label' }, '下一首'),
          h(HotkeyInput, {
            value: cfg.hotkeys.next,
            onChange: (v) => settings.update({ hotkeys: { ...cfg.hotkeys, next: v } }),
          }),
        ),
        h('div', { className: 'kgm-small' }, '点按钮后直接按键；单键只支持 F1-F12 / 方向键 / 空格等，其余请用组合键。'),
        h(
          'label',
          { className: 'kgm-switch', style: { marginTop: 4 } },
          h('input', {
            type: 'checkbox',
            checked: cfg.hotkeysWhileTyping,
            onChange: (e) => settings.update({ hotkeysWhileTyping: e.target.checked }),
          }),
          h('span', { className: 'kgm-switch-text' }, '在输入框打字时也响应组合键（仅 Ctrl / Alt / Shift 组合）'),
        ),
        h('div', { className: 'kgm-section-title' }, '播放'),
        h(
          'label',
          { className: 'kgm-switch', style: { marginBottom: 12 } },
          h('input', {
            type: 'checkbox',
            checked: cfg.resumePlayback,
            onChange: (e) => settings.update({ resumePlayback: e.target.checked }),
          }),
          h('span', { className: 'kgm-switch-text' }, '记住上次播放的歌和进度（下次启动从这里继续）'),
        ),
        h('div', { className: 'kgm-section-title' }, '背景'),
        h(
          'div',
          { className: 'kgm-modes-mini', style: { marginBottom: 12 } },
          h('button', { className: 'kgm-mode-pill' + (cfg.bgMode === 'glass' ? ' kgm-on' : ''), onClick: () => settings.update({ bgMode: 'glass' }) }, '毛玻璃'),
          h('button', { className: 'kgm-mode-pill' + (cfg.bgMode === 'transparent' ? ' kgm-on' : ''), onClick: () => settings.update({ bgMode: 'transparent' }) }, '完全透明'),
        ),
        h('div', { className: 'kgm-section-title' }, '侧边栏背景透明度'),
        h(
          'div',
          { className: 'kgm-opacity', style: { marginBottom: 12 } },
          h('input', {
            type: 'range',
            min: 0.2,
            max: 1,
            step: 0.01,
            value: cfg.bgOpacity,
            onChange: (e) => settings.update({ bgOpacity: Number(e.target.value) }),
          }),
          h('span', { className: 'kgm-opacity-val' }, Math.round(cfg.bgOpacity * 100) + '%'),
        ),
        cfg.ui === 'side'
          ? h(
              'div',
              null,
              h('div', { className: 'kgm-section-title' }, '气泡歌词（收起成气泡时生效）'),
              h(
                'div',
                { className: 'kgm-opacity', style: { marginBottom: 8 } },
                h('span', { className: 'kgm-small', style: { margin: 0, width: 40, flex: 'none' } }, '行数'),
                h('input', {
                  type: 'range',
                  min: 1,
                  max: 4,
                  step: 1,
                  value: cfg.bubbleLines,
                  onChange: (e) => settings.update({ bubbleLines: Number(e.target.value) }),
                }),
                h('span', { className: 'kgm-opacity-val' }, cfg.bubbleLines + ' 行'),
              ),
              h(
                'div',
                { className: 'kgm-opacity', style: { marginBottom: 12 } },
                h('span', { className: 'kgm-small', style: { margin: 0, width: 40, flex: 'none' } }, '字号'),
                h('input', {
                  type: 'range',
                  min: 10,
                  max: 16,
                  step: 1,
                  value: cfg.bubbleFontSize,
                  onChange: (e) => settings.update({ bubbleFontSize: Number(e.target.value) }),
                }),
                h('span', { className: 'kgm-opacity-val' }, cfg.bubbleFontSize + 'px'),
              ),
            )
          : null,
        h(
          'label',
          { className: 'kgm-switch', style: { marginBottom: 12 } },
          h('input', {
            type: 'checkbox',
            checked: cfg.lyricSidebar,
            onChange: (e) => settings.update({ lyricSidebar: e.target.checked }),
          }),
          h('span', { className: 'kgm-switch-text' }, '在左侧边栏（工作文件夹下方）显示歌词'),
        ),
        h(
          'label',
          { className: 'kgm-switch', style: { marginBottom: 12 } },
          h('input', {
            type: 'checkbox',
            checked: cfg.showTrans,
            onChange: (e) => settings.update({ showTrans: e.target.checked }),
          }),
          h('span', { className: 'kgm-switch-text' }, '显示歌词翻译（酷狗自带词库）'),
        ),
        h('div', { className: 'kgm-section-title' }, '主题'),
        h(
          'div',
          { className: 'kgm-themes', style: { marginBottom: 12 } },
          h(
            'button',
            { className: 'kgm-theme' + (cfg.theme === 'light' ? ' kgm-on' : ''), onClick: () => settings.update({ theme: 'light' }) },
            h('div', { className: 'kgm-swatch kgm-swatch-light' }),
            h('div', { className: 'kgm-theme-name' }, '白 · 半透明'),
          ),
          h(
            'button',
            { className: 'kgm-theme' + (cfg.theme === 'dark' ? ' kgm-on' : ''), onClick: () => settings.update({ theme: 'dark' }) },
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
              className: 'kgm-color' + (cfg.accent.toLowerCase() === c.value ? ' kgm-on' : ''),
              style: { background: c.value },
              title: c.name + ' ' + c.value,
              onClick: () => settings.update({ accent: c.value }),
            }),
          ),
          h('input', {
            type: 'color',
            className: 'kgm-color-custom',
            value: cfg.accent,
            onChange: (e) => settings.update({ accent: e.target.value }),
          }),
          h('span', { className: 'kgm-color-hex' }, cfg.accent.toUpperCase()),
        ),
      )

      const account = h(
        'div',
        { className: 'kgm-section' },
        h(
          'div',
          { className: 'kgm-row', style: { marginBottom: 10 } },
          h('span', { className: 'kgm-section-title', style: { margin: 0 } }, '酷狗会员登录（Cookie）'),
          h('span', { className: 'kgm-badge' + (profile.loggedIn || hasCookie ? ' kgm-badge-on' : ''), style: { marginLeft: 'auto' } },
            profile.loggedIn ? profile.nick || '已登录' : hasCookie ? '已配置' : '未配置'),
        ),
        h('div', { className: 'kgm-step' }, h('span', { className: 'kgm-num' }, '1'), h('span', null, '浏览器打开 ', h('b', null, 'kugou.com'), ' 并登录。')),
        h('div', { className: 'kgm-step' }, h('span', { className: 'kgm-num' }, '2'), h('span', null, '按 ', h('b', null, 'F12'), '（或 ', h('span', { className: 'kgm-code' }, 'Ctrl+Shift+I'), '）打开开发者工具。')),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '3'),
          h('span', null, '顶部找 ', h('b', null, 'Application'), '（中文「应用」）；找不到点标签栏右边 ', h('b', null, '»'), '，或 ', h('b', null, '⋮'), ' → More tools → Application。'),
        ),
        h('div', { className: 'kgm-step' }, h('span', { className: 'kgm-num' }, '4'), h('span', null, h('b', null, 'Storage → Cookies → https://www.kugou.com'), '，Filter 输 ', h('span', { className: 'kgm-code' }, 'kg_'), ' 过滤后全选复制。')),
        h(
          'div',
          { className: 'kgm-step' },
          h('span', { className: 'kgm-num' }, '5'),
          h('span', null, '更快的办法：Console 里键盘输入 ', h('span', { className: 'kgm-code' }, 'copy(document.cookie)'), ' 回车，已自动复制（提示「不要粘贴」时先手输 ', h('span', { className: 'kgm-code' }, 'allow pasting'), '）。'),
        ),
        err ? h('div', { className: 'kgm-err', style: { margin: '0 0 8px' } }, err) : null,
        h(
          'div',
          { className: 'kgm-cookie', style: { marginTop: 6 } },
          h('textarea', {
            value: draft,
            placeholder: 'kg_mid=...; kg_dfid=...; KuGoo=...',
            onChange: (e) => setDraft(e.target.value),
          }),
        ),
        h(
          'div',
          { className: 'kgm-row', style: { marginTop: 8 } },
          h('button', { className: 'kgm-go', onClick: saveCookie, disabled: !draft.trim() }, '保存'),
          h('button', { className: 'kgm-btn', onClick: async () => {
            try {
              await api(API + '/cookie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cookie: '' }) })
              setHasCookie(false)
              settings.update({ profileVersion: (settings.state.profileVersion || 0) + 1 })
            } catch { /* ignore */ }
          }, title: '清除' }, '清除'),
          h('span', { className: 'kgm-small', style: { margin: 0, marginLeft: 'auto' } }, '只存本机 ~/.dsh'),
        ),
      )

      return h(
        'div',
        { className: 'kgm-settings' },
        h(
          'div',
          { className: 'kgm-subtabs' },
          h('button', { className: 'kgm-subtab' + (sub === 'look' ? ' kgm-on' : ''), onClick: () => setSub('look') }, '外观'),
          h('button', { className: 'kgm-subtab' + (sub === 'account' ? ' kgm-on' : ''), onClick: () => setSub('account') }, '账号'),
        ),
        sub === 'look' ? look : account,
      )
    }

    /* ------------------------------------------------------------------ */
    /* Dock 版：输入框上方，可锁定 / 拖动                                   */
    /* ------------------------------------------------------------------ */
    function KugouDock() {
      const cfg = useSettings()
      const p = usePlayer()
      const profile = useProfile()
      const [expanded, setExpanded] = useState(false)
      const [tab, setTab] = useState('search')
      const [drag, setDrag] = useState(null)
      const [dragging, setDragging] = useState(false)
      const [panelBox, setPanelBox] = useState(null)
      const [holderBox, setHolderBox] = useState(null)
      const barRef = useRef(null)
      const holderRef = useRef(null)
      const lyricRef = useRef(null)
      const dragInfo = useRef(null)

      // 记录播放条在文档流里的默认位置（聊天栏与输入框之间），
      // 浮动和复位时都贴回这里，而不是飘到页面底部
      useEffect(() => {
        const calc = () => {
          const el = holderRef.current
          if (!el) return
          const r = el.getBoundingClientRect()
          if (r.width > 0) setHolderBox({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) })
        }
        calc()
        window.addEventListener('resize', calc)
        return () => window.removeEventListener('resize', calc)
      }, [cfg.ui, cfg.dockWidth])

      // 面板用 fixed 定位贴到播放条上方：dock 所在的容器有 overflow 裁剪，
      // 绝对定位向上展开会被切掉顶部，fixed 才能完整显示
      useEffect(() => {
        if (!expanded) return
        const el = barRef.current
        if (!el) return
        const calc = () => {
          const target = barRef.current
          if (!target) return
          const r = target.getBoundingClientRect()
          const h = Math.max(240, Math.min(460, Math.round(r.top - 26)))
          setPanelBox({
            left: Math.round(r.left),
            width: Math.round(r.width),
            height: h,
            bottom: Math.round(window.innerHeight - r.top + 10),
          })
        }
        // 宽度预设切换后先等一帧让播放条完成布局，再量尺寸
        const raf = requestAnimationFrame(calc)
        // 容器/播放条尺寸任何变化都实时跟随（改宽度预设、拖窗口都算）
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calc) : null
        if (ro) ro.observe(el)
        window.addEventListener('resize', calc)
        window.addEventListener('scroll', calc, true)
        return () => {
          cancelAnimationFrame(raf)
          if (ro) ro.disconnect()
          window.removeEventListener('resize', calc)
          window.removeEventListener('scroll', calc, true)
        }
      }, [expanded, drag, cfg.ui, cfg.dockLocked, cfg.dockWidth, holderBox])

      useEffect(() => {
        if (cfg.ui !== 'dock' || cfg.dockLocked) {
          dragInfo.current = null
          setDrag(null)
        }
      }, [cfg.ui, cfg.dockLocked])

      const startDrag = useCallback((e) => {
        if (!barRef.current || cfg.dockLocked) return
        // 进度条要独立拖动，不能被当成拖整条播放条
        if (e.target.closest('button, input, textarea, .kgm-track')) return
        const rect = barRef.current.getBoundingClientRect()
        dragInfo.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, w: rect.width }
        setDrag({ x: rect.left, y: rect.top })
        setDragging(true)
        e.preventDefault()
      }, [cfg.dockLocked])

      useEffect(() => {
        if (!drag) return
        document.body.style.userSelect = 'none'
        const move = (e) => {
          if (!dragInfo.current) return
          const x = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - dragInfo.current.dx))
          const y = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragInfo.current.dy))
          setDrag({ x, y })
        }
        const up = () => {
          setDrag((d) => {
            if (d) settings.update({ dockPos: { x: Math.round(d.x), y: Math.round(d.y) } })
            return d
          })
          dragInfo.current = null
          setDragging(false)
          document.body.style.userSelect = ''
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        return () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          document.body.style.userSelect = ''
        }
      }, [drag])

      if (cfg.ui !== 'dock') return null

      const hasTrans = Boolean(p.lyric.meta.hasTrans) || p.lyric.lines.some((l) => l.trans)

      const progress = p.dur > 0 ? Math.min(100, (p.cur / p.dur) * 100) : 0
      const floating = !cfg.dockLocked
      // 透明度设置要作用到播放条和展开菜单，透明模式则都清掉
      const transparent = cfg.bgMode === 'transparent'
      const dockBg = transparent
        ? 'transparent'
        : cfg.theme === 'dark'
          ? `rgba(24,26,33,${cfg.bgOpacity})`
          : `rgba(255,255,255,${cfg.bgOpacity})`
      const dockPanelBg = transparent
        ? 'transparent'
        : cfg.theme === 'dark'
          ? `rgba(26,28,36,${cfg.bgOpacity})`
          : `rgba(255,255,255,${cfg.bgOpacity})`
      const wrapStyle = { '--kgm-bg': dockBg, '--kgm-panel-bg': dockPanelBg }
      // 播放条宽度预设：贴合对话框 / 略窄 / 紧凑
      const DOCK_WIDTH = { full: [100, 680], wide: [90, 600], slim: [76, 500] }
      const dockW = DOCK_WIDTH[cfg.dockWidth] || DOCK_WIDTH.full
      let wrapClass = 'kgm-root'
      if (dragging) wrapClass += ' kgm-dragging'
      if (cfg.dockWidth === 'slim') wrapClass += ' kgm-dock-slim'
      else if (cfg.dockWidth === 'wide') wrapClass += ' kgm-dock-wide'
      if (floating) {
        wrapClass += ' kgm-floating'
        const moved = drag || cfg.dockPos
        // 浮动状态下宽度始终和输入框对齐（乘档位比例），拖动不改变宽度
        const floatW = holderBox
          ? Math.max(240, Math.round(holderBox.w * (dockW[0] / 100)))
          : Math.min(dockW[1], Math.round(window.innerWidth * 0.92))
        wrapStyle.width = floatW + 'px'
        if (moved) {
          wrapStyle.left = moved.x + 'px'
          wrapStyle.top = moved.y + 'px'
        } else if (holderBox) {
          // 复位 / 刚解锁：居中贴在聊天栏上方
          wrapStyle.left = Math.round(holderBox.x + (holderBox.w - floatW) / 2) + 'px'
          wrapStyle.top = holderBox.y + 'px'
        } else {
          // 还没量到默认位置时先居中兜底（不用 transform，免得影响 fixed 面板定位）
          wrapStyle.left = '50%'
          wrapStyle.bottom = '90px'
        }
      } else if (dockW[0] < 100) {
        wrapStyle.width = dockW[0] + '%'
        wrapStyle.margin = '0 auto'
      }

      // 支持按住拖动：pointerdown 定位 + 全局 pointermove 跟随
      const onSeek = (e) => {
        if (e.button) return
        e.preventDefault()
        const el = e.currentTarget
        const rect = el.getBoundingClientRect()
        const apply = (clientX) => {
          const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
          player.seekTo(ratio)
        }
        apply(e.clientX)
        const move = (ev) => apply(ev.clientX)
        const up = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          document.body.style.userSelect = ''
        }
        document.body.style.userSelect = 'none'
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      const inner = h(
        'div',
        { className: wrapClass, 'data-theme': cfg.theme, 'data-bg': cfg.bgMode, style: { ...wrapStyle, '--kgm-brand': cfg.accent } },
        h('style', null, CSS),
        expanded
          ? h(
              'div',
              {
                className: 'kgm-panel',
                style: panelBox
                  ? {
                      position: 'fixed',
                      left: panelBox.left,
                      width: panelBox.width,
                      right: 'auto',
                      bottom: panelBox.bottom,
                      height: panelBox.height,
                    }
                  : { height: 460 },
              },
              h(
                'div',
                { className: 'kgm-left' },
                h(
                  'div',
                  { className: 'kgm-tabs' },
                  h('button', { className: 'kgm-tab' + (tab === 'search' ? ' kgm-on' : ''), onClick: () => setTab('search') }, '搜歌'),
                  h('button', { className: 'kgm-tab' + (tab === 'playlist' ? ' kgm-on' : ''), onClick: () => setTab('playlist') }, '歌单'),
                  h('button', { className: 'kgm-tab' + (tab === 'queue' ? ' kgm-on' : ''), onClick: () => setTab('queue') }, '队列' + (p.queue.length ? ' · ' + p.queue.length : '')),
                  profile.loggedIn
                    ? h('span', { className: 'kgm-row', style: { marginLeft: 'auto', gap: 4 } },
                        h('img', { className: 'kgm-avatar', style: { width: 20, height: 20 }, src: API + '/avatar?url=' + encodeURIComponent(profile.avatar) }),
                        h('span', { className: 'kgm-uid', style: { maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, profile.nick || profile.userid),
                      )
                    : null,
                  h('button', { className: 'kgm-btn' + (profile.loggedIn || p.queue.length ? '' : ''), style: { marginLeft: profile.loggedIn ? 4 : 'auto' }, onClick: () => setTab(tab === 'settings' ? 'search' : 'settings'), title: '设置' }, Icon.gear()),
                  h('button', { className: 'kgm-btn', onClick: () => setExpanded(false), title: '收起' }, Icon.down()),
                ),
                p.error ? h('div', { className: 'kgm-err' }, p.error) : null,
                tab === 'settings'
                  ? h(Settings, { profile })
                  : h(Library, { tab }),
              ),
              h(
                'div',
                { className: 'kgm-right' },
                h(
                  'div',
                  { className: 'kgm-lyric-head' },
                  h('span', null, p.lyric.meta && p.lyric.meta.title ? p.lyric.meta.title : '歌词'),
                  h('span', null, [
                    p.lyric.meta && p.lyric.meta.wordByWord ? '逐字' : p.lyric.lines.length ? 'LRC' : '',
                    p.lyric.lines.length && cfg.showTrans ? (hasTrans ? '翻译' : '暂无翻译') : '',
                  ].filter(Boolean).join(' · ')),
                ),
                h('div', { className: 'kgm-lyric-box', ref: lyricRef }, h(LyricView, { lyric: p.lyric, cur: p.cur, boxRef: lyricRef, showTrans: cfg.showTrans })),
              ),
            )
          : null,
        h(
          'div',
          { className: 'kgm-bar', ref: barRef, onPointerDown: startDrag },
          h('button', { className: 'kgm-btn', onClick: () => setExpanded((v) => !v), title: expanded ? '收起' : '展开' }, expanded ? Icon.down() : Icon.up()),
          h('div', { className: 'kgm-cover' + (p.playing ? ' kgm-spin' : '') }, p.playing ? '' : '♫'),
          h(
            'div',
            { className: 'kgm-meta' },
            p.song ? h('div', { className: 'kgm-title' }, p.song.name) : h('div', { className: 'kgm-empty-meta' }, '酷狗 · 未播放'),
            p.song ? h('div', { className: 'kgm-singer' }, p.song.singer || (p.song.localPath ? '本地文件' : '')) : null,
          ),
          h(
            'div',
            { className: 'kgm-progress' },
            h(
              'div',
              { className: 'kgm-track', onPointerDown: onSeek, title: '点击跳转' },
              h('div', { className: 'kgm-track-bar' }),
              h('div', { className: 'kgm-track-fill', style: { width: progress + '%' } }),
              h('div', { className: 'kgm-thumb', style: { left: progress + '%' } }),
            ),
            h('span', { className: 'kgm-time' }, fmt(p.cur) + ' / ' + fmt(p.dur)),
          ),
          h('button', { className: 'kgm-btn', onClick: player.prev, disabled: !p.queue.length, title: '上一首' }, Icon.prev()),
          h('button', { className: 'kgm-main', onClick: player.toggle, title: p.playing ? '暂停' : '播放' }, p.playing ? Icon.pause() : Icon.play()),
          h('button', { className: 'kgm-btn', onClick: player.next, disabled: !p.queue.length, title: '下一首' }, Icon.next()),
          cfg.dockWidth !== 'slim'
            ? h(
                'button',
                {
                  className: 'kgm-mode-pill' + (cfg.playMode !== 'loop' ? ' kgm-on' : ''),
                  onClick: () => settings.update({ playMode: nextPlayMode(cfg.playMode) }),
                  title: '播放模式：' + MODE_LABEL[cfg.playMode] + '（点击切换）',
                  style: { height: 24 },
                },
                MODE_LABEL[cfg.playMode],
              )
            : null,
          cfg.dockWidth !== 'slim'
            ? h(
                'button',
                {
                  className: 'kgm-mode-pill' + (cfg.showTrans ? ' kgm-on' : ''),
                  onClick: () => settings.update({ showTrans: !cfg.showTrans }),
                  title: cfg.showTrans ? '关闭歌词翻译' : '打开歌词翻译',
                  style: { height: 24 },
                },
                '译',
              )
            : null,
          h('input', { className: 'kgm-volume', type: 'range', min: 0, max: 1, step: 0.01, value: p.volume, onChange: (e) => player.setVolume(Number(e.target.value)), title: '音量' }),
          h('button', {
            className: 'kgm-btn' + (cfg.dockLocked ? ' kgm-locked' : ''),
            onClick: () => settings.update({ dockLocked: !cfg.dockLocked }),
            title: cfg.dockLocked ? '已锁定：点击解锁拖动' : '未锁定：可拖动',
          }, Icon.lock(cfg.dockLocked)),
          !cfg.dockLocked
            ? h('button', { className: 'kgm-btn', onClick: () => { setDrag(null); settings.update({ dockPos: null }) }, title: '复位位置' }, Icon.reset())
            : null,
          cfg.dockWidth !== 'slim'
            ? h('button', { className: 'kgm-btn', onClick: () => { setExpanded(true); setTab('search') }, title: '搜歌' }, Icon.search())
            : null,
        ),
      )

      // 外层 holder 始终存在：浮动时给 inner 占位，同时用它量出「聊天栏上方」的默认坐标
      return h(
        'div',
        {
          ref: holderRef,
          style: floating ? { height: 52, position: 'relative' } : undefined,
        },
        inner,
      )
    }

    /* ------------------------------------------------------------------ */
    /* 侧边栏版                                                             */
    /* ------------------------------------------------------------------ */
    function KugouSide() {
      const cfg = useSettings()
      const p = usePlayer()
      const profile = useProfile()
      const [tab, setTab] = useState('search')
      const lyricRef = useRef(null)
      const [bubbleDrag, setBubbleDrag] = useState(null)
      const [bubbleDragging, setBubbleDragging] = useState(false)
      const bubbleInfo = useRef(null)
      const [bubbleIn, setBubbleIn] = useState(false)
      const prevBubbleRef = useRef([])

      // 气泡歌词：整块向上滚动的关键——记住上一句的窗口内容，
      // 切句时让「旧窗口向上滑出、新窗口从下补进来」
      const bubbleLinesAll = bubbleLinesOf(p.lyric, p.cur, cfg.bubbleLines)
      const bubbleAbs = (bubbleLinesAll.find((l) => l.active) || {}).abs
      useEffect(() => {
        prevBubbleRef.current = bubbleLinesAll
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [bubbleAbs])
      const prevBubbleLines = prevBubbleRef.current

      // 入场动画只播一次：挂载后下一帧加 class，后续重渲染不会重播
      useEffect(() => {
        if (!cfg.sideCollapsed) {
          setBubbleIn(false)
          return
        }
        const id = requestAnimationFrame(() => setBubbleIn(true))
        return () => cancelAnimationFrame(id)
      }, [cfg.sideCollapsed])

      useEffect(() => {
        if (!bubbleDrag) return
        document.body.style.userSelect = 'none'
        const move = (e) => {
          if (!bubbleInfo.current) return
          setBubbleDrag({
            x: Math.max(0, Math.min(window.innerWidth - 60, e.clientX - bubbleInfo.current.dx)),
            y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - bubbleInfo.current.dy)),
          })
        }
        const up = () => {
          setBubbleDrag((d) => {
            if (d) settings.update({ bubblePos: { x: Math.round(d.x), y: Math.round(d.y) } })
            return d
          })
          bubbleInfo.current = null
          setBubbleDragging(false)
          document.body.style.userSelect = ''
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        return () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          document.body.style.userSelect = ''
        }
      }, [bubbleDrag])

      if (cfg.ui !== 'side') return null

      const hasTrans = Boolean(p.lyric.meta.hasTrans) || p.lyric.lines.some((l) => l.trans)

      const progress = p.dur > 0 ? Math.min(100, (p.cur / p.dur) * 100) : 0
      const panelBg = cfg.theme === 'dark' ? `rgba(26,28,36,${cfg.bgOpacity})` : `rgba(255,255,255,${cfg.bgOpacity})`
      const onSeek = (e) => {
        if (e.button) return
        e.preventDefault()
        const el = e.currentTarget
        const rect = el.getBoundingClientRect()
        const apply = (clientX) => {
          const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
          player.seekTo(ratio)
        }
        apply(e.clientX)
        const move = (ev) => apply(ev.clientX)
        const up = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          document.body.style.userSelect = ''
        }
        document.body.style.userSelect = 'none'
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      if (cfg.sideCollapsed) {
        const bpos = bubbleDrag || cfg.bubblePos
        const bubbleStyle = {
          background: cfg.theme === 'dark' ? `rgba(26,28,36,${cfg.bgOpacity})` : `rgba(255,255,255,${cfg.bgOpacity})`,
          '--kgm-brand': cfg.accent,
          cursor: cfg.bubbleLocked ? 'default' : 'grab',
        }
        if (!cfg.bubbleLocked && bpos) {
          bubbleStyle.left = bpos.x + 'px'
          bubbleStyle.top = bpos.y + 'px'
          bubbleStyle.bottom = 'auto'
        }
        const startBubble = (e) => {
          if (cfg.bubbleLocked || e.target.closest('button, input, textarea')) return
          const rect = e.currentTarget.getBoundingClientRect()
          bubbleInfo.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
          setBubbleDrag({ x: rect.left, y: rect.top })
          setBubbleDragging(true)
          e.preventDefault()
        }
        const bubbleTrans = cfg.showTrans ? currentTrans(p.lyric, p.cur) : ''
        const bubbleList = bubbleLinesAll
        return h(
          'div',
          {
            className: 'kgm-bubble' + (bubbleIn ? ' kgm-in' : '') + (bubbleDragging ? ' kgm-dragging' : ''),
            'data-theme': cfg.theme,
            'data-bg': cfg.bgMode,
            style: { ...bubbleStyle, '--kgm-bubble-fs': cfg.bubbleFontSize + 'px' },
            onPointerDown: startBubble,
          },
          h('style', null, CSS),
          h(
            'div',
            { className: 'kgm-bubble-lyric' },
            bubbleList.length
              ? h(
                  'div',
                  { className: 'kgm-bubble-roller', key: 'roll-' + (bubbleAbs ?? 0) },
                  prevBubbleLines.length
                    ? h(
                        'div',
                        { className: 'kgm-bubble-roll-out' },
                        prevBubbleLines.map((l, i) =>
                          h('div', { key: i, className: 'kgm-bubble-line' + (l.active ? ' kgm-active' : '') }, l.text),
                        ),
                      )
                    : null,
                  h(
                    'div',
                    { className: 'kgm-bubble-roll-in' },
                    bubbleList.map((l, i) =>
                      h(
                        'div',
                        { key: i, className: 'kgm-bubble-line' + (l.active ? ' kgm-active' : '') },
                        l.text,
                        l.active && bubbleTrans ? h('div', { className: 'kgm-bubble-trans' }, bubbleTrans) : null,
                      ),
                    ),
                  ),
                )
              : h('div', { className: 'kgm-bubble-lyric-inner' }, h('div', null, p.song ? p.song.name : '♫ 酷狗音乐')),
          ),
          h(
            'div',
            { className: 'kgm-bubble-actions' },
            h('button', { className: 'kgm-main', onClick: player.toggle, title: p.playing ? '暂停' : '播放', style: { width: 32, height: 32 } }, p.playing ? Icon.pause() : Icon.play()),
            h('button', {
              className: 'kgm-hk-btn' + (cfg.showTrans ? ' kgm-on' : ''),
              style: { flex: 'none', width: 26, height: 26, padding: 0, borderRadius: 8 },
              onClick: () => settings.update({ showTrans: !cfg.showTrans }),
              title: cfg.showTrans ? '关闭歌词翻译' : '打开歌词翻译',
            }, '译'),
            h('button', {
              className: 'kgm-btn' + (cfg.bubbleLocked ? ' kgm-locked' : ''),
              onClick: () => settings.update({ bubbleLocked: !cfg.bubbleLocked }),
              title: cfg.bubbleLocked ? '已锁定：点击解锁拖动' : '未锁定：可拖动',
            }, Icon.lock(cfg.bubbleLocked)),
            !cfg.bubbleLocked
              ? h('button', { className: 'kgm-btn', onClick: () => { setBubbleDrag(null); settings.update({ bubblePos: null }) }, title: '复位' }, Icon.reset())
              : null,
            h('button', { className: 'kgm-btn', onClick: () => settings.update({ sideCollapsed: false }), title: '展开侧边栏' }, Icon.expand()),
          ),
        )
      }

      return h(
        'div',
        {
          className: 'kgm-side',
          'data-theme': cfg.theme,
          'data-bg': cfg.bgMode,
          style: { '--kgm-brand': cfg.accent, background: cfg.bgMode === 'transparent' ? 'transparent' : panelBg },
        },
        h('style', null, CSS),
        h(
          'div',
          { className: 'kgm-side-head' },
          profile.loggedIn && profile.avatar
            ? h('img', { className: 'kgm-avatar', src: API + '/avatar?url=' + encodeURIComponent(profile.avatar), alt: '' })
            : h('div', { className: 'kgm-avatar kgm-avatar-empty' }, '♫'),
          h(
            'div',
            { style: { minWidth: 0, flex: 1 } },
            h('div', { className: 'kgm-nick' }, profile.loggedIn ? profile.nick || '酷狗用户' : '未登录'),
            h('div', { className: 'kgm-uid' }, profile.loggedIn ? 'UID ' + profile.userid : '在设置 → 账号里填 Cookie'),
          ),
          h('button', { className: 'kgm-btn', onClick: () => setTab('settings'), title: '设置' }, Icon.gear()),
          h('button', { className: 'kgm-btn', onClick: () => settings.update({ sideCollapsed: true }), title: '收起' }, Icon.collapse()),
        ),
        h(
          'div',
          { className: 'kgm-side-tabs' },
          h('button', { className: 'kgm-tab' + (tab === 'search' ? ' kgm-on' : ''), onClick: () => setTab('search') }, '搜歌'),
          h('button', { className: 'kgm-tab' + (tab === 'playlist' ? ' kgm-on' : ''), onClick: () => setTab('playlist') }, '歌单'),
          h('button', { className: 'kgm-tab' + (tab === 'queue' ? ' kgm-on' : ''), onClick: () => setTab('queue') }, '队列' + (p.queue.length ? ' · ' + p.queue.length : '')),
        ),
        p.error ? h('div', { className: 'kgm-err' }, p.error) : null,
        h(
          'div',
          { className: 'kgm-side-body' },
          tab === 'settings' ? h(Settings, { profile }) : h(Library, { tab, compact: true }),
        ),
        h(
          'div',
          { className: 'kgm-side-lyric' },
          h('div', { className: 'kgm-lyric-head' }, h('span', null, p.lyric.meta && p.lyric.meta.title ? p.lyric.meta.title : '歌词'), h('span', null, [
            p.lyric.meta && p.lyric.meta.wordByWord ? '逐字' : '',
            p.lyric.lines.length && cfg.showTrans ? (hasTrans ? '翻译' : '暂无翻译') : '',
          ].filter(Boolean).join(' · '))),
          h('div', { className: 'kgm-lyric-box', ref: lyricRef }, h(LyricView, { lyric: p.lyric, cur: p.cur, boxRef: lyricRef, showTrans: cfg.showTrans })),
        ),
        h(
          'div',
          { className: 'kgm-side-player' },
          h(
            'div',
            { className: 'kgm-row', style: { marginBottom: 6 } },
            h('div', { className: 'kgm-side-cover' + (p.playing ? ' kgm-spin' : '') }, p.playing ? '' : '♫'),
            h(
              'div',
              { style: { minWidth: 0, flex: 1 } },
              h('div', { className: 'kgm-title' }, p.song ? p.song.name : '酷狗 · 未播放'),
              h('div', { className: 'kgm-singer' }, p.song ? p.song.singer || (p.song.localPath ? '本地文件' : '') : ''),
            ),
            h('button', { className: 'kgm-btn', onClick: player.prev, disabled: !p.queue.length, title: '上一首' }, Icon.prev()),
            h('button', { className: 'kgm-main', onClick: player.toggle, title: p.playing ? '暂停' : '播放' }, p.playing ? Icon.pause() : Icon.play()),
            h('button', { className: 'kgm-btn', onClick: player.next, disabled: !p.queue.length, title: '下一首' }, Icon.next()),
            h(
              'button',
              {
                className: 'kgm-mode-pill' + (cfg.playMode !== 'loop' ? ' kgm-on' : ''),
                onClick: () => settings.update({ playMode: nextPlayMode(cfg.playMode) }),
                title: '播放模式：' + MODE_LABEL[cfg.playMode],
                style: { height: 22 },
              },
              MODE_LABEL[cfg.playMode],
            ),
            h(
              'button',
              {
                className: 'kgm-mode-pill' + (cfg.showTrans ? ' kgm-on' : ''),
                onClick: () => settings.update({ showTrans: !cfg.showTrans }),
                title: cfg.showTrans ? '关闭歌词翻译' : '打开歌词翻译',
                style: { height: 22 },
              },
              '译',
            ),
          ),
          h(
            'div',
            { className: 'kgm-row' },
            h('span', { className: 'kgm-time' }, fmt(p.cur)),
            h(
              'div',
              { className: 'kgm-track', onPointerDown: onSeek, style: { flex: 1 } },
              h('div', { className: 'kgm-track-bar' }),
              h('div', { className: 'kgm-track-fill', style: { width: progress + '%' } }),
              h('div', { className: 'kgm-thumb', style: { left: progress + '%' } }),
            ),
            h('span', { className: 'kgm-time' }, fmt(p.dur)),
          ),
          h(
            'div',
            { className: 'kgm-row' },
            h('input', { className: 'kgm-volume', type: 'range', min: 0, max: 1, step: 0.01, value: p.volume, onChange: (e) => player.setVolume(Number(e.target.value)), style: { flex: 1, width: 'auto' } }),
          ),
        ),
      )
    }

    /** 左侧边栏（工作文件夹下方）的歌词条。 */
    function KugouMini() {
      const cfg = useSettings()
      const p = usePlayer()
      if (!cfg.lyricSidebar || cfg.ui === 'side') return null
      const line = currentLine(p.lyric, p.cur)
      const bg = cfg.theme === 'dark' ? `rgba(26,28,36,${cfg.bgOpacity})` : `rgba(255,255,255,${cfg.bgOpacity})`
      return h(
        'div',
        {
          className: 'kgm-mini',
          'data-theme': cfg.theme,
          'data-bg': cfg.bgMode,
          style: { background: cfg.bgMode === 'transparent' ? 'transparent' : bg, '--kgm-brand': cfg.accent },
          onClick: () => settings.update({ ui: 'side', sideCollapsed: false }),
          title: '点击打开酷狗侧边栏',
        },
        h('style', null, CSS),
        h('div', { className: 'kgm-mini-line' }, line || (p.song ? p.song.name : '酷狗音乐 · 未播放')),
        p.song ? h('div', { className: 'kgm-mini-song' }, p.song.name + (p.song.singer ? ' · ' + p.song.singer : '')) : null,
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
        slots.inject('shell.overlay', () =>
          slots.register(
            { name: 'shell.overlay', id: 'kugou-music-side', order: 900 },
            () => h(KugouSide),
          ),
        )
        slots.inject('shell.overlay', () =>
          slots.register(
            { name: 'shell.overlay', id: 'kugou-music-mini', order: 901 },
            () => h(KugouMini),
          ),
        )
      },
    }
  },
})
