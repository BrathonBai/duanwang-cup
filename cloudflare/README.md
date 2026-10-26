# Cloudflare 版本

线上地址：**https://duanwang.fiddling.work**

- `src/game-core.js`：从本地零依赖 Node 版抽出的游戏逻辑（房间/物理/道具/许愿/Boss）
- `src/index.js`：Cloudflare Worker + Durable Object；静态资源走 Assets，实时画面走 WebSocket
- `src/wish.js`：离线许愿规则解析的 ESM 版本
- `wrangler.toml`：DO 绑定、Assets、`duanwang.fiddling.work` 路由

## 部署

```powershell
$env:CLOUDFLARE_API_TOKEN="..."
$env:CLOUDFLARE_ACCOUNT_ID="..."
cd cloudflare
npx wrangler@4 deploy
```

不需要本机 Node 常驻；Durable Object 持有房间状态，WebSocket 负责 60Hz 快照，静态页面由 Worker Assets 提供。

## 本地开发

```powershell
cd cloudflare
npx wrangler@4 dev
```

前端会根据 HTTPS 自动切换到 `/ws`；HTTP 本地 Node 版继续用 SSE。
