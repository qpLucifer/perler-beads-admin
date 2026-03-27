import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearListState, readListState, writeListState } from '../utils/listState';

function toPositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeByType(value, key, numberFields) {
  if (!numberFields.includes(key)) return value;
  if (value === '' || value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function isEmptyValue(value) {
  return value === undefined || value === null || value === '';
}

function sanitizeFilters(input, defaults, numberFields) {
  const next = {};
  Object.keys(defaults).forEach((key) => {
    const raw = input?.[key];
    next[key] = raw === undefined ? defaults[key] : normalizeByType(raw, key, numberFields);
  });
  return next;
}

export function useListState({
  storageKey,
  defaults,
  defaultPageSize = 20,
  numberFields = []
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const persisted = useMemo(() => readListState(storageKey), [storageKey]);

  const [pagination, setPagination] = useState({
    current: toPositiveInt(searchParams.get('page') ?? persisted.page, 1),
    pageSize: toPositiveInt(searchParams.get('limit') ?? persisted.limit, defaultPageSize),
    total: 0
  });

  const [filters, setFiltersRaw] = useState(() => {
    const next = {};
    Object.keys(defaults).forEach((key) => {
      const urlValue = searchParams.get(key);
      const raw = urlValue !== null ? urlValue : persisted[key];
      next[key] = raw === undefined ? defaults[key] : normalizeByType(raw, key, numberFields);
    });
    return next;
  });

  useEffect(() => {
    const next = new URLSearchParams();
    if (pagination.current !== 1) next.set('page', String(pagination.current));
    if (pagination.pageSize !== defaultPageSize) next.set('limit', String(pagination.pageSize));
    Object.keys(defaults).forEach((key) => {
      const value = filters[key];
      const defaultValue = defaults[key];
      if (!isEmptyValue(value) && value !== defaultValue) {
        next.set(key, String(value));
      }
    });
    setSearchParams(next, { replace: true });

    const isDefaultFilters = Object.keys(defaults).every((key) => filters[key] === defaults[key]);
    const isDefaultPage = pagination.current === 1 && pagination.pageSize === defaultPageSize;
    if (isDefaultFilters && isDefaultPage) {
      clearListState(storageKey);
    } else {
      writeListState(storageKey, {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      });
    }
  }, [pagination, filters, defaults, defaultPageSize, setSearchParams, storageKey]);

  const setFilters = (updater) => {
    setFiltersRaw((prev) => {
      const resolved = typeof updater === 'function' ? updater(prev) : updater;
      return sanitizeFilters(resolved, defaults, numberFields);
    });
  };

  const setFilter = (key, value) => {
    if (!Object.prototype.hasOwnProperty.call(defaults, key)) return;
    setFiltersRaw((prev) => sanitizeFilters({ ...prev, [key]: value }, defaults, numberFields));
  };

  const resetListState = () => {
    setFiltersRaw(defaults);
    setPagination((prev) => ({ ...prev, current: 1, pageSize: defaultPageSize }));
    clearListState(storageKey);
  };

  return {
    pagination,
    setPagination,
    filters,
    setFilters,
    setFilter,
    resetListState
  };
}
