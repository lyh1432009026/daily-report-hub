import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Search,
  Sparkles,
  BarChart3,
  Newspaper,
  Tag,
  ExternalLink,
  X,
} from 'lucide-react';

const CATEGORY_LABELS = {
  frontend: '前端技术',
  finance: '金融日报',
};

const CATEGORY_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'frontend', label: '前端技术' },
  { key: 'finance', label: '金融日报' },
];

const fallbackReports = [];

function formatDate(dateStr) {
  if (!dateStr) return '未注明日期';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(d);
}

function normalizeReport(report) {
  const tags = Array.isArray(report.tags) ? report.tags : [];
  const highlights = Array.isArray(report.highlights) ? report.highlights : [];
  const sections = Array.isArray(report.sections)
    ? report.sections
    : Array.isArray(report.details)
      ? report.details
      : [];

  return {
    ...report,
    category: report.category || 'frontend',
    tags,
    highlights,
    sections,
  };
}

function reportText(report) {
  const parts = [
    report.title,
    report.summary,
    ...(report.tags || []),
    ...(report.highlights || []),
    ...(report.sections || []).flatMap((section) => [section.title, section.content]),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function ReportCard({ report, active, onClick }) {
  return (
    <button className={`report-card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="report-card-top">
        <div>
          <div className="report-meta">
            <span className={`badge badge-${report.category}`}>
              {CATEGORY_LABELS[report.category] || report.category}
            </span>
            <span className="date-line">
              <CalendarDays size={14} />
              {formatDate(report.date)}
            </span>
          </div>
          <h3>{report.title}</h3>
        </div>
        <ChevronRight size={18} className="chevron" />
      </div>

      <p className="summary">{report.summary}</p>

      <div className="tag-row">
        {(report.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="tag-pill">
            <Tag size={12} />
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

function ReportDetail({ report, onClose }) {
  if (!report) {
    return (
      <div className="detail-panel empty">
        <div className="hero-icon">
          <Sparkles size={28} />
        </div>
        <h2>选择一篇日报</h2>
        <p>左侧卡片按日期倒序排列，点击后可查看完整摘要、标签与重点。</p>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <div className="report-meta">
            <span className={`badge badge-${report.category}`}>
              {CATEGORY_LABELS[report.category] || report.category}
            </span>
            <span className="date-line">
              <Clock3 size={14} />
              {formatDate(report.date)}
            </span>
          </div>
          <h2>{report.title}</h2>
        </div>
        <button className="icon-button mobile-only" onClick={onClose} aria-label="关闭详情">
          <X size={18} />
        </button>
      </div>

      <p className="summary large">{report.summary}</p>

      <div className="detail-grid">
        <section>
          <h4>核心标签</h4>
          <div className="tag-row compact">
            {(report.tags || []).map((tag) => (
              <span key={tag} className="tag-pill">
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h4>重点摘要</h4>
          <ul className="bullet-list">
            {(report.highlights || []).map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4>详细内容</h4>
          <div className="section-list">
            {(report.sections || []).map((section, index) => (
              <article key={`${section.title}-${index}`} className="section-card">
                <h5>{section.title}</h5>
                <p>{section.content}</p>
              </article>
            ))}
          </div>
        </section>

        {report.sourceLinks?.length ? (
          <section>
            <h4>参考来源</h4>
            <div className="link-list">
              {report.sourceLinks.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} />
                  <span>{link.label || link.url}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function App() {
  const [reports, setReports] = useState(fallbackReports);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/reports-index.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`加载失败：${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data.reports) ? data.reports : Array.isArray(data) ? data : [];
        const normalized = list.map(normalizeReport).sort((a, b) => {
          const da = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (da !== 0) return da;
          return String(b.id || '').localeCompare(String(a.id || ''));
        });
        if (ignore) return;
        setReports(normalized);
        setActiveId((prev) => prev || normalized[0]?.id || null);
      } catch (err) {
        if (!ignore) {
          setError(err.message || '加载日报失败');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      const categoryMatch = selectedCategory === 'all' || report.category === selectedCategory;
      const queryMatch = !q || reportText(report).includes(q);
      return categoryMatch && queryMatch;
    });
  }, [reports, selectedCategory, query]);

  useEffect(() => {
    if (!filteredReports.length) {
      setActiveId(null);
      return;
    }
    if (!filteredReports.some((report) => report.id === activeId)) {
      setActiveId(filteredReports[0].id);
    }
  }, [filteredReports, activeId]);

  const activeReport = filteredReports.find((report) => report.id === activeId) || filteredReports[0] || null;

  const stats = useMemo(() => {
    return {
      total: reports.length,
      frontend: reports.filter((report) => report.category === 'frontend').length,
      finance: reports.filter((report) => report.category === 'finance').length,
    };
  }, [reports]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <BarChart3 size={14} />
            自动日报展示站
          </p>
          <h1>日报总览</h1>
          <p className="intro">按天排序，聚合前端技术与金融日报，支持搜索、筛选、详情查看与静态部署。</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>总日报</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <span>前端技术</span>
            <strong>{stats.frontend}</strong>
          </div>
          <div className="stat-card">
            <span>金融日报</span>
            <strong>{stats.finance}</strong>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="list-panel">
          <div className="toolbar">
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题、摘要、标签或重点"
              />
            </label>
            <div className="filters">
              {CATEGORY_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  className={selectedCategory === item.key ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setSelectedCategory(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? <div className="status-card">日报加载中...</div> : null}
          {error ? <div className="status-card error">{error}</div> : null}
          {!loading && !error && !filteredReports.length ? (
            <div className="status-card">没有找到匹配的日报。</div>
          ) : null}

          <div className="report-list">
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                active={activeReport?.id === report.id}
                onClick={() => setActiveId(report.id)}
              />
            ))}
          </div>
        </section>

        <aside className="detail-wrap">
          <ReportDetail report={activeReport} onClose={() => setActiveId(null)} />
        </aside>
      </main>

      <footer className="footer-note">
        <Newspaper size={14} />
        <span>数据源：/reports-index.json · 构建后可直接部署到静态托管平台</span>
      </footer>
    </div>
  );
}
