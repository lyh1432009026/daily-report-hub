import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'data', 'reports');

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const TAVILY_URL = 'https://api.tavily.com/search';

const TOPICS = [
  {
    key: 'frontend-frameworks',
    category: 'frontend',
    titlePrefix: '前端框架日报',
    query: (date) => `${date} 前端框架 React Vue Next.js Vite TypeScript 技术新闻 中文`,
    tags: ['React', 'Vue', 'Next.js', 'Vite', 'TypeScript', '前端框架'],
    fallback: [
      { title: 'React 官方动态', url: 'https://react.dev/', content: 'React 官方文档、生态升级、组件模型和工程实践更新。' },
      { title: 'Vue 官方动态', url: 'https://vuejs.org/', content: 'Vue 生态、组合式 API、工具链和社区实践更新。' },
      { title: 'Next.js 官方动态', url: 'https://nextjs.org/blog', content: 'Next.js 路由、渲染、缓存、部署和全栈开发相关更新。' },
    ],
  },
  {
    key: 'frontend-ai',
    category: 'frontend',
    titlePrefix: 'AI 编程日报',
    query: (date) => `${date} AI 编程 前端开发 代码助手 Claude Codex Cursor Copilot 中文`,
    tags: ['AI 编程', '代码助手', '前端效率', '自动化', '工程化'],
    fallback: [
      { title: 'AI 编程工具观察', url: 'https://github.blog/', content: 'AI 代码助手正在影响需求拆解、代码生成、测试生成和代码审查流程。' },
      { title: '工程效率观察', url: 'https://martinfowler.com/', content: '团队需要关注 AI 辅助开发的质量边界、审查机制和交付节奏。' },
      { title: '前端自动化观察', url: 'https://frontendmasters.com/blog/', content: '组件生成、样式生成、调试和文档维护是 AI 工具常见落地方向。' },
    ],
  },
  {
    key: 'frontend-tooling',
    category: 'frontend',
    titlePrefix: '前端工程化日报',
    query: (date) => `${date} 前端工程化 构建工具 Vite Turbopack Bun pnpm 测试 部署 中文`,
    tags: ['工程化', '构建工具', '测试', '部署', '性能优化'],
    fallback: [
      { title: 'Vite 工具链', url: 'https://vite.dev/', content: 'Vite 继续围绕开发体验、构建性能、插件生态和框架集成演进。' },
      { title: '前端测试与发布', url: 'https://web.dev/', content: '前端工程化重点在构建速度、缓存策略、自动化测试、性能预算和发布稳定性。' },
      { title: '包管理与运行时', url: 'https://bun.sh/blog', content: '包管理器和 JavaScript 运行时变化会影响安装速度、本地开发和 CI 构建效率。' },
    ],
  },
  {
    key: 'finance-a-stock',
    category: 'finance',
    titlePrefix: 'A股市场日报',
    query: (date) => `${date} A股 今日行情 板块 资金 ETF 指数 财经新闻 中文`,
    tags: ['A股', '指数', '板块', 'ETF', '资金流向', '市场情绪'],
    fallback: [
      { title: '东方财富 A股资讯', url: 'https://www.eastmoney.com/', content: 'A股市场关注指数表现、热门板块、成交量变化和资金流向。' },
      { title: '证券时报 市场动态', url: 'https://www.stcn.com/', content: '资本市场政策、上市公司动态和行业轮动是观察 A股的重要线索。' },
      { title: '新浪财经 A股', url: 'https://finance.sina.com.cn/stock/', content: '盘面情绪、热点题材和机构观点会影响短期交易节奏。' },
    ],
  },
  {
    key: 'finance-global',
    category: 'finance',
    titlePrefix: '全球市场日报',
    query: (date) => `${date} 港股 美股 全球市场 科技股 利率 美元 黄金 原油 中文`,
    tags: ['港股', '美股', '全球市场', '科技股', '利率', '黄金'],
    fallback: [
      { title: '全球市场观察', url: 'https://finance.sina.com.cn/world/', content: '全球市场重点关注美股科技股、港股互联网、美元利率、黄金和原油波动。' },
      { title: '宏观风险偏好', url: 'https://www.yicai.com/', content: '海外利率预期、汇率走势和地缘消息会影响全球风险资产定价。' },
      { title: '港美股资金面', url: 'https://www.aastocks.com/', content: '港股和美股的科技权重表现，常常影响亚洲市场风险偏好。' },
    ],
  },
  {
    key: 'finance-fund-etf',
    category: 'finance',
    titlePrefix: '基金 ETF 日报',
    query: (date) => `${date} 基金 ETF 债券 黄金 半导体 红利 资金流向 中文`,
    tags: ['基金', 'ETF', '债券', '黄金', '红利', '半导体'],
    fallback: [
      { title: 'ETF 资金观察', url: 'https://fund.eastmoney.com/', content: 'ETF 是观察资金偏好的重要入口，重点看宽基、行业、债券和黄金方向。' },
      { title: '基金市场动态', url: 'https://finance.sina.com.cn/fund/', content: '基金发行、份额变化和净值波动反映中长期资金配置变化。' },
      { title: '债券与黄金', url: 'https://www.cs.com.cn/', content: '债券、黄金等资产常用于观察避险需求和利率预期变化。' },
    ],
  },
];

function hkDateParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function tavilySearch(query) {
  if (!TAVILY_API_KEY) {
    return { results: [] };
  }

  const response = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      include_answer: false,
      include_raw_content: false,
      max_results: 6,
      country: 'china',
      topic: 'news',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily search failed: ${response.status} ${text}`);
  }

  return response.json();
}

function cleanText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function truncate(text, maxLen = 120) {
  const cleaned = cleanText(text);
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen)}...` : cleaned;
}

function containsChinese(text = '') {
  return /[\u4e00-\u9fff]/.test(text);
}

function stripBoilerplate(text = '') {
  return cleanText(text)
    .replace(/Notice:.*$/i, '')
    .replace(/The content above.*$/i, '')
    .replace(/Recent posts?:.*$/i, '')
    .replace(/Conclusion\s+/gi, '')
    .trim();
}

function firstChineseSentence(text, maxLen = 110) {
  const cleaned = stripBoilerplate(text);
  if (!containsChinese(cleaned)) return '';
  const sentence = cleaned.split(/[。！？!?]/).find((item) => containsChinese(item)) || cleaned;
  return truncate(sentence, maxLen);
}

function topicKeywords(text = '', topic) {
  const lower = text.toLowerCase();
  const pairs = topic.category === 'finance'
    ? [
        ['etf', 'ETF'], ['a股', 'A股'], ['港股', '港股'], ['美股', '美股'], ['gold', '黄金'], ['黄金', '黄金'],
        ['bond', '债券'], ['债券', '债券'], ['fund', '基金'], ['基金', '基金'], ['semiconductor', '半导体'],
        ['半导体', '半导体'], ['科技', '科技'], ['macro', '宏观'], ['market', '市场'], ['红利', '红利资产'],
      ]
    : [
        ['react', 'React'], ['next', 'Next.js'], ['vite', 'Vite'], ['typescript', 'TypeScript'], ['javascript', 'JavaScript'],
        ['vue', 'Vue'], [' ai ', 'AI 编程'], ['ai coding', 'AI 编程'], ['security', '安全更新'], ['vulnerability', '安全更新'],
        ['performance', '性能优化'], ['compiler', '编译器'], ['test', '测试'], ['deploy', '部署'], ['build', '构建'],
      ];

  const tags = [];
  for (const [needle, label] of pairs) {
    if (text.includes(needle) || lower.includes(needle.toLowerCase())) tags.push(label);
  }
  return [...new Set(tags)];
}

function itemToChinesePoint(item, topic, index = 0) {
  const title = cleanText(item.title || '');
  const content = cleanText(item.content || item.snippet || '');
  const chinese = firstChineseSentence(content || title, 96);
  if (chinese) return chinese;

  const tags = topicKeywords(`${title} ${content}`, topic);
  if (topic.category === 'finance') {
    const fallbackFocus = ['指数与板块轮动', 'ETF 与基金资金流', '黄金、债券和宏观风险偏好'];
    const focus = tags.length ? tags.slice(0, 3).join('、') : fallbackFocus[index % fallbackFocus.length];
    return `市场信息显示，${focus}仍是今日资金和情绪观察重点，需结合成交量与政策预期判断持续性。`;
  }

  const fallbackFocus = ['框架生态', 'AI 编程效率', '构建、测试与部署链路'];
  const focus = tags.length ? tags.slice(0, 3).join('、') : fallbackFocus[index % fallbackFocus.length];
  return `前端生态今日重点关注${focus}相关变化，建议结合项目依赖、升级成本和团队工程规范评估落地。`;
}

function makeHighlights(results, topic) {
  const base = [];

  for (const [index, item] of results.entries()) {
    if (base.length >= 4) break;
    const point = itemToChinesePoint(item, topic, index);
    if (point && !base.includes(point)) base.push(point);
  }

  for (const [index, item] of topic.fallback.entries()) {
    if (base.length >= 4) break;
    const point = itemToChinesePoint(item, topic, index);
    if (point && !base.includes(point)) base.push(point);
  }

  return base.slice(0, 4).map((item) => truncate(item, 120));
}

function makeSections(results, topic) {
  const points = makeHighlights(results, topic);

  if (topic.category === 'finance') {
    return [
      {
        title: '今日主线',
        content: `${points[0]} 重点结合指数强弱、成交活跃度、行业轮动和消息催化判断持续性。`,
      },
      {
        title: '资金观察',
        content: `${points[1]} 若 ETF、基金份额或高成交方向持续变化，通常说明资金偏好正在切换。`,
      },
      {
        title: '明日关注',
        content: `${points[2] || '继续关注政策预期、海外市场和重要数据。'} 操作上避免单看热点追高，优先关注风险收益比。`,
      },
      {
        title: '风险提示',
        content: '本日报仅作公开信息整理，不构成投资建议。高弹性板块波动通常更大，应关注估值、成交量和消息兑现风险。',
      },
    ];
  }

  return [
    {
      title: '生态动态',
      content: `${points[0]} 对团队来说，优先关注是否影响现有技术栈、依赖升级路径和长期维护成本。`,
    },
    {
      title: '工程效率',
      content: `${points[1]} 可以重点评估构建速度、类型安全、测试生成、代码审查和部署链路是否有实际收益。`,
    },
    {
      title: '落地建议',
      content: `${points[2] || '新技术先小范围验证，再进入主项目。'} 涉及框架大版本、安全补丁或构建链路变化时，应同步补充回滚方案和兼容性检查。`,
    },
    {
      title: '团队提醒',
      content: '日报内容适合做早会输入：先看是否影响当前项目，再决定是否安排调研、升级或试点。',
    },
  ];
}

function sourceLinks(results, topic) {
  const links = results
    .filter((item) => item.url)
    .slice(0, 5)
    .map((item) => ({ label: truncate(cleanText(item.title || item.url), 80), url: item.url }));

  if (links.length) return links;
  return topic.fallback.map((item) => ({ label: item.title, url: item.url }));
}

function makeSummary(results, topic) {
  const highlights = makeHighlights(results, topic);
  if (topic.category === 'finance') {
    return `${topic.titlePrefix}聚焦${topic.tags.slice(0, 5).join('、')}等方向。核心看点：${highlights.slice(0, 3).join('；')}`;
  }
  return `${topic.titlePrefix}聚焦${topic.tags.slice(0, 5).join('、')}等方向。核心看点：${highlights.slice(0, 3).join('；')}`;
}

async function createReport(topic, date) {
  let data;
  try {
    data = await tavilySearch(topic.query(date));
  } catch (error) {
    console.warn(error.message);
    data = { results: [] };
  }

  const results = Array.isArray(data.results) && data.results.length ? data.results : topic.fallback;
  const highlights = makeHighlights(results, topic);
  const sections = makeSections(results, topic);

  return {
    id: `${date}-${topic.key}`,
    title: `${topic.titlePrefix}：${date}`,
    date,
    category: topic.category,
    summary: makeSummary(results, topic),
    tags: topic.tags,
    highlights,
    sections,
    sourceLinks: sourceLinks(results, topic),
  };
}

async function main() {
  const date = process.argv[2] || hkDateParts();
  await mkdir(reportsDir, { recursive: true });

  const reports = [];
  for (const topic of TOPICS) {
    reports.push(await createReport(topic, date));
  }

  for (const report of reports) {
    const file = path.join(reportsDir, `${report.id}.json`);
    await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${path.relative(root, file)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
