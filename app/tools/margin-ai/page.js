'use client';
import { useEffect, useState } from 'react';
import { useMarginKey } from '../../../lib/useMarginKey';
import { KeyGate, MarginNav } from '../../../components/MarginShell';

function money(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function MarginAI() {
  const { key, setKey, unlocked, checking, error, submit, marginFetch } = useMarginKey();
  const [data, setData] = useState(null);
  const [salesCsv, setSalesCsv] = useState('');
  const [costCsv, setCostCsv] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState('');

  async function load() {
    const res = await marginFetch('/api/tools/margin/dashboard');
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  function readFileInto(setter) {
    return (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter(reader.result);
      reader.readAsText(file);
    };
  }

  async function runUpload() {
    if (!salesCsv || !costCsv) { setUploadNote('Add both a sales export and a cost export.'); return; }
    setUploading(true);
    setUploadNote('Reading and computing margins…');
    const res = await marginFetch('/api/tools/margin/upload', {
      method: 'POST', body: JSON.stringify({ salesCsv, costCsv, sourceLabel }),
    });
    const result = await res.json();
    setUploading(false);
    if (result.error) { setUploadNote(result.error); return; }
    setUploadNote(
      `Analysed ${result.productsAnalysed} product/customer lines. ${result.newlyFlagged} newly flagged` +
      (result.alertsSent ? `, ${result.alertsSent} alert email${result.alertsSent > 1 ? 's' : ''} sent.` : '.')
    );
    load();
  }

  if (checking) return <div className="admin-main">Loading…</div>;
  if (!unlocked) return <KeyGate error={error} keyVal={key} setKey={setKey} submit={submit} checking={checking} />;
  if (!data) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <MarginNav active="dashboard" />
      <div className="admin-main">
        <div className="admin-header"><h2>Margin.ai — Command Center</h2></div>

        {!data.hasData && (
          <div className="panel">
            <div className="panel-head"><h3>No data yet</h3></div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.7 }}>Upload a sales export and a cost export below to see where margin is leaking.</p>
            </div>
          </div>
        )}

        {data.hasData && (
          <>
            <div className="metric-row">
              <div className="metric"><div className="label">Overall gross margin</div><div className="val">{data.overallMarginPct != null ? data.overallMarginPct.toFixed(1) + '%' : '—'}</div></div>
              <div className="metric"><div className="label">Total monthly revenue</div><div className="val">{money(data.totalRevenue)}</div></div>
              <div className="metric flag"><div className="label">Revenue selling below cost</div><div className="val">{money(data.revenueBelowCost)}</div></div>
              <div className="metric flag"><div className="label">Products flagged</div><div className="val">{data.leakCount + data.watchCount}</div><div className="delta">{data.leakCount} below cost, {data.watchCount} under 8% margin</div></div>
            </div>

            <div className="panel">
              <div className="panel-head"><h3>Biggest margin leaks</h3></div>
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Margin</th><th>Revenue</th><th>Root cause</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {data.leaks.map((p) => (
                    <tr key={p.id}>
                      <td className="name-cell">{p.product_name}{p.customer_name ? <span style={{ color: 'var(--slate)' }}> — {p.customer_name}</span> : ''}</td>
                      <td style={{ color: p.margin_pct < 0 ? '#e28080' : 'var(--amber)' }}>{p.margin_pct}%</td>
                      <td>{money(p.revenue_monthly)}</td>
                      <td className="dim">{p.root_cause || '—'}</td>
                      <td><span className={`status-pill ${p.status}`}>{p.status}</span></td>
                      <td><a href={`/tools/margin-ai/product/${p.id}`} className="row-action">View</a></td>
                    </tr>
                  ))}
                  {data.leaks.length === 0 && <tr><td colSpan={6} className="dim">Nothing flagged — everything's healthy.</td></tr>}
                </tbody>
              </table>
            </div>

            {data.drivers.length > 0 && (
              <div className="panel">
                <div className="panel-head"><h3>Cost drivers</h3></div>
                <div style={{ padding: '4px 20px 16px' }}>
                  {data.drivers.map((d, i) => (
                    <div className="driver-row" key={i}>
                      <div><div className="dname">{d.name}</div><div className="dmeta">Affects {d.products.join(', ')}{d.count > d.products.length ? ` +${d.count - d.products.length} more` : ''}</div></div>
                      <div className="dcount">{d.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="panel">
          <div className="panel-head"><h3>Upload sales &amp; cost data</h3><span className="action" onClick={() => window.location.href = '/tools/margin-ai/actions'}>View actions →</span></div>
          <div style={{ padding: '4px 20px 20px' }}>
            <div className="margin-upload-box">
              <label>Source label (optional)</label>
              <input type="text" placeholder="e.g. Salesforce export, Aug 2026" value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: '9px 12px', color: 'var(--cream)', fontSize: 12.5 }} />
              <label>Sales export (CSV) — product, customer, category, revenue</label>
              <input type="file" accept=".csv" onChange={readFileInto(setSalesCsv)} />
              {salesCsv && <div className="dim" style={{ marginTop: 6, fontSize: 11 }}>✓ {salesCsv.split('\n').length - 1} rows read</div>}
              <label>Cost export (CSV) — product, cost component, cost</label>
              <input type="file" accept=".csv" onChange={readFileInto(setCostCsv)} />
              {costCsv && <div className="dim" style={{ marginTop: 6, fontSize: 11 }}>✓ {costCsv.split('\n').length - 1} rows read</div>}
              <button className="primary-btn" style={{ marginTop: 16 }} onClick={runUpload} disabled={uploading}>
                {uploading ? 'Analysing…' : 'Analyze margins'}
              </button>
              {uploadNote && <div className="dim" style={{ marginTop: 10, fontSize: 11.5 }}>{uploadNote}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
