import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Search, X } from 'lucide-react';
import { formatInteger, humanize, tokenAmount, transactionUrl, utcDate, utcTime, type SettlementsData } from '../api';

export function SettlementTable({ data, loading, error }: { data: SettlementsData | null; loading: boolean; error: string | null }) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('newest');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const rows = (data?.recent ?? []).filter((row) => `${row.transactionHash} ${row.round} ${row.blockHeight}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (order === 'oldest') rows.reverse();
  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / 5) - 1));
  const visibleRows = rows.slice(safePage * 5, safePage * 5 + 5);

  async function copy(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setCopyMessage('Transaction hash copied.');
    } catch {
      setCopyMessage('Could not copy. Select the full transaction hash to copy it.');
    }
  }

  return <section id="settlements" className="panel settlements-panel" aria-labelledby="settlements-heading" aria-busy={loading}>
    <div className="panel-head settlements-heading">
      <div><div className="section-title"><h2 id="settlements-heading">Recent settlements</h2><span className="count-badge">{data ? formatInteger(data.count) : '···'}<span className="sr-only"> total settlements</span></span></div><p>Onchain records from the last 24 hours.</p></div>
      <span className="period-label"><span className="small-dot" />{error ? data ? 'Previous results' : 'Unavailable' : loading ? 'Updating' : 'Latest records'}</span>
    </div>
    <div className="table-toolbar">
      <div className="search-field"><Search size={16} /><label htmlFor="settlement-search" className="sr-only">Search settlements by round, block or transaction</label><input id="settlement-search" type="search" placeholder="Search round, block or transaction" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} autoComplete="off" />{query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setPage(0); }}><X size={16} /></button>}</div>
      <label className="sort-field"><span className="sr-only">Settlement order</span><select value={order} onChange={(event) => { setOrder(event.target.value); setPage(0); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select><ChevronDown size={14} /></label>
    </div>
    <div className="settlement-table"><table>
      <caption className="sr-only">Recent Squeekchain settlements. Times are in UTC. Expand a settlement for its full transaction hash and exact minted amount.</caption>
      <thead><tr><th scope="col">Settlement</th><th scope="col">Block height</th><th scope="col">Work added</th><th scope="col">SQK minted</th><th scope="col">Status</th><th scope="col">Time (UTC)</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead>
      <tbody>{visibleRows.map((row) => {
        const isExpanded = expanded === row.transactionHash;
        const url = transactionUrl(data!.chainId, row.transactionHash);
        return <SettlementRows key={row.transactionHash}>
          <tr className={isExpanded ? 'settlement-row is-expanded' : 'settlement-row'}>
            <td className="settlement-cell"><span className="transaction-icon"><ArrowDownLeft size={18} /></span><span><strong>Round {formatInteger(row.round)}</strong><span className="hash-preview">{row.transactionHash.slice(0, 7)}…{row.transactionHash.slice(-5)}</span></span></td>
            <td data-label="Block height" className="numeric">{formatInteger(row.blockHeight)}</td>
            <td data-label="Work added" className="numeric">+{formatInteger(row.work)}</td>
            <td data-label="SQK minted" className="numeric minted-cell">{tokenAmount(row.minted, data!.decimals)}</td>
            <td data-label="Status"><span className={`confirmation ${['safe', 'finalized', 'confirmed'].includes(row.confirmation.toLowerCase()) ? 'confirmation-good' : 'confirmation-neutral'}`}><Check size={12} />{humanize(row.confirmation)}</span></td>
            <td data-label="Time (UTC)" className="time-cell"><time dateTime={row.timestamp} title={`${utcDate(row.timestamp)}, ${utcTime(row.timestamp)} UTC`}>{utcTime(row.timestamp)}<span>{utcDate(row.timestamp)}</span></time></td>
            <td className="expand-cell"><button className="icon-button expand-button" type="button" aria-label={`${isExpanded ? 'Hide' : 'Show'} details for round ${row.round}`} aria-expanded={isExpanded} aria-controls={`settlement-${row.transactionHash}`} onClick={() => { setExpanded(isExpanded ? null : row.transactionHash); setCopyMessage(''); }}><ChevronDown size={16} /></button></td>
          </tr>
          {isExpanded && <tr className="detail-row" id={`settlement-${row.transactionHash}`}><td colSpan={7}><div className="settlement-detail">
            <div className="detail-transaction"><span className="detail-label">Transaction hash</span><code>{row.transactionHash}</code><div className="detail-actions"><button type="button" className="text-button" onClick={() => void copy(row.transactionHash)}><Copy size={14} />Copy hash</button>{url && <a href={url} target="_blank" rel="noreferrer" className="text-button">View transaction<ArrowUpRight size={14} /><span className="sr-only"> (opens in a new tab)</span></a>}</div></div>
            <div><span className="detail-label">Exact SQK minted</span><span className="exact-value">{tokenAmount(row.minted, data!.decimals, data!.decimals, false)} {data!.symbol}</span></div>
            <div><span className="detail-label">Completed blocks</span><strong>{formatInteger(row.blocks)}</strong></div>
            <p className="copy-message" role="status">{copyMessage}</p>
          </div></td></tr>}
        </SettlementRows>;
      })}</tbody>
    </table></div>
    {visibleRows.length === 0 && <div className="table-empty"><Search size={24} /><h3>{query ? 'No matching settlements' : loading ? 'Loading settlements' : error ? 'Settlements are unavailable' : 'No recent settlements'}</h3><p>{query ? 'Try another round, block height or transaction hash.' : error ? 'Use Refresh above to try the settlements API again.' : loading ? 'Fetching the latest onchain records.' : 'New records will appear here when the API reports them.'}</p>{query && <button className="secondary-button" type="button" onClick={() => { setQuery(''); setPage(0); }}>Clear search</button>}</div>}
    <div className="table-footer"><span role="status">{rows.length > 0 ? `${safePage * 5 + 1}–${Math.min(safePage * 5 + 5, rows.length)} of ${rows.length} ${query ? 'matching' : 'recent'} settlements` : '0 settlements shown'}</span><div className="pagination"><button type="button" className="icon-button" aria-label="Previous settlements" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft size={17} /></button><span>{safePage + 1} / {Math.max(1, Math.ceil(rows.length / 5))}</span><button type="button" className="icon-button" aria-label="Next settlements" disabled={(safePage + 1) * 5 >= rows.length} onClick={() => setPage(safePage + 1)}><ChevronRight size={17} /></button></div></div>
  </section>;
}

function SettlementRows({ children }: { children: React.ReactNode }) { return <>{children}</>; }
