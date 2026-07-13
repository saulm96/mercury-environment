'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Subscription, SubscriptionSummary, ServiceTypeStat, ApiResponse } from '@mercury/shared';

interface UseSubscriptionsReturn {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  fetchSubscriptions: () => Promise<void>;
  fetchStats: (year: number, month: number) => Promise<void>;
  fetchServiceTypes: () => Promise<void>;
  fetchUpcoming: (from: string, to: string) => Promise<void>;
  handleCreate: (data: { recurringTransactionId: string; serviceType: string }) => Promise<void>;
  handleUpdate: (id: string, data: { serviceType: string }) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  stats: SubscriptionSummary | null;
  serviceTypeStats: ServiceTypeStat[];
  upcomingRenewals: Subscription[];
  resetCache: () => void;
}

let cachedSubscriptions: Subscription[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000;

export function resetSubscriptionsCache() {
  cachedSubscriptions = null;
  cacheTimestamp = 0;
}

export function useSubscriptions(): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SubscriptionSummary | null>(null);
  const [serviceTypeStats, setServiceTypeStats] = useState<ServiceTypeStat[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Subscription[]>([]);

  const fetchSubscriptions = useCallback(async () => {
    const now = Date.now();
    if (cachedSubscriptions !== null && now - cacheTimestamp < CACHE_TTL) {
      setSubscriptions(cachedSubscriptions);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Subscription[]>>('/subscriptions');
      const data = response.data ?? [];
      cachedSubscriptions = data;
      cacheTimestamp = Date.now();
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<SubscriptionSummary>>(
        `/subscriptions/stats?year=${year}&month=${month}`,
      );
      const data = response.data;
      setStats(
        data
          ? {
              ...data,
              monthlyTotal: Number(data.monthlyTotal),
              yearlyTotal: Number(data.yearlyTotal),
              activeCount: Number(data.activeCount),
            }
          : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiceTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<ServiceTypeStat[]>>('/subscriptions/service-types');
      const data = response.data ?? [];
      setServiceTypeStats(
        data.map((stat) => ({
          ...stat,
          monthlyTotal: Number(stat.monthlyTotal),
          count: Number(stat.count),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpcoming = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Subscription[]>>(
        `/subscriptions/upcoming?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setUpcomingRenewals(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = useCallback(
    async (data: { recurringTransactionId: string; serviceType: string }) => {
      setError(null);
      try {
        await api.post<ApiResponse<Subscription>>('/subscriptions', data);
        resetSubscriptionsCache();
        await fetchSubscriptions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchSubscriptions],
  );

  const handleUpdate = useCallback(
    async (id: string, data: { serviceType: string }) => {
      setError(null);
      try {
        await api.patch<ApiResponse<Subscription>>(`/subscriptions/${id}`, data);
        resetSubscriptionsCache();
        await fetchSubscriptions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchSubscriptions],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.delete<ApiResponse<null>>(`/subscriptions/${id}`);
        resetSubscriptionsCache();
        await fetchSubscriptions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchSubscriptions],
  );

  const resetCache = useCallback(() => {
    resetSubscriptionsCache();
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    fetchStats,
    fetchServiceTypes,
    fetchUpcoming,
    handleCreate,
    handleUpdate,
    handleDelete,
    stats,
    serviceTypeStats,
    upcomingRenewals,
    resetCache,
  };
}
