import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosResponse } from 'axios';
import { apiGet, apiPost } from '../utils/apiClient';
import { CreditCard, FileText, Loader2, PlusCircle, Send, Wallet, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import AddressAutocompleteInput from './payments/AddressAutocompleteInput';

interface PaymentManagementProps {
  isSuperAdmin: boolean;
}

interface InvoiceItemDraft {
  description: string;
  amount: string;
  quantity: number;
}

interface InvoiceItem {
  id?: number;
  description: string;
  amount: number;
  quantity: number;
  amount_cents?: number;
}

interface Invoice {
  id: number;
  month: string;
  due_date: string | null;
  notes: string | null;
  total_amount: number;
  status: 'pending' | 'invoice_requested' | 'paid';
  created_at: string;
  updated_at: string;
  invoice_requested_at: string | null;
  invoice_requested_by: string | null;
  invoice_request_email: string | null;
  invoice_request_name: string | null;
  invoice_request_phone: string | null;
  invoice_request_address: string | null;
  stripe_invoice_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_invoice_url?: string | null;
  stripe_invoice_pdf?: string | null;
  items: InvoiceItem[];
}

interface InvoiceRecipient {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<Invoice['status'], { label: string; className: string }> = {
  pending: {
    label: 'Avventer betaling',
    className: 'bg-yellow-100 text-yellow-800'
  },
  invoice_requested: {
    label: 'Faktura sendt',
    className: 'bg-blue-100 text-blue-800'
  },
  paid: {
    label: 'Betalt',
    className: 'bg-green-100 text-green-800'
  }
};

const STRIPE_FEE_PERCENT_NUMERATOR = 24;
const STRIPE_FEE_PERCENT_DENOMINATOR = 1000; // 2.4%
const STRIPE_FEE_FIXED = 2; // NOK 2,00

const sanitizePresetValue = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'Mangler telefon' || trimmed === 'Adresse ikke registrert') {
    return '';
  }

  return trimmed;
};

const calculateStripeFee = (baseAmount: number) => {
  if (!baseAmount || baseAmount <= 0) {
    return 0;
  }

  const baseCents = Math.round(baseAmount * 100);
  const percentFeeCents = Math.round((baseCents * STRIPE_FEE_PERCENT_NUMERATOR) / STRIPE_FEE_PERCENT_DENOMINATOR);
  const totalFeeCents = percentFeeCents + STRIPE_FEE_FIXED * 100;
  return totalFeeCents / 100;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(amount);

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('nb-NO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
};

const PaymentManagement: React.FC<PaymentManagementProps> = ({ isSuperAdmin }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentConfirmation, setPaymentConfirmation] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalEmail, setInvoiceModalEmail] = useState('');
  const [invoiceModalName, setInvoiceModalName] = useState('');
  const [invoiceModalPhone, setInvoiceModalPhone] = useState('');
  const [invoiceModalAddress, setInvoiceModalAddress] = useState('');
  const [invoiceModalSelectedRecipient, setInvoiceModalSelectedRecipient] = useState<string>('custom');
  const [invoiceModalLoading, setInvoiceModalLoading] = useState(false);
  const [invoiceModalTarget, setInvoiceModalTarget] = useState<Invoice | null>(null);
  const [recipients, setRecipients] = useState<InvoiceRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientSaving, setRecipientSaving] = useState(false);
  const hasHandledCheckoutRef = useRef(false);
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const collator = useMemo(() => new Intl.Collator('nb', { sensitivity: 'base' }), []);

  const [form, setForm] = useState({
    month: '',
    dueDate: '',
    notes: '',
    items: [
      {
        description: '',
        amount: '',
        quantity: 1
      }
    ] as InvoiceItemDraft[]
  });

  const formBaseTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const amount = parseFloat(item.amount.replace(',', '.')) || 0;
      return sum + amount * (item.quantity || 1);
    }, 0);
  }, [form.items]);

  const formStripeFee = useMemo(() => calculateStripeFee(formBaseTotal), [formBaseTotal]);
  const formTotal = useMemo(() => formBaseTotal + formStripeFee, [formBaseTotal, formStripeFee]);

  const sortRecipients = useCallback(
    (list: InvoiceRecipient[]) =>
      [...list].sort((a, b) => {
        const nameComparison = collator.compare(a.name, b.name);
        if (nameComparison !== 0) {
          return nameComparison;
        }
        return collator.compare(a.email, b.email);
      }),
    [collator]
  );

  const fetchRecipients = useCallback(
    async (withSpinner = true) => {
      if (withSpinner) {
        setRecipientsLoading(true);
      }

      try {
        const { data } = (await apiGet('/api/payments/recipients')) as AxiosResponse<{
          recipients: Array<InvoiceRecipient & { phone?: string | null; address?: string | null }>;
        }>;
        const fetched = Array.isArray(data?.recipients) ? data.recipients : [];
        const normalized = fetched.map(recipient => {
          const rawPhone = (recipient.phone ?? '').trim();
          const rawAddress = (recipient.address ?? '').trim();
          const cleanedPhone = rawPhone === 'Mangler telefon' ? '' : rawPhone;
          const cleanedAddress = rawAddress === 'Adresse ikke registrert' ? '' : rawAddress;
          return {
            ...recipient,
            phone: cleanedPhone,
            address: cleanedAddress
          };
        });
        setRecipients(sortRecipients(normalized));
      } catch (error: any) {
        const status = error?.response?.status;
        if (status !== 403 && status !== 404) {
          console.error('Kunne ikke hente mottakere', error);
          showError('Kunne ikke hente mottakere', error?.response?.data?.error);
        }
        setRecipients([]);
      } finally {
        if (withSpinner) {
          setRecipientsLoading(false);
        }
      }
    },
    [showError, sortRecipients]
  );

  const fetchInvoices = useCallback(async (withSpinner = true): Promise<Invoice[]> => {
    if (withSpinner) {
      setLoading(true);
    }

    try {
      const { data } = (await apiGet('/api/payments/invoices')) as AxiosResponse<{
        invoices: Invoice[];
      }>;
      const fetched = data?.invoices || [];
      setInvoices(fetched);
      return fetched;
    } catch (err: any) {
      console.error('Kunne ikke hente fakturaer', err);
      showError('Kunne ikke hente fakturaer', err.response?.data?.error);
      return [];
    } finally {
      if (withSpinner) {
        setLoading(false);
      }
    }
  }, [showError]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoiceId');
    const cancelled = params.get('cancelled');

    if (cancelled === 'true' && invoiceId && !hasHandledCheckoutRef.current) {
      showWarning('Betaling avbrutt', 'Du kan prøve igjen når som helst.');
      hasHandledCheckoutRef.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
  }, [showWarning]);

  useEffect(() => {
    const storedConfirmation = sessionStorage.getItem('kartarkiv:lastPaidInvoice');
    if (!storedConfirmation) {
      return;
    }

    try {
      const parsed: Invoice = JSON.parse(storedConfirmation);
      setPaymentConfirmation(parsed);
    } catch (error) {
      console.warn('⚠️ Klarte ikke å lese bekreftet betaling fra sessionStorage', error);
    } finally {
      sessionStorage.removeItem('kartarkiv:lastPaidInvoice');
    }
  }, []);

  useEffect(() => {
    if (!paymentConfirmation) {
      return;
    }

    const match = invoices.find(item => item.id === paymentConfirmation.id);
    if (match && match.updated_at !== paymentConfirmation.updated_at) {
      setPaymentConfirmation(match);
    }
  }, [invoices, paymentConfirmation]);

  const handleItemChange = (index: number, field: keyof InvoiceItemDraft, value: string | number) => {
    setForm(prev => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        [field]: field === 'quantity' ? Number(value) : value
      } as InvoiceItemDraft;
      return { ...prev, items: updated };
    });
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          amount: '',
          quantity: 1
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setForm({
      month: '',
      dueDate: '',
      notes: '',
      items: [
        {
          description: '',
          amount: '',
          quantity: 1
        }
      ]
    });
  };

  const handleCreateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const items = form.items
      .map(item => ({
        description: item.description.trim(),
        amount: parseFloat(item.amount.replace(',', '.')),
        quantity: item.quantity
      }))
      .filter(item => item.description && item.amount > 0 && item.quantity > 0);

    if (!form.month || items.length === 0) {
      showError('Ufullstendig faktura', 'Angi måned og minst én gyldig kostnadslinje.');
      setSaving(false);
      return;
    }

    try {
      await apiPost('/api/payments/invoices', {
        month: form.month,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        items
      });
      showSuccess('Faktura opprettet', `Fakturaen for ${form.month} er klar.`);
      resetForm();
      await fetchInvoices();
    } catch (err: any) {
      console.error('Kunne ikke opprette faktura', err);
      showError('Kunne ikke opprette faktura', err.response?.data?.error);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (invoice: Invoice) => {
    try {
      showInfo('Åpner Stripe', 'Du sendes til Stripe for å fullføre betalingen.');
      const { data } = (await apiPost(
        `/api/payments/invoices/${invoice.id}/checkout`
      )) as AxiosResponse<{ url: string }>;
      if (data.url) {
        window.location.href = data.url;
      } else {
        showError('Kunne ikke starte Stripe-betaling', 'Mottok ikke en gyldig Stripe-lenke.');
      }
    } catch (err: any) {
      console.error('Kunne ikke starte stripe-betaling', err);
      showError('Kunne ikke starte betaling', err.response?.data?.error);
    }
  };

  const openInvoiceModal = (invoice: Invoice) => {
    const suggestedEmail = (invoice.invoice_request_email || invoice.invoice_requested_by || '').trim();
    const matchedRecipient = suggestedEmail
      ? recipients.find(recipient => recipient.email.toLowerCase() === suggestedEmail.toLowerCase()) || null
      : null;

    setInvoiceModalEmail(matchedRecipient?.email || suggestedEmail || '');
    setInvoiceModalName(matchedRecipient?.name || invoice.invoice_request_name || '');
    setInvoiceModalPhone(
      matchedRecipient ? sanitizePresetValue(matchedRecipient.phone) : sanitizePresetValue(invoice.invoice_request_phone)
    );
    setInvoiceModalAddress(
      matchedRecipient
        ? sanitizePresetValue(matchedRecipient.address)
        : sanitizePresetValue(invoice.invoice_request_address)
    );
    setInvoiceModalSelectedRecipient(matchedRecipient ? String(matchedRecipient.id) : 'custom');
    setInvoiceModalTarget(invoice);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    if (invoiceModalLoading) {
      return;
    }
    setIsInvoiceModalOpen(false);
    setInvoiceModalTarget(null);
    setInvoiceModalEmail('');
    setInvoiceModalName('');
    setInvoiceModalPhone('');
    setInvoiceModalAddress('');
    setInvoiceModalSelectedRecipient('custom');
  };

  const handleRecipientSelectionChange = (value: string) => {
    setInvoiceModalSelectedRecipient(value);

    if (value === 'custom') {
      return;
    }

    const selected = recipients.find(recipient => String(recipient.id) === value);
    if (selected) {
      setInvoiceModalName(selected.name);
      setInvoiceModalEmail(selected.email);
      setInvoiceModalPhone(sanitizePresetValue(selected.phone));
      setInvoiceModalAddress(sanitizePresetValue(selected.address));
    }
  };

  const handleSaveRecipientPreset = async () => {
    const name = invoiceModalName.trim();
    const email = invoiceModalEmail.trim();
    const phone = invoiceModalPhone.trim();
    const address = invoiceModalAddress.trim();

    if (!name) {
      showError('Navn mangler', 'Oppgi navnet eller bedriften du vil lagre.');
      return;
    }

    if (!email) {
      showError('E-postadresse mangler', 'Oppgi en e-postadresse for mottakeren.');
      return;
    }

    if (!phone) {
      showError('Telefonnummer mangler', 'Telefonnummer må fylles ut for å lagre mottakeren.');
      return;
    }

    if (!address) {
      showError('Adresse mangler', 'Adresse må fylles ut for å lagre mottakeren.');
      return;
    }

    setRecipientSaving(true);

    try {
      const { data } = (await apiPost('/api/payments/recipients', {
        name,
        email,
        phone,
        address
      })) as AxiosResponse<{ recipient: InvoiceRecipient }>;

      if (data?.recipient) {
        const sanitizedRecipient: InvoiceRecipient = {
          ...data.recipient,
          phone: sanitizePresetValue(data.recipient.phone),
          address: sanitizePresetValue(data.recipient.address)
        };
        setRecipients(prev => {
          const filtered = prev.filter(item => item.id !== sanitizedRecipient.id);
          return sortRecipients([...filtered, sanitizedRecipient]);
        });

        setInvoiceModalSelectedRecipient(String(sanitizedRecipient.id));
        setInvoiceModalName(sanitizedRecipient.name);
        setInvoiceModalEmail(sanitizedRecipient.email);
        setInvoiceModalPhone(sanitizedRecipient.phone);
        setInvoiceModalAddress(sanitizedRecipient.address);
        showSuccess('Mottaker lagret', 'Mottakeren er klar til gjenbruk.');
      }
    } catch (error: any) {
      console.error('Kunne ikke lagre mottaker', error);
      showError('Kunne ikke lagre mottaker', error?.response?.data?.error);
    } finally {
      setRecipientSaving(false);
    }
  };

  const handleInvoiceRequestSubmit = async () => {
    if (!invoiceModalTarget) {
      return;
    }

    const name = invoiceModalName.trim();
    const email = invoiceModalEmail.trim();
    const phone = invoiceModalPhone.trim();
    const address = invoiceModalAddress.trim();

    if (!name) {
      showError('Navn mangler', 'Angi navnet eller bedriften som skal stå på fakturaen.');
      return;
    }

    if (!email) {
      showError('E-postadresse mangler', 'Angi e-postadressen fakturaen skal sendes til.');
      return;
    }

    if (!phone) {
      showError('Telefonnummer mangler', 'Telefonnummer må fylles ut før fakturaen kan sendes.');
      return;
    }

    if (!address) {
      showError('Adresse mangler', 'Legg inn fakturaadresse før du sender.');
      return;
    }

    setInvoiceModalLoading(true);
    try {
      const { data } = (await apiPost(`/api/payments/invoices/${invoiceModalTarget.id}/request-invoice`, {
        contactEmail: email,
        contactName: name,
        contactPhone: phone,
        contactAddress: address
      })) as AxiosResponse<{ invoice: Invoice }>;
      showSuccess('Faktura sendt', 'Stripe har sendt fakturaen til valgt e-post.');
      setInvoices(prev => prev.map(item => (item.id === invoiceModalTarget.id ? data.invoice : item)));
      setIsInvoiceModalOpen(false);
      setInvoiceModalTarget(null);
      setInvoiceModalEmail('');
      setInvoiceModalName('');
      setInvoiceModalPhone('');
      setInvoiceModalAddress('');
      setInvoiceModalSelectedRecipient('custom');
    } catch (err: any) {
      console.error('Kunne ikke forespørre faktura', err);
      showError('Kunne ikke sende faktura', err.response?.data?.error);
    } finally {
      setInvoiceModalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-slate-600" />
          Betalingsoversikt
        </h2>
        <p className="text-gray-600">Hold oversikt over kostnader og sørg for enkel betaling via Stripe eller faktura.</p>
      </div>

      {paymentConfirmation && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900">Betaling fullført</h3>
              <p className="text-sm text-green-800 mt-1">
                Fakturaen for {paymentConfirmation.month} er registrert som betalt. Takk!
              </p>
            </div>
            <button
              onClick={() => setPaymentConfirmation(null)}
              className="text-green-700 hover:text-green-900"
              aria-label="Lukk bekreftelse"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-green-900">
            <div>
              <span className="font-medium">Totalt:</span> {formatCurrency(paymentConfirmation.total_amount)}
            </div>
            <div>
              <span className="font-medium">Betalt:</span> {formatDate(paymentConfirmation.updated_at)}
            </div>
            {paymentConfirmation.stripe_invoice_url && (
              <div className="md:col-span-2">
                <a
                  href={paymentConfirmation.stripe_invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Åpne kvittering i Stripe →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-slate-600" />
              Opprett månedlig faktura
            </h3>
          </div>

          <form className="space-y-6" onSubmit={handleCreateInvoice}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Måned</span>
                <input
                  type="month"
                  value={form.month}
                  onChange={event => setForm(prev => ({ ...prev, month: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Forfallsdato</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={event => setForm(prev => ({ ...prev, dueDate: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Notat (valgfritt)</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                  placeholder="F.eks. Lisens og drift"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900 flex items-center">
                  <PlusCircle className="h-5 w-5 mr-2 text-slate-600" />
                  Kostnadslinjer
                </h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-slate-600 hover:text-slate-700 font-medium"
                >
                  Legg til linje
                </button>
              </div>

              <div className="space-y-4">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700">Beskrivelse</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={event => handleItemChange(index, 'description', event.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                        placeholder="Hva skal klubben betale for?"
                        required
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Beløp (NOK)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={event => handleItemChange(index, 'amount', event.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Antall</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={event => handleItemChange(index, 'quantity', Number(event.target.value))}
                        className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                    {form.items.length > 1 && (
                      <div className="md:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Fjern
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-gray-600 space-y-1">
                <div>Sum uten gebyr: {formatCurrency(formBaseTotal)}</div>
                <div>Stripe-gebyr (2,4% + 2,00 kr): {formatCurrency(formStripeFee)}</div>
                <div className="font-semibold text-gray-900">
                  Totalt (inkl. gebyr): {formatCurrency(formTotal)}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lagrer...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Opprett faktura
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-slate-600" />
            Fakturaer og betalinger
          </h3>
          <span className="text-sm text-gray-500">{invoices.length} faktura(er)</span>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Laster fakturaer...
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            Ingen fakturaer registrert ennå.
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => {
              const status = statusConfig[invoice.status];

              return (
                <div key={invoice.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {invoice.month}
                        </h4>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <div>Forfallsdato: {formatDate(invoice.due_date)}</div>
                        <div>Opprettet: {formatDate(invoice.created_at)}</div>
                        {invoice.notes && <div>Notat: {invoice.notes}</div>}
                        {invoice.invoice_requested_at && (
                          <div>
                            Faktura sendt {formatDate(invoice.invoice_requested_at)} av {invoice.invoice_requested_by || 'ukjent'}
                            {invoice.invoice_request_email && ` (til ${invoice.invoice_request_email})`}
                          </div>
                        )}
                        {invoice.invoice_request_address && (
                          <div>Adresse: {invoice.invoice_request_address}</div>
                        )}
                        {invoice.stripe_invoice_url && (
                          <div>
                            <a
                              href={invoice.stripe_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                              Vis Stripe-faktura →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-600">Totalt</div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Detaljer</h5>
                    <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                      {invoice.items.map(item => (
                        <div key={item.id || item.description} className="p-3 flex items-center justify-between text-sm text-gray-700">
                          <div>
                            <div className="font-medium">{item.description}</div>
                            <div className="text-gray-500">Antall: {item.quantity}</div>
                          </div>
                          <div>{formatCurrency(item.amount * item.quantity)}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Totalsummen inkluderer et automatisk Stripe-gebyr (2,4% + 2,00 kr).
                    </p>
                  </div>

                  {invoice.status !== 'paid' && (
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                      <button
                        onClick={() => handleCheckout(invoice)}
                        className="btn-primary flex items-center justify-center"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Betal med kort
                      </button>
                      <button
                        onClick={() => openInvoiceModal(invoice)}
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Betal med faktura
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isInvoiceModalOpen && invoiceModalTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Send faktura med e-post</h3>
                <p className="text-sm text-gray-600">Velg hvilken adresse Stripe skal sende fakturaen til.</p>
              </div>
              <button
                onClick={closeInvoiceModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Lukk"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Lagret mottaker</label>
                <select
                  value={invoiceModalSelectedRecipient}
                  onChange={event => handleRecipientSelectionChange(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                  disabled={recipientsLoading && recipients.length === 0}
                >
                  <option value="custom">
                    {recipients.length > 0 ? 'Egendefiner mottaker' : 'Ingen lagrede mottakere tilgjengelig'}
                  </option>
                  {recipients.map(recipient => (
                    <option key={recipient.id} value={String(recipient.id)}>
                      {recipient.name} – {recipient.email}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Velg en lagret mottaker eller fyll inn detaljene manuelt.
                </p>
                {recipientsLoading && (
                  <p className="text-xs text-gray-400">Laster mottakere…</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Navn eller bedrift</label>
                <input
                  type="text"
                  value={invoiceModalName}
                  onChange={event => setInvoiceModalName(event.target.value)}
                  placeholder="Kartklubben AS"
                  className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-postadresse</label>
                <input
                  type="email"
                  value={invoiceModalEmail}
                  onChange={event => setInvoiceModalEmail(event.target.value)}
                  placeholder="epost@klubben.no"
                  className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700">Telefonnummer</label>
              <input
                type="tel"
                value={invoiceModalPhone}
                onChange={event => setInvoiceModalPhone(event.target.value)}
                placeholder="+47 12 34 56 78"
                className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Telefonnummeret deles kun med Stripe og vises på fakturaen.</p>
              </div>
              <AddressAutocompleteInput
                label="Adresse"
                value={invoiceModalAddress}
                onChange={setInvoiceModalAddress}
                placeholder="Eksempelgata 1, 0123 Oslo"
                required
                helperText="Adressen deles med Stripe slik at fakturaen fylles ut korrekt."
              />
              {isSuperAdmin && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Lagre denne mottakeren for raskt å bruke samme informasjon senere.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveRecipientPreset}
                    disabled={recipientSaving}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    {recipientSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Lagrer...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Lagre mottaker
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                <div>
                  <span className="font-medium text-gray-800">Faktura:</span> {invoiceModalTarget.month}
                </div>
                <div>
                  <span className="font-medium text-gray-800">Totalbeløp:</span> {formatCurrency(invoiceModalTarget.total_amount)}
                </div>
                {invoiceModalTarget.due_date && (
                  <div>
                    <span className="font-medium text-gray-800">Forfallsdato:</span> {formatDate(invoiceModalTarget.due_date)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeInvoiceModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleInvoiceRequestSubmit}
                disabled={invoiceModalLoading}
                className="btn-primary flex items-center"
              >
                {invoiceModalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sender...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send faktura
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
