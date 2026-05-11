# 日报展示网站

一个用于展示 AI 自动生成日报的静态网站，按日期倒序展示，分为 **前端技术** 和 **金融日报** 两类。

## 功能

- 按天倒序展示日报
- 分类筛选：全部 / 前端技术 / 金融日报
- 搜索标题、摘要、标签和详情内容
- 点击卡片查看日报详情
- 静态站，方便部署

## 安装

```bash
npm install
```

## 生成日报索引

```bash
npm run generate
```

该命令会扫描：

```text
data/reports/*.json
```

并生成：

```text
public/reports-index.json
```

## 本地开发

```bash
npm run generate
npm run dev
```

## 构建

```bash
npm run generate
npm run build
```

构建产物在：

```text
dist/
```

## 部署

### Vercel

- Build Command：`npm run generate && npm run build`
- Output Directory：`dist`

### Netlify

- Build Command：`npm run generate && npm run build`
- Publish Directory：`dist`

### GitHub Pages

CI 中执行：

```bash
npm ci
npm run generate
npm run build
```

然后发布 `dist/`。

### Nginx

构建后把 `dist/` 上传到服务器静态目录即可。

## 日报 JSON 格式

```json
{
  "id": "2026-05-12-frontend",
  "title": "日报标题",
  "date": "2026-05-12",
  "category": "frontend",
  "summary": "日报摘要",
  "tags": ["标签"],
  "highlights": ["重点"],
  "sections": [
    {
      "title": "段落标题",
      "content": "段落内容"
    }
  ],
  "sourceLinks": [
    {
      "label": "来源",
      "url": "https://example.com"
    }
  ]
}
```

分类：

- `frontend`：前端技术
- `finance`：金融日报
