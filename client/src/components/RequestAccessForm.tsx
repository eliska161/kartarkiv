import React, { useState } from 'react';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

interface FormState {
  clubName: string;
  contactName: string;
  contactEmail: string;
  expectedSizeGb: string;
  message: string;
  honeypot: string;
}

const initialState: FormState = {
  clubName: '',
  contactName: '',
  contactEmail: '',
  expectedSizeGb: '',
  message: '',
  honeypot: '',
};

const RequestAccessForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.honeypot) {
      return;
    }

    if (!form.clubName || !form.contactName || !form.contactEmail) {
      setError('Fyll inn klubbnavn, kontaktperson og e-post.');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          club_name: form.clubName,
          contact_name: form.contactName,
          contact_email: form.contactEmail,
          expected_size_gb: form.expectedSizeGb ? Number(form.expectedSizeGb) : undefined,
          message: form.message,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Kunne ikke sende forespørselen. Prøv igjen senere.');
      }

      setStatus('success');
      setForm(initialState);
    } catch (submitError) {
      console.error(submitError);
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Ukjent feil oppstod.');
    }
  };

  return (
    <div id="request-access" className="bg-white shadow-lg rounded-2xl p-8 border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900">Be om tilgang</h2>
      <p className="mt-2 text-gray-600">
        Kartarkiv er tilgjengelig for orienteringsklubber på invitasjon. Fortell oss litt om klubben din så tar vi kontakt.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="hidden">
          <label htmlFor="honeypot" className="sr-only">Ikke fyll inn dette feltet</label>
          <input
            id="honeypot"
            name="honeypot"
            autoComplete="off"
            tabIndex={-1}
            value={form.honeypot}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="clubName" className="block text-sm font-medium text-gray-700">
            Klubbnavn
          </label>
          <input
            type="text"
            id="clubName"
            name="clubName"
            required
            value={form.clubName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
            placeholder="Eksempel Orienteringsklubb"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
              Kontaktperson
            </label>
            <input
              type="text"
              id="contactName"
              name="contactName"
              required
              value={form.contactName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
              placeholder="Fornavn Etternavn"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
              E-post
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              required
              value={form.contactEmail}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
              placeholder="navn@klubb.no"
            />
          </div>
        </div>

        <div>
          <label htmlFor="expectedSizeGb" className="block text-sm font-medium text-gray-700">
            Forventet kartmengde (GB)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            id="expectedSizeGb"
            name="expectedSizeGb"
            value={form.expectedSizeGb}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
            placeholder="For eksempel 25"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Fortell oss mer (valgfritt)
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={form.message}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
            placeholder="Hvilke funksjoner er viktigst for klubben deres?"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Takk! Vi har mottatt forespørselen og kontakter deg innen kort tid.
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-md bg-brand-600 px-4 py-3 text-white font-semibold shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'loading' ? 'Sender forespørsel…' : 'Send forespørsel'}
        </button>
      </form>
    </div>
  );
};

export default RequestAccessForm;
