# 断网杯 · 裁判验收包

> 「断网后的奔跑，是赛博朋克的浪漫与黑色幽默。」
> 局域网派对跑酷：大屏是赛道，手机是手柄，1024 米后打终极仙人掌王。

## 最快跑起来（Windows）

1. 安装 Node.js 18+（https://nodejs.org/，一路 Next 即可）
2. 双击 **`start-windows.bat`**
3. 浏览器打开 **http://localhost:3000**
4. 点「⌨ 键盘入场」→ 「开始」，直接玩

不需要 `npm install`，不需要联网，没有外部 CDN 依赖。

macOS / Linux：

```bash
chmod +x start-mac-linux.sh
./start-mac-linux.sh
```

或者手动：

```bash
node server.js
```

## 三块屏

| 页面 | 地址 | 用途 |
|---|---|---|
| 大屏 | `/` | 赛道、解说、Boss |
| 手机手柄 | `/pad` | 同一 Wi-Fi 扫码加入；跳/冲刺/下蹲/整蛊 |
| 许愿池 | `/wish` | 手机写愿望，实时上屏 |
| 观众席 | `/background` | 多机位分屏，只读 |

手机连同一个 Wi-Fi，扫大屏二维码即可。找不到中文 TTS 语音不影响游戏，字幕照常。

## 验收操作

- `空格` / 手机大按钮：跳
- `Shift`：冲刺；冲刺后 0.46 秒内 `C`：滑铲
- `Q`：整蛊；`F`：上载具/起飞；`W`：大屏许愿
- 演示键：`T` 跳疯狂水世界，`R` 发 Roadster 钥匙 + `F` 起飞，`B` 直接看 Boss
- 系统公告「禁止跳跃」不是暂停：跳了反而 +3 缺德值，这是送分题

## 内容清单

- Chrome 断网小恐龙、Deepseek Chan 深蓝女仆、橙发女仆，三种 64 位像素形象
- Tesla Roadster 喷气起飞、尊界 V800 地面载具
- 疯狂水世界：海水过滤器 / 电鳗发电机 / 刺豚制氧机
- 1024 米后 Boss「终极仙人掌王」，许愿池实时改写战局
- 手机端性能自适应、60Hz 服务端权威循环、SSE 背压

![同屏竞速](docs/game.png)
![三种形象](docs/characters-game.png)
![Roadster 起飞](docs/roadster-fly.png)
![疯狂水世界](docs/water-live.png)

## 自测

```bash
node test/wish.js        # 19/19
node test/smoke.js       # 13/13（需服务已启动）
node test/features.js    # 19/19（需服务已启动）
node test/wish-live.js   # 12/12（需服务已启动）
```

## 目录

```text
duanwang-cup/
├─ start-windows.bat
├─ start-mac-linux.sh
├─ server.js          # 零依赖 Node 服务端
├─ wish.js            # 离线中文许愿规则解析
├─ public/            # 大屏 / 手机 / 许愿 / 观众席 / PV
├─ docs/              # 截图、设计说明、演示视频
└─ test/              # 自动化测试
```

## 在线体验

**https://duanwang.fiddling.work**

云端版部署在 Cloudflare Workers + Durable Objects，不再依赖演示机开机；本压缩包用于本地离线运行。
