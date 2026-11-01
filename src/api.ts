export const API = {
  status: 'https://api.squeekchain.com/v1/status',
  economy: 'https://api.squeekchain.com/v1/economy/state',
  settlements: 'https://api.squeekchain.com/v1/settlements?range=24h',
} as const;

export interface StatusData {
  generatedAt: string;
  observedAt: string;
  freshness: string;
  staleAfterSeconds: number;
  coreStatus: string;
  blockHeight: string | null;
  cumulativeWork: string;
  distanceMm: number;
}

export interface EconomyData {
  generatedAt: string;
  chain: string;
  chainId: string;
  symbol: string;
  decimals: number;
  liveSupply: string;
  cap: string;
  minted: string;
  burned: string;
}

export interface Settlement {
  transactionHash: string;
  round: string;
  blockHeight: string;
  work: string;
  blocks: string;
  timestamp: string;
  confirmation: string;
  minted: string;
}

export interface Bucket {
  startAt: string;
  endAt: string;
  work: string;
  blocks: string;
  settlements: string;
}

export interface SettlementsData {
  generatedAt: string;
  chainId: string;
  decimals: number;
  symbol: string;
  count: string;
  work: string;
  blocks: string;
  minted: string | null;
  recent: Settlement[];
  buckets: Bucket[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The API returned an unexpected response.');
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('The API returned an incomplete response.');
  return value;
}

function integer(value: unknown): string {
  const result = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : text(value);
  if (!/^\d+$/.test(result)) throw new Error('The API returned an invalid number.');
  return result;
}

function date(value: unknown): string {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result))) throw new Error('The API returned an invalid timestamp.');
  return result;
}

function decimals(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 36) throw new Error('The API returned invalid token precision.');
  return value;
}

export function parseStatus(value: unknown): StatusData {
  const root = object(value);
  const measurement = object(root.measurement);
  const builder = object(root.builder);
  const anchor = builder.status === 'available' && builder.anchor ? object(builder.anchor) : null;
  if (typeof measurement.distanceMm !== 'number' || !Number.isSafeInteger(measurement.distanceMm) || measurement.distanceMm < 0) throw new Error('The API returned invalid distance data.');
  return {
    generatedAt: date(root.generatedAt),
    observedAt: date(measurement.observedAt),
    freshness: text(measurement.freshness),
    staleAfterSeconds: Number(integer(measurement.staleAfterSeconds)),
    coreStatus: text(measurement.coreStatus),
    blockHeight: anchor ? integer(anchor.blockHeight) : null,
    cumulativeWork: integer(measurement.cumulativeWorkUnits),
    distanceMm: measurement.distanceMm,
  };
}

export function parseEconomy(value: unknown): EconomyData {
  const root = object(value);
  if (root.status !== 'available') throw new Error('Economy data is temporarily unavailable.');
  const supply = object(root.supply);
  const asset = object(root.asset);
  const chain = object(root.chain);
  const cap = integer(supply.capBaseUnits);
  if (BigInt(cap) === 0n) throw new Error('The API returned an invalid supply cap.');
  return {
    generatedAt: date(root.generatedAt),
    chain: text(chain.target),
    chainId: integer(chain.chainId),
    symbol: text(asset.symbol),
    decimals: decimals(asset.decimals),
    liveSupply: integer(supply.liveSupplyBaseUnits),
    cap,
    minted: integer(supply.totalMintedBaseUnits),
    burned: integer(supply.totalBurnedBaseUnits),
  };
}

export function parseSettlements(value: unknown): SettlementsData {
  const root = object(value);
  if (root.status !== 'available') throw new Error('Settlement data is temporarily unavailable.');
  const summary = object(root.summary);
  const mining = object(root.mining);
  const economy = object(mining.economy);
  if (!Array.isArray(root.recentSettlements) || !Array.isArray(root.buckets)) throw new Error('The API returned an incomplete settlement list.');
  return {
    generatedAt: date(root.generatedAt),
    chainId: integer(object(root.chain).chainId),
    decimals: decimals(economy.decimals),
    symbol: text(economy.symbol),
    count: integer(summary.settlementCount),
    work: integer(summary.workAdded),
    blocks: integer(summary.completedBlockCount),
    minted: mining.rangeMintedBaseUnits == null ? null : integer(mining.rangeMintedBaseUnits),
    recent: root.recentSettlements.map((value) => {
      const row = object(value);
      const hash = text(row.transactionHash);
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('The API returned an invalid transaction hash.');
      return {
        transactionHash: hash,
        round: integer(row.settledThroughRound),
        blockHeight: integer(row.blockHeight),
        work: integer(row.workAdded),
        blocks: integer(row.completedBlockCount),
        timestamp: date(row.blockTimestamp),
        confirmation: text(row.confirmationStatus),
        minted: integer(row.sqkMintedBaseUnits),
      };
    }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    buckets: root.buckets.map((value) => {
      const bucket = object(value);
      return {
        startAt: date(bucket.startAt),
        endAt: date(bucket.endAt),
        work: integer(bucket.workAdded),
        blocks: integer(bucket.completedBlockCount),
        settlements: integer(bucket.settlementCount),
      };
    }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)),
  };
}

export async function fetchSource<T>(url: string, parse: (value: unknown) => T, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`The API returned HTTP ${response.status}.`);
  return parse(await response.json());
}

export const formatInteger = (value: string) => BigInt(value).toLocaleString('en-US');

/** Fixed-point arithmetic keeps the full onchain integer out of floating point. */
export function tokenAmount(value: string, precision: number, places = 2, group = true): string {
  const amount = BigInt(value);
  const displayPlaces = Math.min(places, precision);
  const step = 10n ** BigInt(precision - displayPlaces);
  const rounded = (amount + (places < precision ? step / 2n : 0n)) / step;
  const displayBase = 10n ** BigInt(displayPlaces);
  const whole = rounded / displayBase;
  const fraction = rounded % displayBase;
  return `${group ? whole.toLocaleString('en-US') : whole}${displayPlaces ? `.${fraction.toString().padStart(displayPlaces, '0')}` : ''}`;
}

export function supplyPercent(live: string, cap: string): number {
  return Number(BigInt(live) * 10000n / BigInt(cap)) / 100;
}

export function transactionUrl(chainId: string, hash: string): string | null {
  const explorer = chainId === '11155111' ? 'https://sepolia.etherscan.io' : chainId === '1' ? 'https://etherscan.io' : null;
  return explorer ? `${explorer}/tx/${hash}` : null;
}

export const utcTime = (value: string) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const utcDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
export const humanize = (value: string) => value.toLowerCase().replace(/[_-]/g, ' ').replace(/^./, (s) => s.toUpperCase());
