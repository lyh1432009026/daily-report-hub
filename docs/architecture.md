# 技术架构说明

## 1. 总体方案

本项目采用 **Vite + React 静态站** 架构。

核心思想：

1. 每篇日报作为独立 JSON 文件存放在 `data/reports/*.json`
2. 构建前运行 `scripts/generate-index.mjs`
3. 脚本扫描、校验、排序日报数据
4. 输出统一索引文件 `public/reports-index.json`
5. React 前端在运行时读取 `/reports-index.json` 并展示

该方案不依赖数据库，也不需要后端服务，适合低成本部署。

## 2. 目录结构

```text
daily-report-site/
├── data/
│   └── reports/                # 原始日报 JSON
├── docs/                       # 产品和架构文档
├── public/
│   └── reports-index.json       # 构建脚本生成的前端索引
├── scripts/
│   └── generate-index.mjs       # 数据索引生成脚本
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
└── README.md
```

## 3. 日报数据格式

单篇日报文件示例：

```json
{
  "id": "2026-05-12-frontend",
  "title": "前端技术日报：React、Vite 与 AI 工具链",
  "date": "2026-05-12",
  "category": "frontend",
  "summary": "今日前端关注点集中在 React 渲染边界、Vite 构建体验，以及 AI 辅助组件生成。",
  "tags": ["React", "Vite"],
  "highlights": ["重点一", "重点二"],
  "sections": [
    {
      "title": "React 架构取舍",
      "content": "详细内容"
    }
  ],
  "sourceLinks": [
    {
      "label": "来源名称",
      "url": "https://example.com"
    }
  ]
}
```

### 分类枚举

- `frontend`：前端技术
- `finance`：金融日报

## 4. 构建脚本职责

`scripts/generate-index.mjs` 负责：

- 扫描 `data/reports/*.json`
- 校验必填字段
- 校验分类合法性
- 按 `date` 降序排序
- 输出 `public/reports-index.json`

前端只读取生成后的索引文件，不直接访问 `data/reports`。

## 5. 前端职责

React 前端负责：

- 加载 `/reports-index.json`
- 显示统计数据
- 按日期倒序展示卡片
- 分类筛选
- 关键词搜索
- 详情展示
- 响应式布局

## 6. 部署方案

### Vercel

- Build Command：`npm run generate && npm run build`
- Output Directory：`dist`

### Netlify

- Build Command：`npm run generate && npm run build`
- Publish Directory：`dist`

### GitHub Pages

- 在 CI 中执行：

```bash
npm ci
npm run generate
npm run build
```

- 发布 `dist/` 目录

### Nginx

- 执行构建后，将 `dist/` 上传到服务器
- 用 Nginx 指向该目录作为静态站根目录

## 7. 后续扩展

- 接入定时任务自动生成日报 JSON
- 增加 RSS 输出
- 增加 Markdown 渲染
- 增加按月份归档
- 增加来源可信度标记
- 增加部署到对象存储/CDN
