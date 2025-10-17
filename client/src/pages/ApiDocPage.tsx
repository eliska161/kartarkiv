import React, { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

type SwaggerTag = {
  name: string;
  description?: string;
};

type SwaggerOperation = {
  summary?: string;
  description?: string;
  tags?: string[];
};

type SwaggerSpec = {
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  tags?: SwaggerTag[];
  paths?: Record<string, Record<string, SwaggerOperation>>;
};

interface EndpointEntry {
  method: string;
  path: string;
  summary: string;
  tag: string;
}

const ApiDocPage: React.FC = () => {
  const [spec, setSpec] = useState<SwaggerSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadSpec = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/docs-json`, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Klarte ikke å hente dokumentasjonen (status ${response.status}).`);
        }

        const data: SwaggerSpec = await response.json();
        setSpec(data);
        setError(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }

        console.error('Kunne ikke hente API-dokumentasjonen', err);
        setError('Kunne ikke hente API-dokumentasjonen akkurat nå. Prøv igjen senere.');
      } finally {
        setLoading(false);
      }
    };

    loadSpec();

    return () => controller.abort();
  }, []);

  const endpoints = useMemo<EndpointEntry[]>(() => {
    if (!spec?.paths) {
      return [];
    }

    return Object.entries(spec.paths)
      .flatMap(([pathKey, methods]) =>
        Object.entries(methods).map(([method, details]) => ({
          method: method.toUpperCase(),
          path: pathKey,
          summary: details.summary || details.description || 'Ingen beskrivelse tilgjengelig.',
          tag: Array.isArray(details.tags) && details.tags.length > 0 ? details.tags[0] : 'Generelt',
        }))
      )
      .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  }, [spec]);

  const tags = spec?.tags ?? [];
  const info = spec?.info ?? {};
  const generatedAt = useMemo(() => new Date().toLocaleString('nb-NO'), []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-8 py-10 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
            <h1 className="text-3xl font-bold text-white mb-2">{info.title || 'Kartarkiv API'}</h1>
            <p className="text-slate-200 mb-4 max-w-2xl">
              {info.description || 'Oversikt over tilgjengelige API-endepunkter for Kartarkiv.'}
            </p>
            <div className="text-sm text-slate-300 space-y-1">
              <p>Versjon: {info.version || '1.0.0'}</p>
              <p>Generert: {generatedAt}</p>
              <p>
                For interaktiv dokumentasjon kan du besøke{' '}
                <a
                  href={`${API_BASE_URL}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 underline hover:text-blue-100"
                >
                  Swagger UI
                </a>{' '}
                eller hente råspesifikasjonen via{' '}
                <a
                  href={`${API_BASE_URL}/docs-json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 underline hover:text-blue-100"
                >
                  JSON-endepunktet
                </a>.
              </p>
            </div>
          </div>

          <div className="px-8 py-10 space-y-10">
            {loading && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-slate-600 text-center">
                Laster API-dokumentasjon ...
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6">
                <p className="font-semibold mb-2">Noe gikk galt.</p>
                <p className="mb-4">{error}</p>
                <p>
                  Du kan fortsatt åpne dokumentasjonen direkte via{' '}
                  <a
                    href={`${API_BASE_URL}/api-doc`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-700 underline"
                  >
                    API-serveren
                  </a>.
                </p>
              </div>
            )}

            {!loading && !error && (
              <>
                <section>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-4">Tagger</h2>
                  {tags.length > 0 ? (
                    <ul className="grid gap-4 md:grid-cols-2">
                      {tags.map((tag) => (
                        <li key={tag.name} className="border border-slate-200 rounded-lg p-4 bg-white">
                          <p className="text-sm font-semibold text-slate-900">{tag.name}</p>
                          {tag.description && (
                            <p className="text-sm text-slate-600 mt-2">{tag.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-600 italic">Ingen tagger definert i spesifikasjonen.</p>
                  )}
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-4">Endepunkter</h2>
                  {endpoints.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-900 text-slate-100">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                              Metode
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                              Rute
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                              Beskrivelse
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                              Tagg
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {endpoints.map((endpoint) => (
                            <tr key={`${endpoint.method}-${endpoint.path}`} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-semibold">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
                                    endpoint.method === 'GET'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : endpoint.method === 'POST'
                                        ? 'bg-blue-100 text-blue-700'
                                        : endpoint.method === 'PUT'
                                          ? 'bg-amber-100 text-amber-700'
                                          : endpoint.method === 'DELETE'
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {endpoint.method}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-slate-900">{endpoint.path}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{endpoint.summary}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{endpoint.tag}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-600 italic">Ingen endepunkter funnet i spesifikasjonen.</p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocPage;
