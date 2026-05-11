import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'data', 'reports');

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const TAVILY_URL = 'https://api.tavily.com/search';

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

function fallbackSources(topic) {
  if (topic === 'finance') {
    return [
      { title: '东方财富', url: 'https://www.eastmoney.com/', content: '金融市场资讯、A股、基金与 ETF 观察。' },
      { title: '证券时报', url: 'https://www.stcn.com/', content: '资本市场、政策与行业动态。' },
      { title: '新浪财经', url: 'https://finance.sina.com.cn/', content: '财经新闻、市场快讯与宏观观察。' },
    ];
  }
  return [
    { title: 'React 官方动态', url: 'https://react.dev/', content: 'React 官方文档与生态更新。' },
    { title: 'Vite 官方动态', url: 'https://vite.dev/', content: 'Vite 构建工具与开发体验。' },
    { title: '前端工程化观察', url: 'https://frontendmasters.com/blog/', content: '前端技术文章与趋势观察。' },
  ];
}

async function tavilySearch(query) {
  if (!TAVILY_API_KEY) {
    return { answer: '', results: [] };
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

function stripEnglishBoilerplate(text = '') {
  return cleanText(text)
    .replace(/Notice:.*$/i, '')
    .replace(/The content above.*$/i, '')
    .replace(/Recent posts?:.*$/i, '')
    .replace(/Conclusion\s+/gi, '')
    .trim();
}

function firstChineseSentence(text, maxLen = 110) {
  const cleaned = stripEnglishBoilerplate(text);
  if (!containsChinese(cleaned)) return '';
  const sentence = cleaned.split(/[。！？!?]/).find((item) => containsChinese(item)) || cleaned;
  return truncate(sentence, maxLen);
}

function keywordTags(text = '', topic = 'frontend') {
  const lower = text.toLowerCase();
  const tags = [];
  const pairs = topic === 'finance'
    ? [
        ['etf', 'ETF'],
        ['a股', 'A股'],
        ['港股', '港股'],
        ['美股', '美股'],
        ['gold', '黄金'],
        ['黄金', '黄金'],
        ['bond', '债券'],
        ['债券', '债券'],
        ['fund', '基金'],
        ['基金', '基金'],
        ['semiconductor', '半导体'],
        ['半导体', '半导体'],
        ['科技', '科技'],
        ['macro', '宏观'],
        ['market', '市场'],
      ]
    : [
        ['react', 'React'],
        ['next', 'Next.js'],
        ['vite', 'Vite'],
        ['typescript', 'TypeScript'],
        ['javascript', 'JavaScript'],
        ['vue', 'Vue'],
        [' ai ', 'AI 编程'],
        ['ai coding', 'AI 编程'],
        ['security', '安全更新'],
        ['vulnerability', '安全更新'],
        ['performance', '性能优化'],
        ['compiler', '编译器'],
      ];
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

  const tags = keywordTags(`${title} ${content}`, topic);
  if (topic === 'finance') {
    const fallbackFocus = ['A股与主要指数', 'ETF 与基金资金流', '黄金、债券和宏观风险偏好'];
    const focus = tags.length ? tags.slice(0, 3).join('、') : fallbackFocus[index % fallbackFocus.length];
    return `市场信息显示，${focus}仍是今日资金和情绪观察重点，需结合成交量与政策预期判断持续性。`;
  }

  const focus = tags.length ? tags.slice(0, 3).join('、') : ['React 生态', '构建工具', 'AI 编程'][index % 3];
  return `前端生态今日重点关注${focus}相关变化，建议结合项目依赖、升级成本和团队工程规范评估落地。`;
}

function makeHighlights(results, topic) {
  const base = [];

  for (const [index, item] of results.entries()) {
    if (base.length >= 3) break;
    const point = itemToChinesePoint(item, topic, index);
    if (point && !base.includes(point)) base.push(point);
  }

  const fallback = topic === 'finance'
    ? ['关注 A股、港股、美股之间的风格切换和科技权重波动。', 'ETF、基金、债券和黄金仍是观察资金偏好的重要入口。', '宏观数据、利率预期和海外风险偏好会影响当日市场节奏。']
    : ['关注 React、Vite、Next.js、TypeScript 等主流前端生态更新。', 'AI 编程工具继续影响组件生成、测试生成和代码审查流程。', '工程化重点仍是构建性能、可维护性、部署体验和运行时成本。'];

  while (base.length < 3) base.push(fallback[base.length]);
  return base.map((item) => truncate(item, 120));
}

function makeSections(results, topic) {
  const points = makeHighlights(results, topic);

  if (topic === 'finance') {
    return [
      {
        title: '市场主线',
        content: `${points[0]} 今日观察重点放在指数强弱、成交活跃度、行业轮动和 ETF 资金方向，避免只看单日涨跌。`,
      },
      {
        title: '资金与板块',
        content: `${points[1]} 若科技成长、红利资产、债券或黄金出现明显分化，说明市场风险偏好正在变化。`,
      },
      {
        title: '风险提示',
        content: '本日报仅作公开信息整理，不构成投资建议。高弹性板块波动通常更大，追涨前应关注成交量、估值和消息兑现风险。',
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
      content: '新技术先小范围验证，再进入主项目；涉及框架大版本、安全补丁或构建链路变化时，应同步补充回滚方案和兼容性检查。',
    },
  ];
}

function sourceLinks(results, topic) {
  const links = results
    .filter((item) => item.url)
    .slice(0, 5)
    .map((item) => ({ label: truncate(cleanText(item.title || item.url), 80), url: item.url }));

  if (links.length) return links;
  return fallbackSources(topic).map((item) => ({ label: item.title, url: item.url }));
}

function makeSummary(results, topic) {
  const highlights = makeHighlights(results, topic);
  if (topic === 'finance') {
    return `今日金融日报聚焦 A股、港股、美股、ETF、基金、债券、黄金与宏观风险偏好变化。核心看点：${highlights.slice(0, 2).join('；')}`;
  }
  return `今日前端技术日报聚焦 React、Vite、Next.js、TypeScript、JavaScript 与 AI 编程工具链。核心看点：${highlights.slice(0, 2).join('；')}`;
}

async function createReport(topic, date) {
  const isFinance = topic === 'finance';
  const query = isFinance
    ? `${date} A股 港股 美股 ETF 基金 债券 黄金 金融市场 今日新闻 中文`
    : `${date} 前端 技术 新闻 React Vite Next.js TypeScript JavaScript AI 编程 中文`;

  let data;
  try {
    data = await tavilySearch(query);
  } catch (error) {
    console.warn(error.message);
    data = { answer: '', results: fallbackSources(topic) };
  }

  const results = Array.isArray(data.results) && data.results.length ? data.results : fallbackSources(topic);
  const highlights = makeHighlights(results, topic);
  const sections = makeSections(results, topic);

  if (isFinance) {
    return {
      id: `${date}-finance`,
      title: `金融日报：${date} 市场早报`,
      date,
      category: 'finance',
      summary: makeSummary(results, topic),
      tags: ['A股', '港股', '美股', 'ETF', '基金', '宏观'],
      highlights,
      sections,
      sourceLinks: sourceLinks(results, topic),
    };
  }

  return {
    id: `${date}-frontend`,
    title: `前端技术日报：${date} 技术早报`,
    date,
    category: 'frontend',
    summary: makeSummary(results, topic),
    tags: ['React', 'Vite', 'Next.js', 'TypeScript', 'AI 编程', '工程化'],
    highlights,
    sections,
    sourceLinks: sourceLinks(results, topic),
  };
}

async function main() {
  const date = process.argv[2] || hkDateParts();
  await mkdir(reportsDir, { recursive: true });

  const reports = [await createReport('frontend', date), await createReport('finance', date)];

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
