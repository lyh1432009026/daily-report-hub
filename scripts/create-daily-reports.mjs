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
    { title: 'React', url: 'https://react.dev/', content: 'React 官方文档与生态更新。' },
    { title: 'Vite', url: 'https://vite.dev/', content: 'Vite 构建工具与开发体验。' },
    { title: 'Frontend Masters Blog', url: 'https://frontendmasters.com/blog/', content: '前端技术文章与趋势观察。' },
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
      include_answer: true,
      include_raw_content: false,
      max_results: 6,
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

function firstSentence(text, maxLen = 110) {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  const sentence = cleaned.split(/[。.!?！？]/)[0] || cleaned;
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen)}...` : sentence;
}

function makeHighlights(answer, results, topic) {
  const base = [];
  const chunks = cleanText(answer)
    .split(/(?<=[。.!?！？])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    if (base.length >= 3) break;
    const short = chunk.length > 90 ? `${chunk.slice(0, 90)}...` : chunk;
    base.push(short);
  }

  for (const item of results) {
    if (base.length >= 3) break;
    const point = firstSentence(item.content || item.title, 90);
    if (point && !base.includes(point)) base.push(point);
  }

  while (base.length < 3) {
    if (topic === 'finance') {
      base.push(['关注 A股、港股、美股的风格切换和科技权重波动。', 'ETF、基金、债券和黄金仍是观察资金偏好的重要入口。', '宏观数据、利率预期和海外风险偏好会影响当日市场节奏。'][base.length]);
    } else {
      base.push(['关注 React、Vite、Next.js、TypeScript 等主流前端生态更新。', 'AI 编程工具继续影响组件生成、测试生成和代码审查流程。', '工程化重点仍是构建性能、可维护性、部署体验和运行时成本。'][base.length]);
    }
  }

  return base;
}

function makeSections(results, topic) {
  const picked = results.slice(0, 3);
  const sections = picked.map((item) => ({
    title: cleanText(item.title || '今日观察'),
    content: cleanText(item.content || item.snippet || item.title || '暂无摘要。'),
  }));

  while (sections.length < 3) {
    if (topic === 'finance') {
      sections.push([
        { title: 'A股观察', content: '重点关注科技成长、ETF 资金流向、政策预期和成交活跃度。' },
        { title: '港美股观察', content: '重点关注大型科技股、AI 链条、互联网平台和利率预期变化。' },
        { title: '风险提示', content: '日报仅作信息整理，不构成投资建议；高弹性板块波动通常更大。' },
      ][sections.length]);
    } else {
      sections.push([
        { title: '框架生态', content: '关注 React、Vue、Next.js、Vite 等主流框架和工具链的实际工程变化。' },
        { title: 'AI 工具', content: '关注 AI 代码助手在组件生成、测试生成、重构和代码审查上的落地效果。' },
        { title: '工程效率', content: '关注构建速度、缓存策略、部署流程、类型安全和团队协作成本。' },
      ][sections.length]);
    }
  }

  return sections;
}

function sourceLinks(results, topic) {
  const links = results
    .filter((item) => item.url)
    .slice(0, 5)
    .map((item) => ({ label: cleanText(item.title || item.url), url: item.url }));

  if (links.length) return links;
  return fallbackSources(topic).map((item) => ({ label: item.title, url: item.url }));
}

async function createReport(topic, date) {
  const isFinance = topic === 'finance';
  const query = isFinance
    ? `${date} 最新 金融新闻 A股 港股 美股 ETF 基金 债券 黄金 市场早报`
    : `${date} latest frontend news React Vite Next.js TypeScript JavaScript AI coding web development`;

  let data;
  try {
    data = await tavilySearch(query);
  } catch (error) {
    console.warn(error.message);
    data = { answer: '', results: fallbackSources(topic) };
  }

  const results = Array.isArray(data.results) && data.results.length ? data.results : fallbackSources(topic);
  const answer = cleanText(data.answer || '');
  const highlights = makeHighlights(answer, results, topic);
  const sections = makeSections(results, topic);

  if (isFinance) {
    return {
      id: `${date}-finance`,
      title: `金融日报：${date} 市场早报`,
      date,
      category: 'finance',
      summary: answer || '今日金融日报聚焦 A股、港股、美股、ETF、基金、债券、黄金与宏观风险偏好变化。',
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
    summary: answer || '今日前端技术日报聚焦 React、Vite、Next.js、TypeScript、JavaScript 与 AI 编程工具链。',
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
