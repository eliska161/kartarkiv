import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import apiClient from '../utils/apiClient';

export type TenantRole = 'global' | 'club';

interface TenantContextValue {
  /** Slug for the active club resolved from the subdomain or overrides. */
  clubSlug: string | null;
  /** Indicates whether the user is visiting the root tenant (no club subdomain). */
  isDefaultTenant: boolean;
  /** Fully qualified host for the current request. */
  host: string;
  /** Optional active organization identifier from Clerk. */
  organizationId: string | null;
  /** Allows consumers (e.g. auth flows) to override the active organization. */
  setOrganizationId: (organizationId: string | null) => void;
  /** Allows consumers to override the slug determined from the subdomain. */
  setClubSlug: (clubSlug: string | null) => void;
}

const defaultContext: TenantContextValue = {
  clubSlug: null,
  isDefaultTenant: true,
  host: '',
  organizationId: null,
  setOrganizationId: () => undefined,
  setClubSlug: () => undefined,
};

const TenantContext = createContext<TenantContextValue>(defaultContext);

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'webmaster']);

const normalizeHost = (host: string | undefined | null) => {
  if (!host) {
    return '';
  }
  return host.split(':')[0].toLowerCase();
};

const resolveClubSlugFromHost = (host: string): { clubSlug: string | null; isDefaultTenant: boolean } => {
  if (!host) {
    return { clubSlug: null, isDefaultTenant: true };
  }

  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || normalizedHost === 'localhost' || normalizedHost.endsWith('.localhost')) {
    return { clubSlug: null, isDefaultTenant: true };
  }

  const hostParts = normalizedHost.split('.');
  if (hostParts.length <= 2) {
    return { clubSlug: null, isDefaultTenant: true };
  }

  const [possibleSlug] = hostParts;
  if (!possibleSlug || RESERVED_SUBDOMAINS.has(possibleSlug)) {
    return { clubSlug: null, isDefaultTenant: true };
  }

  return { clubSlug: possibleSlug, isDefaultTenant: false };
};

interface TenantProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEYS = {
  organizationId: 'kartarkiv.activeOrganizationId',
  clubSlug: 'kartarkiv.activeClubSlug',
};

const readStorageValue = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(key);
    return value ? value : null;
  } catch (error) {
    console.warn(`⚠️ Failed to read ${key} from localStorage:`, error);
    return null;
  }
};

const writeStorageValue = (key: string, value: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to persist ${key} to localStorage:`, error);
  }
};

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [organizationId, setOrganizationIdState] = useState<string | null>(() => readStorageValue(STORAGE_KEYS.organizationId));
  const [clubSlugOverride, setClubSlugOverride] = useState<string | null | undefined>(() => {
    const stored = readStorageValue(STORAGE_KEYS.clubSlug);
    return stored === null ? undefined : stored;
  });
  const host = typeof window !== 'undefined' ? window.location.host : '';

  const derivedTenant = useMemo(() => {
    const baseTenant = resolveClubSlugFromHost(host);

    if (clubSlugOverride === undefined) {
      return { ...baseTenant, host };
    }

    if (clubSlugOverride === null) {
      return { ...baseTenant, host };
    }

    if (clubSlugOverride === '') {
      return { clubSlug: null, isDefaultTenant: true, host };
    }

    return { clubSlug: clubSlugOverride, isDefaultTenant: false, host };
  }, [host, clubSlugOverride]);

  useEffect(() => {
    const headerValue = derivedTenant.clubSlug ?? undefined;
    if (headerValue) {
      axios.defaults.headers.common['X-Club-Slug'] = headerValue;
      apiClient.defaults.headers.common['X-Club-Slug'] = headerValue;
      writeStorageValue(STORAGE_KEYS.clubSlug, headerValue);
    } else {
      delete axios.defaults.headers.common['X-Club-Slug'];
      delete apiClient.defaults.headers.common['X-Club-Slug'];
      writeStorageValue(STORAGE_KEYS.clubSlug, null);
    }
  }, [derivedTenant.clubSlug]);

  useEffect(() => {
    if (organizationId) {
      axios.defaults.headers.common['X-Organization-Id'] = organizationId;
      apiClient.defaults.headers.common['X-Organization-Id'] = organizationId;
      writeStorageValue(STORAGE_KEYS.organizationId, organizationId);
    } else {
      delete axios.defaults.headers.common['X-Organization-Id'];
      delete apiClient.defaults.headers.common['X-Organization-Id'];
      writeStorageValue(STORAGE_KEYS.organizationId, null);
    }
  }, [organizationId]);

  const value = useMemo<TenantContextValue>(() => ({
    clubSlug: derivedTenant.clubSlug,
    isDefaultTenant: derivedTenant.isDefaultTenant,
    host: derivedTenant.host,
    organizationId,
    setOrganizationId: (nextOrganizationId: string | null) => {
      setOrganizationIdState(nextOrganizationId);
    },
    setClubSlug: (slug) => {
      if (typeof slug === 'undefined') {
        setClubSlugOverride(undefined);
      } else if (slug === null) {
        setClubSlugOverride('');
      } else {
        setClubSlugOverride(slug);
      }
    },
  }), [derivedTenant, organizationId]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export default TenantContext;
