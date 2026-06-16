import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnalysis } from "../lib/api";
import { useTheme } from "../lib/ThemeContext";
import type { AnalysisEntry, AnalysisInsights, AnalysisResponse } from "../lib/types";

type Range = "week" | "month" | "year";

const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30, year: 365 };
const RANGE_LABEL: Record<Range, string> = {
  week: "Last 7 days",
  month: "Last 30 days",
  year: "Last 12 months",
};

const COLORS = [
  "#2997ff", "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#a855f7", "#3bb5ff", "#14b8a6", "#f472b6", "#8b5cf6", "#22d3ee",
];

const STATUS_COLORS: Record<string, string> = {
  Open: "#f59e0b",
  "In Progress": "#2997ff",
  "On Hold": "#a855f7",
  Resolved: "#10b981",
  Closed: "#14b8a6",
};

const DONE_STATUSES = new Set(["resolved", "closed"]);

function parseISO(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

interface TrendPoint {
  label: string;
  raised: number;
  resolved: number;
}

export default function AnalysisPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const axisColor = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)";
  const axisColorStrong = dark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.75)";
  const gridLine = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const cellStroke = dark ? "#0b0b10" : "#ffffff";
  const tooltipStyle = {
    background: dark ? "#12121a" : "#ffffff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
    borderRadius: 10,
    color: dark ? "#fafafa" : "#14151a",
    fontSize: 13,
  };

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<Range>("month");

  useEffect(() => {
    let cancelled = false;
    fetchAnalysis()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useMemo(() => startOfTodayUTC(), []);
  const rangeStart = useMemo(() => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (RANGE_DAYS[range] - 1));
    return d;
  }, [today, range]);

  const inRange = useMemo<AnalysisEntry[]>(() => {
    if (!data) return [];
    return data.entries.filter((e) => {
      const d = parseISO(e.issueDate);
      return d && d >= rangeStart && d <= today;
    });
  }, [data, rangeStart, today]);

  const kpis = useMemo(() => {
    const total = inRange.length;
    const done = inRange.filter((e) => e.status && DONE_STATUSES.has(e.status.toLowerCase())).length;
    const open = total - done;
    const resolutionRate = total ? Math.round((done / total) * 100) : 0;

    const durations: number[] = [];
    for (const e of inRange) {
      const issued = parseISO(e.issueDate);
      const resolved = parseISO(e.resolutionDate);
      if (issued && resolved && resolved >= issued) durations.push(daysBetween(issued, resolved));
    }
    const avgResolution = durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : null;

    return { total, open, done, resolutionRate, avgResolution };
  }, [inRange]);

  const byCategory = useMemo(() => groupCount(inRange, (e) => e.category), [inRange]);
  const byType = useMemo(() => groupCount(inRange, (e) => e.type), [inRange]);
  const byStatus = useMemo(() => groupCount(inRange, (e) => e.status), [inRange]);

  const trend = useMemo<TrendPoint[]>(() => {
    if (!data) return [];
    return buildTrend(data.entries, range, today);
  }, [data, range, today]);

  if (loading) {
    return <div className="page-loading">Loading analysis…</div>;
  }

  if (error) {
    return (
      <div className="analysis-page">
        <div className="analysis-inner">
          <p className="error-text">Failed to load analysis data. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!data?.hasActive) {
    return <EmptyState title="No active dataset" body={<>Activate a dataset on the <Link to="/admin">Admin</Link> page to see analytics.</>} />;
  }

  return (
    <div className="analysis-page">
      <div className="analysis-inner">
        <header className="analysis-header">
          <div>
            <h1>Issue Analytics</h1>
            <p className="muted">
              {data.datasetName}
              {data.hasAnalytics ? ` · ${RANGE_LABEL[range]} · ${kpis.total} issues` : ""}
            </p>
          </div>
          {data.hasAnalytics && (
            <div className="range-toggle">
              {(["week", "month", "year"] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`range-btn${range === r ? " active" : ""}`}
                  onClick={() => setRange(r)}
                >
                  {r === "week" ? "Last Week" : r === "month" ? "Last Month" : "Last Year"}
                </button>
              ))}
            </div>
          )}
        </header>

        {data.analysis ? (
          <Insights insights={data.analysis} />
        ) : (
          <div className="chart-card">
            <p className="muted">
              No textual analysis is stored for this dataset. Re-upload it on the{" "}
              <Link to="/admin">Admin</Link> page to generate the AI analysis of issues &amp; resolutions.
            </p>
          </div>
        )}

        {!data.hasAnalytics ? (
          <div className="chart-card">
            <p className="muted">
              Map the Date / Type / Status columns when uploading to also see the trend charts below the analysis.
            </p>
          </div>
        ) : (
        <>
        <h2 className="section-title">Metrics overview</h2>
        <div className="kpi-row">
          <Kpi label="Total issues" value={kpis.total} accent="#2997ff" />
          <Kpi label="Open" value={kpis.open} accent="#f59e0b" />
          <Kpi label="Resolved" value={kpis.done} accent="#10b981" />
          <Kpi label="Resolution rate" value={`${kpis.resolutionRate}%`} accent="#6366f1" />
          <Kpi
            label="Avg resolution"
            value={kpis.avgResolution == null ? "—" : `${kpis.avgResolution}d`}
            accent="#06b6d4"
          />
        </div>

        {kpis.total === 0 ? (
          <div className="chart-card">
            <p className="muted">No issues raised in this period. Try a wider range.</p>
          </div>
        ) : (
          <>
            <div className="chart-card">
              <h2>Issues raised vs resolved</h2>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="raisedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2997ff" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#2997ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: gridLine }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Area type="monotone" dataKey="raised" name="Raised" stroke="#2997ff" strokeWidth={2} fill="url(#raisedGrad)" />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-grid">
              <div className="chart-card">
                <h2>Issues by category</h2>
                <ResponsiveContainer width="100%" height={Math.max(220, byCategory.length * 34)}>
                  <BarChart data={byCategory} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fill: axisColorStrong, fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridLine }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h2>By type</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {byType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke={cellStroke} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-grid">
              <div className="chart-card">
                <h2>By status</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {byStatus.map((s, i) => (
                        <Cell key={i} fill={STATUS_COLORS[s.name] ?? COLORS[i % COLORS.length]} stroke={cellStroke} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h2>Top categories needing attention</h2>
                <ul className="rank-list">
                  {byCategory.slice(0, 6).map((c, i) => (
                    <li key={c.name}>
                      <span className="rank-badge" style={{ background: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </span>
                      <span className="rank-name">{c.name}</span>
                      <span className="rank-bar-track">
                        <span
                          className="rank-bar-fill"
                          style={{
                            width: `${(c.value / byCategory[0].value) * 100}%`,
                            background: COLORS[i % COLORS.length],
                          }}
                        />
                      </span>
                      <span className="rank-value">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function Insights({ insights }: { insights: AnalysisInsights }) {
  return (
    <div className="insights">
      <div className="insights-hero">
        <div className="insights-badge">AI Analysis</div>
        <h2>Executive summary</h2>
        <p className="insights-summary">{insights.executiveSummary}</p>
      </div>

      <div className="insights-grid">
        <div className="insights-card">
          <h3>Key themes</h3>
          <ul className="insights-list">
            {insights.keyThemes?.map((t, i) => (
              <li key={i}>
                <strong>{t.theme}</strong>
                <span>{t.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="insights-card">
          <h3>Root causes</h3>
          <ul className="insights-list">
            {insights.rootCauses?.map((c, i) => (
              <li key={i}>
                <strong>{c.cause}</strong>
                <span>{c.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="insights-grid">
        <div className="insights-card">
          <h3>Recommendations</h3>
          <ul className="insights-recs">
            {insights.recommendations?.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="insights-card">
          <h3>Risk areas</h3>
          <ul className="risk-list">
            {insights.riskAreas?.map((r, i) => (
              <li key={i}>
                <span className={`risk-sev risk-${r.severity?.toLowerCase()}`}>{r.severity}</span>
                <div>
                  <strong>{r.area}</strong>
                  <span>{r.note}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function groupCount(entries: AnalysisEntry[], pick: (e: AnalysisEntry) => string | null) {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = (pick(e) || "Unspecified").trim();
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function buildTrend(entries: AnalysisEntry[], range: Range, today: Date): TrendPoint[] {
  const monthly = range === "year";
  const buckets: { label: string; start: Date; end: Date; raised: number; resolved: number }[] = [];

  if (monthly) {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i + 1, 1));
      buckets.push({
        label: start.toLocaleString("en", { month: "short", timeZone: "UTC" }),
        start,
        end,
        raised: 0,
        resolved: 0,
      });
    }
  } else {
    const days = RANGE_DAYS[range];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - i);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      buckets.push({
        label: start.toLocaleString("en", { month: "short", day: "numeric", timeZone: "UTC" }),
        start,
        end,
        raised: 0,
        resolved: 0,
      });
    }
  }

  const place = (d: Date, field: "raised" | "resolved") => {
    for (const b of buckets) {
      if (d >= b.start && d < b.end) {
        b[field]++;
        return;
      }
    }
  };

  for (const e of entries) {
    const issued = parseISO(e.issueDate);
    if (issued) place(issued, "raised");
    const resolved = parseISO(e.resolutionDate);
    if (resolved) place(resolved, "resolved");
  }

  return buckets.map((b) => ({ label: b.label, raised: b.raised, resolved: b.resolved }));
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="kpi-card">
      <span className="kpi-dot" style={{ background: accent }} />
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="analysis-page">
      <div className="analysis-inner">
        <div className="analysis-empty">
          <h1>{title}</h1>
          <p className="muted">{body}</p>
        </div>
      </div>
    </div>
  );
}
