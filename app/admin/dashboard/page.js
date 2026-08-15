'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { supabasePublic } from '../../../lib/supabase';

const HEATMAP_RAMP = ['#E6F1FB', '#B5D4F4', '#85B7EB', '#378ADD', '#185FA5', '#0C447C'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AdminDashboardPage() {
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const trendRef = useRef(null);
  const toolRef = useRef(null);
  const trendChartRef = useRef(null);
  const toolChartRef = useRef(null);

  useEffect(() => {
    const supabase = supabasePublic();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/admin/login';
        return;
      }
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (checking) return;
    fetch('/api/admin/dashboard-stats?days=14')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((e) => setError(e.message));
  }, [checking]);

  useEffect(() => {
    if (!stats) return;

    if (trendChartRef.current) trendChartRef.current.destroy();
    if (toolChartRef.current) toolChartRef.current.destroy();

    const trendLabels = Object.keys(stats.trend);
    const trendValues = Object.values(stats.trend);
    trendChartRef.current = new Chart(trendRef.current, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          data: trendValues,
          borderColor: '#2a78d6',
          backgroundColor: 'rgba(42,120,214,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { beginAtZero: true, grid: { color: 'rgba(137,135,129,0.15)' }, ticks: { color: '#898781', font: { size: 11 } } },
        },
      },
    });

    const toolEntries = Object.entries(stats.toolCounts).sort((a, b) => a[1] - b[1]);
    toolChartRef.current = new Chart(toolRef.current, {
      type: 'bar',
      data: {
        labels: toolEntries.map((e) => e[0]),
        datasets: [{ data: toolEntries.map((e) => e[1]), backgroundColor: '#2a78d6', borderRadius: 4, barThickness: 18 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(137,135,129,0.15)' }, ticks: { color: '#898781', font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { color: '#52514e', font: { size: 12 } } },
        },
      },
    });

    return () => {
      trendChartRef.current?.destroy();
      toolChartRef.current?.destroy();
    };
  }, [stats]);

  if (checking) return <div className="dash-loading">Checking session…</div>;
  if (error) return <div className="dash-error">Couldn't load dashboard data. {error}</div>;
  if (!stats) return <div className="dash-loading">Loading dashboard…</div>;

  const maxHeat = Math.max(1, ...stats.heatmap.flat());

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="admin-nav">
          <a href="/admin">Overview</a>
          <a href="/admin/dashboard" className="active">Analytics</a>
          <a href="/admin/job-postings">Job postings</a>
          <a href="/admin/chatbot">Ask Shree chatbot</a>
          <a href="/settings">Settings</a>
          <a href="/admin/margin-ai">Margin.ai</a>
        </div>
      </div>
      <div className="admin-main">
      <div className="dashboard">
      {!stats.hasData && (
        <div className="dash-banner">
          No usage data yet. Once visitors start using tools, this fills in automatically.
        </div>
      )}

      <div className="metric-grid">
        <MetricCard label="Total visitors" value={stats.totalVisitors} />
        <MetricCard label="New signups (14d)" value={stats.newSignups} />
        <MetricCard label="In grace window" value={stats.statusCounts.grace || 0} />
        <MetricCard label="Blocked IPs" value={stats.statusCounts.blocked || 0} />
      </div>

      <div className="section-label">Tool usage trend</div>
      <div className="chart-wrap"><canvas ref={trendRef} role="img" aria-label="Daily tool usage over 14 days" /></div>

      <div className="section-label">Tool usage by type</div>
      <div className="chart-wrap"><canvas ref={toolRef} role="img" aria-label="Calls per tool" /></div>

      <div className="section-label">Activity heatmap</div>
      <div className="heatmap-card">
        <div className="heatmap-grid">
          {stats.heatmap.map((row, dayIdx) => (
            <div key={dayIdx} className="heatmap-row">
              <span className="heatmap-day">{DAY_LABELS[dayIdx]}</span>
              {row.map((v, hourIdx) => {
                const level = Math.min(5, Math.floor((v / maxHeat) * 5));
                return <span key={hourIdx} className="heatmap-cell" style={{ background: HEATMAP_RAMP[level] }} title={`${v} calls`} />;
              })}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .dashboard { max-width: 900px; margin: 0 auto; padding: 24px; }
        .dash-loading, .dash-error { padding: 40px; text-align: center; color: #52514e; }
        .dash-banner { background: #FAEEDA; color: #633806; padding: 10px 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        .section-label { font-size: 13px; color: #898781; margin: 24px 0 8px; }
        .chart-wrap { position: relative; width: 100%; height: 220px; }
        .heatmap-card { border: 1px solid #e1e0d9; border-radius: 12px; padding: 12px; overflow-x: auto; }
        .heatmap-grid { display: flex; flex-direction: column; gap: 3px; min-width: 600px; }
        .heatmap-row { display: grid; grid-template-columns: 32px repeat(24, 1fr); gap: 2px; align-items: center; }
        .heatmap-day { font-size: 11px; color: #898781; }
        .heatmap-cell { height: 14px; border-radius: 3px; }
      `}</style>
      </div>
      </div>
      </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{ background: '#F1EFE8', borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
