import { useId, useState } from 'react';
import { ChevronDown, ChartNoAxesCombined } from 'lucide-react';
import { formatInteger, utcDate, type SettlementsData } from '../api';

const modes = ['Work', 'Blocks', 'Settlements'] as const;
type Mode = typeof modes[number];
const keyFor = { Work: 'work', Blocks: 'blocks', Settlements: 'settlements' } as const;

export function ActivityChart({ data }: { data: SettlementsData | null }) {
  const [mode, setMode] = useState<Mode>('Work');
  const id = useId().replace(/:/g, '');
  const buckets = data?.buckets ?? [];
  const values = buckets.map((bucket) => Number(bucket[keyFor[mode]]));
  const max = Math.max(1, ...values);
  const ceiling = Math.ceil(max / 4) * 4;
  const width = 720;
  const height = 166;
  const coordinates = values.map((value, index) => `${index * width / Math.max(1, values.length - 1)},${height - value / ceiling * height}`);
  const line = coordinates.length ? `M${coordinates.join(' L')}` : '';
  const total = data ? data[keyFor[mode] === 'settlements' ? 'count' : keyFor[mode] as 'work' | 'blocks'] : null;
  const hour = (value: string) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });

  return <section className="panel activity-panel" aria-labelledby="activity-heading">
    <div className="panel-head">
      <div className="heading-with-icon"><ChartNoAxesCombined size={18} /><h2 id="activity-heading">Network activity</h2></div>
      <span className="period-label">Last 24 hours</span>
    </div>
    <div className="activity-toolbar">
      <div className="chart-total"><strong>{total == null ? '···' : formatInteger(total)}</strong><span>{mode.toLowerCase()}{mode === 'Work' ? ' units added' : mode === 'Blocks' ? ' completed' : ' recorded'}</span></div>
      <div className="segmented" role="group" aria-label="Activity metric">
        {modes.map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>{item}</button>)}
      </div>
    </div>
    {buckets.length > 0 ? <>
      <div className="chart-wrap">
        <div className="chart-y-axis" aria-hidden="true">{[ceiling, ceiling * 0.75, ceiling / 2, ceiling / 4, 0].map((n) => <span key={n}>{n.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>)}</div>
        <div className="chart-plot">
          <div className="chart-grid" aria-hidden="true">{[0, 1, 2, 3, 4].map((n) => <span key={n} />)}</div>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-labelledby={`${id}-title ${id}-description`}>
            <title id={`${id}-title`}>{mode} per hour, last 24 hours</title>
            <desc id={`${id}-description`}>Hourly {mode.toLowerCase()} from Squeekchain. Exact values are available in View hourly data below.</desc>
            <defs><linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-chart)" stopOpacity="0.18" /><stop offset="100%" stopColor="var(--color-chart)" stopOpacity="0.01" /></linearGradient></defs>
            <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id}-fill)`} />
            <path d={line} fill="none" stroke="var(--color-chart)" strokeWidth="2.3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {values.length > 0 && <circle cx={width} cy={height - values[values.length - 1] / ceiling * height} r="3" fill="var(--color-chart)" />}
          </svg>
          <div className="chart-x-axis" aria-hidden="true">{buckets.filter((_, index) => index % Math.max(1, Math.round((buckets.length - 1) / 4)) === 0 || index === buckets.length - 1).map((bucket) => <span key={bucket.startAt}>{hour(bucket.startAt)}</span>)}</div>
        </div>
      </div>
      <div className="chart-bottom"><span><i className="legend-line" />{mode} per hour</span><span>Time in UTC</span></div>
      <details className="hourly-details"><summary>View hourly data<ChevronDown size={14} /></summary>
        <div className="hourly-table"><table><caption className="sr-only">Hourly {mode.toLowerCase()} in UTC</caption><thead><tr><th scope="col">Hour (UTC)</th><th scope="col">{mode}</th></tr></thead><tbody>{buckets.map((bucket) => <tr key={bucket.startAt}><td>{utcDate(bucket.startAt)}, {hour(bucket.startAt)}</td><td>{formatInteger(bucket[keyFor[mode]])}</td></tr>)}</tbody></table></div>
      </details>
    </> : <div className="chart-empty"><ChartNoAxesCombined size={28} /><p>{data ? 'No hourly activity returned' : 'Waiting for activity data'}</p><span>{data ? 'The chart will update when the API reports activity.' : 'Activity appears when the settlements API responds.'}</span></div>}
  </section>;
}
