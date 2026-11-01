import { useCallback, useEffect, useRef, useState } from 'react';
import { API, fetchSource, parseEconomy, parseSettlements, parseStatus, type EconomyData, type SettlementsData, type StatusData } from './api';

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  updatedAt: number | null;
}

const initial = <T,>(): Resource<T> => ({ data: null, error: null, loading: true, updatedAt: null });
export const REFRESH_MS = 60_000;

export function useDashboard() {
  const [status, setStatus] = useState(initial<StatusData>);
  const [economy, setEconomy] = useState(initial<EconomyData>);
  const [settlements, setSettlements] = useState(initial<SettlementsData>);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [nextRefresh, setNextRefresh] = useState(Date.now() + REFRESH_MS);
  const [announcement, setAnnouncement] = useState('');
  const busy = useRef(false);
  const mounted = useRef(true);
  const controllers = useRef<AbortController[]>([]);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setAnnouncement('Refreshing dashboard data.');
    async function load<T>(url: string, parse: (value: unknown) => T, set: React.Dispatch<React.SetStateAction<Resource<T>>>) {
      set((previous) => ({ ...previous, loading: true }));
      const controller = new AbortController();
      controllers.current.push(controller);
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const data = await fetchSource(url, parse, controller.signal);
        if (mounted.current) set({ data, error: null, loading: false, updatedAt: Date.now() });
        return true;
      } catch (error) {
        const message = error instanceof DOMException && error.name === 'AbortError'
          ? 'The request timed out after 12 seconds.'
          : error instanceof TypeError ? 'Could not reach the API. Check your connection.'
          : error instanceof Error ? error.message : 'Could not load this data.';
        if (mounted.current) set((previous) => ({ ...previous, error: message, loading: false }));
        return false;
      } finally {
        window.clearTimeout(timeout);
        controllers.current = controllers.current.filter((item) => item !== controller);
      }
    }
    const results = await Promise.all([
      load(API.status, parseStatus, setStatus),
      load(API.economy, parseEconomy, setEconomy),
      load(API.settlements, parseSettlements, setSettlements),
    ]);
    busy.current = false;
    if (mounted.current) {
      const count = results.filter(Boolean).length;
      setAnnouncement(count === 3 ? 'Dashboard updated.' : `${count} of 3 data sources updated. Use Refresh to try again.`);
      setNextRefresh(Date.now() + REFRESH_MS);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; controllers.current.forEach((controller) => controller.abort()); };
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoRefresh && now >= nextRefresh && !busy.current) void refresh();
  }, [autoRefresh, now, nextRefresh, refresh]);

  function toggleAutoRefresh() {
    setAutoRefresh((previous) => !previous);
    setNextRefresh(Date.now() + REFRESH_MS);
  }

  return { status, economy, settlements, autoRefresh, toggleAutoRefresh, refresh, now,
    secondsLeft: Math.max(0, Math.ceil((nextRefresh - now) / 1_000)),
    refreshing: status.loading || economy.loading || settlements.loading, announcement };
}
