# 双语 X 阅读器

一个完全无服务器的 X（Twitter）阅读器。
GitHub Actions 定时抓取指定创作者的公开帖子，把 JSON 提交进仓库，再构建成 GitHub Pages 静态站点。
页面上英文原文与中文译文并排显示，译文在阅读时由浏览器直接调用 Gemini 按需生成并缓存在本机。
有新帖时通过 ntfy.sh 推送到手机。

## 工作方式

```
GitHub Actions（每小时 :17、push、手动）
  update  : scripts/pipeline.ts 拉取 FxEmbed → 归一化 → 写 public/data/*.json → 提交
            npm run build → dist/（含 feed.xml / atom.xml / feed.json / 404.html）
  deploy  : actions/deploy-pages
  notify  : scripts/notify.ts → ntfy.sh（仅在有新帖且部署成功后）

GitHub Pages 静态站点（Vite + React + Tailwind + PWA）
  运行时读取 data/*.json；帖子滚入视口时调用 Gemini 翻译，结果缓存到 IndexedDB
```

- 数据源是 FxEmbed 的公开 API（`api.fxtwitter.com`），免费、无需鉴权，长文完整。
  它放在 `scripts/source/` 的 `PostSource` 接口后面，将来可以换成别的来源。
- 抓取范围：创作者的原创帖、自己的连续推文（thread）和转发；不含回复他人。
- 数据按月分片存放在 `public/data/posts/YYYY-MM.json`，`index.json` 是目录，`latest.json` 是最新 100 条。
- 仓库里没有任何 LLM key。
  Gemini API key 由每位读者在站点设置里自行填写，只存在自己浏览器的 localStorage 中。

## 部署步骤

1. 创建一个**公开**的 GitHub 仓库（公开仓库的 Actions 分钟不限量），把本项目推送到 `main`。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
3. 仓库 Settings → Secrets and variables → Actions → New repository secret：
   `NTFY_TOPIC` = 一段又长又随机的字符串（例如 `xreader-7f3a9c2e1b`）。
   主题名就是唯一的“密码”，知道它的人都能收到和发送通知。
4. 手机安装 ntfy 应用（iOS / Android），订阅同名主题。
5. Actions → pipeline → Run workflow。
   首次运行建议勾选 `skip_notify`，避免把整批历史帖子当作新帖推送。
6. 三个 job 全绿后打开 Pages 地址。
   手机上可从浏览器菜单“添加到主屏幕”安装为 PWA。
7. 在 [Google AI Studio](https://aistudio.google.com/apikey) 免费获取 Gemini API key，点站点右上角的设置图标粘贴进去。
   每台设备各粘贴一次。

之后每小时自动运行一次。
GitHub 的定时任务经常延迟几分钟到几十分钟，属正常现象。
Pages 有 10 分钟的 CDN 缓存，新帖提交后最多约 10 分钟可见。

## 添加创作者

编辑 `creators.json`，追加一项 `{ "screen_name": "xxx" }` 并推送。
下一次运行会为新账号回填最近 `BACKFILL_PAGES` 页（默认 25 页，约 500 条），站点顶部会出现创作者筛选。

## 本地开发

```bash
npm install
cp .env.example .env          # 可选，调整 BACKFILL_PAGES 等
npm run pipeline              # 抓取数据到 public/data/
npm run dev                   # http://localhost:5173
npm run build && npm run preview
npm run typecheck
```

测试通知：

```bash
NTFY_TOPIC=<topic> SITE_URL=http://localhost:4173/ NEW_IDS=<某条帖子的 id> npm run notify
```

## 目录

```
.github/workflows/pipeline.yml   抓取 → 部署 → 通知
creators.json                    关注的创作者
scripts/                         Node 24 直接运行的 TypeScript 脚本
  pipeline.ts  store.ts  notify.ts  postbuild.ts  source/
src/                             前端
  shared/      scripts 与前端共用的类型和排序规则
  translate/   浏览器端按需翻译：队列、缓存、Gemini 调用
  components/  界面组件
public/data/                     数据文件（由流水线生成并提交）
```
