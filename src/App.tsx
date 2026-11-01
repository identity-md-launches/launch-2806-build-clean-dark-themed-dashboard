import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Blocks, Check, ChevronDown, CircleHelp, Clock3, Database, ExternalLink, Footprints, Globe2, LayoutDashboard, Radio, RefreshCw, ShieldCheck, Unplug, Zap } from 'lucide-react';
import { API, formatInteger, humanize, supplyPercent, tokenAmount, utcTime } from './api';
import { useDashboard } from './useDashboard';
import { ActivityChart } from './components/ActivityChart';
import { Brand } from './components/Brand';
import { SettlementTable } from './components/SettlementTable';

function Metric({ icon, label, value, note, unavailable, loading, status = false }: { icon: ReactNode; label: string; value: ReactNode; note: string; unavailable: boolean; loading: boolean; status?: boolean }) {
  return <div className={`metric ${loading && unavailable ? 'metric-loading' : ''}`}>
    <div className="metric-heading"><span>{label}</span><span className="metric-icon">{icon}</span></div>
    <div className={`metric-value ${status ? 'status-value' : ''}`}>{unavailable ? loading ? <span className="loading-value" aria-label="Loading">···</span> : <span className="missing-value">Unavailable</span> : value}</div>
    <p className="metric-note">{unavailable ? loading ? 'Fetching live data' : 'Try refreshing the data' : note}</p>
  </div>;
}

export default function App() {
  const dashboard = useDashboard();
  const { status, economy, settlements, refreshing, autoRefresh, secondsLeft, now } = dashboard;
  const [activeSection, setActiveSection] = useState(location.hash.slice(1) || 'overview');
  useEffect(() => {
    const update = () => setActiveSection(location.hash.slice(1) || 'overview');
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);

  const failures = [status.error && 'network status', economy.error && 'SQK supply', settlements.error && 'settlements'].filter(Boolean);
  const sources = [status, economy, settlements];
  const allLoaded = sources.every((source) => source.data);
  const sourceOld = sources.some((source) => source.data && now - Date.parse(source.data.generatedAt) > 120_000);
  const telemetryOld = status.data ? now - Date.parse(status.data.observedAt) > status.data.staleAfterSeconds * 1_000 : false;
  const online = !!status.data && status.data.freshness === 'online' && !telemetryOld;
  const connectionLabel = failures.length ? allLoaded ? 'Refresh issue' : sources.some((source) => source.data) ? 'Partial data' : 'Data unavailable' : !allLoaded ? refreshing ? 'Connecting' : 'Data unavailable' : sourceOld ? 'Delayed data' : 'Live data';
  const connected = allLoaded && !failures.length && !sourceOld;
  const latestUpdate = sources.reduce((oldest, source) => Math.min(oldest, source.updatedAt ?? Infinity), Infinity);
  const eco = economy.data;
  const supplyUsage = eco ? supplyPercent(eco.liveSupply, eco.cap) : null;
  const network = eco ? eco.chainId === '11155111' ? 'Sepolia testnet' : humanize(eco.chain) : 'Network pending';
  const navItems = [{ id: 'overview', text: 'Overview', icon: <LayoutDashboard size={18} /> }, { id: 'settlements', text: 'Settlements', icon: <Blocks size={18} /> }, { id: 'data-sources', text: 'Data sources', icon: <Database size={18} /> }];

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <a className="brand-link" href="#overview" aria-label="Squeekchain overview"><Brand /></a>
      <div className="sidebar-rule" />
      <nav aria-label="Main navigation">{navItems.map((item) => <a href={`#${item.id}`} key={item.id} aria-label={item.text} className={`nav-link ${activeSection === item.id ? 'active' : ''}`} aria-current={activeSection === item.id ? 'location' : undefined}>{item.icon}<span>{item.text}</span>{activeSection === item.id && <span className="nav-active-dot" />}</a>)}</nav>
      <div className="sidebar-bottom">
        <div className="community-note"><span className="community-icon"><Globe2 size={18} /></span><strong>Built by the community</strong><p>A little movement.<br />A growing chain.</p><a href="#about">About this project<ArrowUpRight size={15} /></a></div>
        <a className="api-link" href={API.status} target="_blank" rel="noreferrer"><span className={`small-dot ${connected ? 'good' : 'neutral'}`} /><span>Public API</span><ExternalLink size={13} /><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar"><a className="mobile-brand" href="#overview" aria-label="Squeekchain overview"><Brand /></a><div className="breadcrumb"><Globe2 size={15} /><span>Network</span><span className="breadcrumb-divider">/</span><strong>Dashboard</strong></div><div className="topbar-end"><span className="network-tag"><span className="network-diamond" />{network}</span><a className="topbar-source" href={API.status} target="_blank" rel="noreferrer" aria-label="Open Squeekchain status API in a new tab"><ArrowUpRight size={17} /></a></div></header>
      <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => <a href={`#${item.id}`} key={item.id} className={activeSection === item.id ? 'active' : ''} aria-current={activeSection === item.id ? 'location' : undefined}>{item.icon}{item.text}</a>)}</nav>

      <main id="main-content">
        <section id="overview" className="overview-heading" aria-labelledby="page-heading"><div><div className="title-line"><h1 id="page-heading">Network overview</h1><span className={`live-badge ${connected ? 'live-good' : 'live-neutral'}`}><span className="small-dot" />{connectionLabel}</span></div><p>Real-world work. Recorded onchain.</p></div><button className="primary-button" type="button" onClick={() => void dashboard.refresh()} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'refreshing-icon' : ''} /><span>{refreshing ? 'Refreshing' : 'Refresh data'}</span></button></section>

        <div className="refresh-row"><span className="last-updated"><Clock3 size={14} />{Number.isFinite(latestUpdate) ? `Updated ${utcTime(new Date(latestUpdate).toISOString())} UTC` : 'Waiting for first update'}</span><div className="auto-refresh"><button type="button" role="switch" aria-checked={autoRefresh} onClick={dashboard.toggleAutoRefresh} aria-label="Auto-refresh every 60 seconds"><span className="switch-track"><span /></span><span>Auto-refresh</span></button><span className="refresh-countdown">{autoRefresh ? refreshing ? 'Updating' : `${secondsLeft}s` : 'Paused'}</span></div></div>
        <div className="sr-only" role="status" aria-live="polite">{dashboard.announcement}</div>

        {failures.length > 0 && <div className="notice notice-warning" role="status"><Unplug size={18} /><div><strong>Could not update {failures.join(', ')}.</strong><p>{sources.some((source) => source.error && source.data) ? 'Previous values remain visible. Use Refresh data to try again.' : 'Available sources are still shown. Use Refresh data to try again.'}</p></div></div>}
        {!failures.length && sourceOld && <div className="notice notice-warning" role="status"><Clock3 size={18} /><div><strong>The API is returning delayed data.</strong><p>The values below are from the latest API response. Check the source timestamps in Data sources.</p></div></div>}

        <section className="metrics-grid" aria-label="Live network metrics">
          <Metric label="Block height" icon={<Blocks size={17} />} value={status.data?.blockHeight ? formatInteger(status.data.blockHeight) : null} note="Latest settled block" unavailable={status.data?.blockHeight == null} loading={status.loading} />
          <Metric label="Cumulative work" icon={<Zap size={17} />} value={status.data ? formatInteger(status.data.cumulativeWork) : null} note="Measured work units" unavailable={!status.data} loading={status.loading} />
          <Metric label="Distance" icon={<Footprints size={17} />} value={status.data ? <>{(status.data.distanceMm / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}<span className="value-unit">km</span></> : null} note="Total wheel distance" unavailable={!status.data} loading={status.loading} />
          <Metric label="Status" icon={<Radio size={17} />} value={status.data ? <><span className={`status-dot ${online ? 'good' : 'warning'}`} />{telemetryOld ? 'Stale' : humanize(status.data.freshness)}</> : null} note={status.data ? `Wheel ${status.data.coreStatus.toLowerCase()} · telemetry ${telemetryOld ? 'delayed' : 'received'}` : ''} unavailable={!status.data} loading={status.loading} status />
        </section>

        <div className="middle-grid"><ActivityChart data={settlements.data} />
          <section className="panel supply-panel" aria-labelledby="supply-heading" aria-busy={economy.loading}><div className="panel-head"><div className="heading-with-icon"><span className="sqk-symbol"><Zap size={15} /></span><h2 id="supply-heading">Live SQK supply</h2></div><span className="token-label">{eco?.symbol ?? 'SQK'}</span></div>
            <div className="supply-body"><div className="supply-value">{eco ? tokenAmount(eco.liveSupply, eco.decimals) : economy.loading ? '···' : 'Unavailable'}</div><p className="supply-description">Minted minus burned</p>
              <div className="supply-progress" role={eco ? 'meter' : undefined} aria-label={eco ? 'Live supply as a percentage of the supply cap' : undefined} aria-valuemin={eco ? 0 : undefined} aria-valuemax={eco ? 100 : undefined} aria-valuenow={supplyUsage == null ? undefined : Math.min(100, supplyUsage)} aria-valuetext={supplyUsage == null ? undefined : `${supplyUsage.toFixed(2)}% of supply cap`}><span style={{ width: `${Math.min(100, supplyUsage ?? 0)}%` }} /></div>
              <div className="supply-progress-labels"><span>{supplyUsage == null ? 'Awaiting supply' : `${supplyUsage.toFixed(2)}% of cap`}</span><span>{eco ? `${tokenAmount(eco.cap, eco.decimals, 0)} cap` : 'Cap unavailable'}</span></div>
              <div className="supply-daily"><span><span className="small-dot good" />Minted in 24 hours</span><strong>{settlements.data?.minted != null ? tokenAmount(settlements.data.minted, settlements.data.decimals) : 'Unavailable'}<span className="supply-unit">SQK</span></strong></div>
              <details className="supply-details"><summary>View exact supply<ChevronDown size={14} /></summary><dl><div><dt>Live supply ({eco?.symbol ?? 'SQK'})</dt><dd>{eco ? tokenAmount(eco.liveSupply, eco.decimals, eco.decimals, false) : 'Unavailable'}</dd></div><div><dt>Total minted</dt><dd>{eco ? tokenAmount(eco.minted, eco.decimals, eco.decimals, false) : 'Unavailable'}</dd></div><div><dt>Total burned</dt><dd>{eco ? tokenAmount(eco.burned, eco.decimals, eco.decimals, false) : 'Unavailable'}</dd></div></dl></details>
            </div><div className="supply-foot"><ShieldCheck size={14} /><span>Read directly from Squeekchain</span></div>
          </section>
        </div>

        <SettlementTable data={settlements.data} loading={settlements.loading} error={settlements.error} />

        <section id="data-sources" className="data-section" aria-labelledby="data-heading"><details className="data-details"><summary><span className="heading-with-icon"><Database size={17} /><h2 id="data-heading">Data sources</h2></span><span className="data-summary">3 public endpoints<ChevronDown size={15} /></span></summary><div className="source-list">{[{ name: 'Network status', resource: status, url: API.status }, { name: 'Economy & supply', resource: economy, url: API.economy }, { name: '24-hour settlements', resource: settlements, url: API.settlements }].map(({ name, resource, url }) => <div className="source-item" key={name}><div><strong>{name}</strong><a href={url} target="_blank" rel="noreferrer">{url}<ArrowUpRight size={14} /><span className="sr-only"> (opens in a new tab)</span></a></div><div className="source-state">{resource.error ? <span className="warning-text">{resource.error}</span> : resource.loading ? 'Updating' : <span><Check size={13} />Connected</span>}{resource.data && <time dateTime={resource.data.generatedAt}>Source: {new Date(resource.data.generatedAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time>}</div></div>)}<p className="source-explanation">Block height is settled; work and distance are wheel telemetry. Supply amounts are rounded to two decimals; exact values are expandable. The chart uses hourly API buckets. The recent list is the subset returned by the API, which can exclude archived settlements.</p></div></details></section>

        <footer id="about"><div className="footer-left"><Brand small /><span className="footer-divider" /><span>Community dashboard</span></div><p>Made for the Squeekchain Buildooooor badge.<a href="#data-sources" onClick={() => { const details = document.querySelector<HTMLDetailsElement>('.data-details'); if (details) details.open = true; }}><CircleHelp size={14} /><span className="sr-only">About the data</span></a></p></footer>
      </main>
    </div>
  </div>;
}
