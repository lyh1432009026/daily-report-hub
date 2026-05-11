import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'data', 'reports');
const publicDir = path.join(root, 'public');
const outputPath = path.join(publicDir, 'reports-index.json');

const allowedCategories = new Set(['frontend', 'finance']);
const requiredFields = ['id', 'title', 'date', 'category', 'summary'];

function assertReport(report, file) {
  for (const field of requiredFields) {
    if (!report[field]) {
      throw new Error(`${file} 缺少必填字段：${field}`);
    }
  }
  if (!allowedCategories.has(report.category)) {
    throw new Error(`${file} category 必须是 frontend 或 finance，当前为：${report.category}`);
  }
  if (Number.isNaN(new Date(report.date).getTime())) {
    throw new Error(`${file} date 不是合法日期：${report.date}`);
  }
  if (report.tags && !Array.isArray(report.tags)) {
    throw new Error(`${file} tags 必须是数组`);
  }
  if (report.highlights && !Array.isArray(report.highlights)) {
    throw new Error(`${file} highlights 必须是数组`);
  }
  if (report.sections && !Array.isArray(report.sections)) {
    throw new Error(`${file} sections 必须是数组`);
  }
}

async function main() {
  await mkdir(reportsDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  const files = (await readdir(reportsDir)).filter((file) => file.endsWith('.json')).sort();
  const reports = [];

  for (const file of files) {
    const fullPath = path.join(reportsDir, file);
    const raw = await readFile(fullPath, 'utf8');
    const report = JSON.parse(raw);
    assertReport(report, file);
    reports.push({ ...report, sourceFile: `data/reports/${file}` });
  }

  reports.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return String(b.id).localeCompare(String(a.id));
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    total: reports.length,
    reports,
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Generated ${path.relative(root, outputPath)} with ${reports.length} reports.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
