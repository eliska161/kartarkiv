import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

type Prediction = {
  description: string;
  place_id: string;
};

const GOOGLE_SCRIPT_ID = 'google-places-sdk';
let googleScriptPromise: Promise<void> | null = null;

const loadGooglePlacesSdk = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Ingen tilgang til window-objektet'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  const apiKey =
    process.env.REACT_APP_GOOGLE_PLACES_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    return Promise.reject(new Error('GOOGLE_PLACES_API_KEY mangler'));
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      if (document.getElementById(GOOGLE_SCRIPT_ID)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=nb&region=NO`;
      script.onload = () => {
        if (window.google?.maps?.places) {
          resolve();
        } else {
          reject(new Error('Google Maps Places-biblioteket ble ikke lastet inn'));
        }
      };
      script.onerror = () => reject(new Error('Klarte ikke å laste Google Maps SDK'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
};

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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [placesReady, setPlacesReady] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const serviceRef = useRef<any>(null);
  const detailsServiceRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setPredictions([]);
      return;
    }

    loadGooglePlacesSdk()
      .then(() => {
        if (!window.google?.maps?.places) {
          throw new Error('Google Places API er ikke tilgjengelig');
        }

        serviceRef.current = new window.google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        detailsServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setPlacesReady(true);
        setPlacesError(null);
      })
      .catch(err => {
        console.warn('Adresse-autoutfylling er ikke tilgjengelig', err);
        setPlacesReady(false);
        setPlacesError('Autoutfylling er midlertidig utilgjengelig');
      });

    return () => {
      if (blurTimeout.current) {
        clearTimeout(blurTimeout.current);
      }
    };
  }, [disabled]);

  useEffect(() => {
    if (!placesReady || !serviceRef.current || disabled) {
      setPredictions([]);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setPredictions([]);
      return;
    }

    let cancelled = false;
    setLoadingPredictions(true);

    serviceRef.current.getPlacePredictions(
      {
        input: trimmed,
        sessionToken: sessionTokenRef.current ?? undefined,
        componentRestrictions: { country: ['no'] },
        types: ['geocode']
      },
      (results: any, status: any) => {
        if (cancelled) {
          return;
        }

        if (status === window.google?.maps?.places?.PlacesServiceStatus.OK && results) {
          setPredictions(results.slice(0, 5));
        } else {
          setPredictions([]);
        }
        setLoadingPredictions(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [query, placesReady, disabled]);

  const closePredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  const selectPrediction = useCallback(
    (prediction: Prediction) => {
      if (!detailsServiceRef.current || !window.google?.maps?.places) {
        onChange(prediction.description);
        setQuery(prediction.description);
        closePredictions();
        return;
      }

      detailsServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          sessionToken: sessionTokenRef.current ?? undefined,
          fields: ['formatted_address', 'address_components', 'name']
        },
        (details: any, status: any) => {
          let resolvedAddress = prediction.description;
          if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
            resolvedAddress = details.formatted_address || prediction.description;
          }

          onChange(resolvedAddress);
          setQuery(resolvedAddress);
          closePredictions();
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      );
    },
    [closePredictions, onChange]
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

  const handleBlur = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }

    blurTimeout.current = setTimeout(() => {
      closePredictions();
    }, 150);
  };

  return (
    <div className="space-y-1">
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
          }}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-slate-300'
          }`}
        />
        {predictions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {predictions.map(prediction => (
              <li
                key={prediction.place_id}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                onMouseDown={event => {
                  event.preventDefault();
                  selectPrediction(prediction);
                }}
              >
                {prediction.description}
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
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
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
