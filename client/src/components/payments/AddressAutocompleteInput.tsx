import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface AddressAutocompleteInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string | null;
}

type MapboxSuggestion = {
  id: string;
  name: string;
  placeFormatted: string;
  context?: string;
};

type RetrieveFeature = {
  properties?: {
    full_address?: string;
    name?: string;
  };
};

const MAPBOX_SUGGEST_URL = 'https://api.mapbox.com/search/searchbox/v1/suggest';
const MAPBOX_RETRIEVE_URL = 'https://api.mapbox.com/search/searchbox/v1/retrieve';
const MAPBOX_SESSION_TTL = 5 * 60 * 1000; // 5 minutter

const createSessionToken = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  helperText,
  error
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<{ token: string; createdAt: number } | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapboxToken = useMemo(() => process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '', []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const ensureSessionToken = useCallback(() => {
    const now = Date.now();
    if (!sessionRef.current || now - sessionRef.current.createdAt > MAPBOX_SESSION_TTL) {
      sessionRef.current = { token: createSessionToken(), createdAt: now };
    }
    return sessionRef.current.token;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current || containerRef.current.contains(event.target as Node)) {
        return;
      }
      setIsFocused(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (blurTimeout.current) {
        clearTimeout(blurTimeout.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      setSuggestions([]);
      setLoadingPredictions(false);
      return;
    }

    const trimmed = query.trim();

    if (!mapboxToken) {
      setSuggestions([]);
      if (trimmed.length >= 3) {
        setPlacesError('Autoutfylling er deaktivert fordi Mapbox-nøkkel mangler.');
      }
      return;
    }

    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoadingPredictions(false);
      setPlacesError(null);
      return;
    }

    setLoadingPredictions(true);
    setPlacesError(null);
    setIsFocused(true);

    const sessionToken = ensureSessionToken();
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: '5',
          language: 'nb',
          session_token: sessionToken,
          access_token: mapboxToken,
          country: 'NO',
          types: 'address'
        });

        const response = await fetch(`${MAPBOX_SUGGEST_URL}?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Kunne ikke hente adresseforslag (status ${response.status})`);
        }

        const data = await response.json();
        const mapped: MapboxSuggestion[] = (data?.suggestions || []).map((item: any) => ({
          id: item.mapbox_id,
          name: item.name,
          placeFormatted: item.place_formatted || item.full_address || item.name,
          context: Array.isArray(item.context)
            ? item.context
                .map((ctx: any) => ctx?.name)
                .filter((part: string | undefined): part is string => Boolean(part))
                .join(', ')
            : undefined
        }));

        setSuggestions(mapped);
        setHighlightedIndex(mapped.length > 0 ? 0 : -1);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        console.warn('Kunne ikke hente adresseforslag fra Mapbox', fetchError);
        setPlacesError('Klarte ikke å hente adresseforslag akkurat nå. Prøv igjen senere.');
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingPredictions(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [disabled, ensureSessionToken, mapboxToken, query]);

  const handlePredictionSelect = useCallback(
    async (suggestion: MapboxSuggestion) => {
      const fallbackAddress = suggestion.placeFormatted || suggestion.name;
      if (!mapboxToken) {
        onChange(fallbackAddress);
        setQuery(fallbackAddress);
        setSuggestions([]);
        setHighlightedIndex(-1);
        return;
      }

      try {
        const token = ensureSessionToken();
        const response = await fetch(
          `${MAPBOX_RETRIEVE_URL}/${encodeURIComponent(suggestion.id)}?` +
            new URLSearchParams({
              access_token: mapboxToken,
              session_token: token,
              language: 'nb'
            })
        );

        if (!response.ok) {
          throw new Error(`Kunne ikke hente adresse (status ${response.status})`);
        }

        const data: { features?: RetrieveFeature[] } = await response.json();
        const details = data.features?.[0]?.properties;
        const finalAddress = details?.full_address || details?.name || fallbackAddress;

        onChange(finalAddress);
        setQuery(finalAddress);
        setSuggestions([]);
        setHighlightedIndex(-1);
        setPlacesError(null);
      } catch (error) {
        console.warn('Kunne ikke hente detaljert adresse fra Mapbox', error);
        onChange(fallbackAddress);
        setQuery(fallbackAddress);
        setSuggestions([]);
        setHighlightedIndex(-1);
        setPlacesError('Kunne ikke hente komplett adresse, men vi har fylt inn det som ble valgt.');
      }
    },
    [ensureSessionToken, mapboxToken, onChange]
  );

  const handleBlur = useCallback(() => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }

    blurTimeout.current = setTimeout(() => {
      setSuggestions([]);
      setLoadingPredictions(false);
      setHighlightedIndex(-1);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    if (disabled) {
      return;
    }

    if (query.trim().length >= 3) {
      setIsFocused(true);
    }
  }, [disabled, query]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (suggestions.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % suggestions.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (event.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          event.preventDefault();
          handlePredictionSelect(suggestions[highlightedIndex]);
        }
      } else if (event.key === 'Escape') {
        setSuggestions([]);
        setHighlightedIndex(-1);
      }
    },
    [handlePredictionSelect, highlightedIndex, suggestions]
  );

  const helper = useMemo(() => {
    if (error) {
      return error;
    }

    if (placesError) {
      return placesError;
    }

    return helperText;
  }, [error, helperText, placesError]);

  return (
    <div className="space-y-1" ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={event => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            onChange(nextValue);
            setPlacesError(null);
            if (nextValue.trim().length === 0) {
              setSuggestions([]);
            }
          }}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-slate-300'
          }`}
        />
        {suggestions.length > 0 && isFocused && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-slate-100 ${
                  highlightedIndex === index ? 'bg-slate-100' : ''
                }`}
                onMouseDown={event => {
                  event.preventDefault();
                  handlePredictionSelect(suggestion);
                }}
              >
                <div className="text-slate-900">{suggestion.placeFormatted || suggestion.name}</div>
                {suggestion.context && <div className="text-xs text-slate-500">{suggestion.context}</div>}
              </li>
            ))}
          </ul>
        )}
        {loadingPredictions && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            <svg
              className="h-4 w-4 animate-spin text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}
      </div>
      {helper ? (
        <p className={`text-xs ${error || placesError ? 'text-red-500' : 'text-slate-500'}`}>{helper}</p>
      ) : null}
    </div>
  );
};

export default AddressAutocompleteInput;
