import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { apiGet, apiPost } from '../utils/apiClient';
import { Building2, Loader2, Mail, Phone, PlusCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Club {
  id: number;
  name: string;
  slug: string;
  subdomain: string;
  organizationId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  billingName: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  billingReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClubFormState {
  name: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  billingReference: string;
  notes: string;
}

const emptyFormState: ClubFormState = {
  name: '',
  subdomain: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  billingName: '',
  billingEmail: '',
  billingAddress: '',
  billingReference: '',
  notes: '',
};

const DOMAIN_SUFFIX = 'kartarkiv.co';

const ClubManagementPanel: React.FC = () => {
  const { loading: authLoading, token } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [formState, setFormState] = useState<ClubFormState>(emptyFormState);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchClubs = useCallback(async () => {
    try {
      setLoadingClubs(true);
      const response = await apiGet('/api/clubs');
      setClubs(response.data as Club[]);
    } catch (error) {
      console.error('Kunne ikke hente klubber', error);
      setFormError('Kunne ikke hente eksisterende klubber. Prøv igjen senere.');
    } finally {
      setLoadingClubs(false);
    }
  }, []);

  const authReady = useMemo(() => !authLoading && Boolean(token), [authLoading, token]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    fetchClubs();
  }, [authReady, fetchClubs]);

  const handleChange = (field: keyof ClubFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;

    if (field === 'subdomain') {
      setFormState((prev) => ({ ...prev, [field]: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
      return;
    }

    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const domainPreview = useMemo(() => {
    if (!formState.subdomain) {
      return `subdomene.${DOMAIN_SUFFIX}`;
    }

    return `${formState.subdomain}.${DOMAIN_SUFFIX}`;
  }, [formState.subdomain]);

  const resetForm = () => {
    setFormState(emptyFormState);
  };

  const extractErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return (error.response?.data as { error?: string })?.error || 'Noe gikk galt ved opprettelse av klubben.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Noe gikk galt ved opprettelse av klubben.';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await apiPost('/api/clubs', {
        name: formState.name,
        subdomain: formState.subdomain,
        contactName: formState.contactName,
        contactEmail: formState.contactEmail,
        contactPhone: formState.contactPhone,
        billingName: formState.billingName,
        billingEmail: formState.billingEmail,
        billingAddress: formState.billingAddress,
        billingReference: formState.billingReference,
        notes: formState.notes,
      });

      setFormSuccess('Ny klubb ble opprettet. Del subdomene og innloggingsinformasjon med klubben.');
      resetForm();
      fetchClubs();
    } catch (error) {
      const message = extractErrorMessage(error);
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card bg-white">
      <div className="flex items-start gap-3 mb-6">
        <Building2 className="h-6 w-6 text-brand-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Klubboppsett</h2>
          <p className="text-sm text-gray-500">
            Opprett nye klubber, reserver subdomener og noter kontakt- og fakturainformasjon før onboarding.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Klubbdetaljer</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="club-name">
                  Klubbnavn
                </label>
                <input
                  id="club-name"
                  type="text"
                  required
                  value={formState.name}
                  onChange={handleChange('name')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="club-subdomain">
                  Subdomene
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                    https://
                  </span>
                  <input
                    id="club-subdomain"
                    type="text"
                    required
                    pattern="[a-z0-9-]+"
                    value={formState.subdomain}
                    onChange={handleChange('subdomain')}
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
                    placeholder="eok"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Blir tilgjengelig som <span className="font-medium">{domainPreview}</span></p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Kontaktperson</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="contact-name">
                  Navn
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={formState.contactName}
                  onChange={handleChange('contactName')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="contact-email">
                  E-post
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={formState.contactEmail}
                  onChange={handleChange('contactEmail')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="contact-phone">
                  Telefon
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={formState.contactPhone}
                  onChange={handleChange('contactPhone')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Fakturadetaljer</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="billing-name">
                  Fakturamottaker
                </label>
                <input
                  id="billing-name"
                  type="text"
                  value={formState.billingName}
                  onChange={handleChange('billingName')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="Navn på klubb eller fakturamottaker"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="billing-email">
                  Faktura e-post
                </label>
                <input
                  id="billing-email"
                  type="email"
                  value={formState.billingEmail}
                  onChange={handleChange('billingEmail')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="faktura@klubb.no"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="billing-address">
                  Fakturaadresse
                </label>
                <input
                  id="billing-address"
                  type="text"
                  value={formState.billingAddress}
                  onChange={handleChange('billingAddress')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                  placeholder="Gateadresse, postnummer og sted"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="billing-reference">
                  Referanse / PO-nummer
                </label>
                <input
                  id="billing-reference"
                  type="text"
                  value={formState.billingReference}
                  onChange={handleChange('billingReference')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="club-notes">
              Notater
            </label>
            <textarea
              id="club-notes"
              value={formState.notes}
              onChange={handleChange('notes')}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="Tilleggsinformasjon som kan være nyttig for onboarding eller fakturering"
            />
          </div>

          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
              {formSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oppretter klubb...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Opprett klubb
              </>
            )}
          </button>
        </form>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Eksisterende klubber</h3>
            <p className="mt-1 text-sm text-gray-500">
              Oversikt over klubber som allerede har tilgang til plattformen.
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
            {loadingClubs ? (
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Henter klubber...
              </div>
            ) : clubs.length === 0 ? (
              <p className="text-sm text-gray-500">
                Ingen klubber er registrert ennå. Opprett den første klubben med skjemaet.
              </p>
            ) : (
              <ul className="space-y-4">
                {clubs.map((club) => (
                  <li key={club.id} className="rounded-md bg-white p-4 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{club.name}</p>
                        <p className="text-xs text-gray-500">{club.subdomain}.{DOMAIN_SUFFIX}</p>
                        {club.organizationId && (
                          <p className="mt-1 text-[11px] text-gray-400 break-all">
                            Clerk organisasjon: {club.organizationId}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                        Opprettet {new Date(club.createdAt).toLocaleDateString('nb-NO')}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{club.contactEmail}</span>
                      </div>
                      {club.contactPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{club.contactPhone}</span>
                        </div>
                      )}
                      {club.billingEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{club.billingEmail}</span>
                        </div>
                      )}
                      {club.billingReference && (
                        <div className="text-xs text-gray-500">
                          Ref: {club.billingReference}
                        </div>
                      )}
                    </div>
                    {club.notes && (
                      <p className="mt-3 rounded-md bg-brand-50 p-3 text-xs text-brand-900">
                        {club.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubManagementPanel;
