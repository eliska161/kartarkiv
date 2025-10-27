import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CreditCard, FileText, Loader2, PlusCircle, Send, Wallet } from 'lucide-react';

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
  items: InvoiceItem[];
}

const statusConfig: Record<Invoice['status'], { label: string; className: string }> = {
  pending: {
    label: 'Avventer betaling',
    className: 'bg-yellow-100 text-yellow-800'
  },
  invoice_requested: {
    label: 'Faktura forespurt',
    className: 'bg-blue-100 text-blue-800'
  },
  paid: {
    label: 'Betalt',
    className: 'bg-green-100 text-green-800'
  }
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasHandledCheckoutRef = useRef(false);

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

  const formTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const amount = parseFloat(item.amount.replace(',', '.')) || 0;
      return sum + amount * (item.quantity || 1);
    }, 0);
  }, [form.items]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ invoices: Invoice[] }>('/api/payments/invoices');
      setInvoices(data.invoices || []);
    } catch (err: any) {
      console.error('Kunne ikke hente fakturaer', err);
      setError(err.response?.data?.error || 'Kunne ikke hente fakturaer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const sessionId = params.get('session_id');
    const invoiceId = params.get('invoiceId');
    const cancelled = params.get('cancelled');

    if (cancelled === 'true' && invoiceId && !hasHandledCheckoutRef.current) {
      setMessage('Betalingen ble avbrutt. Du kan prøve igjen når som helst.');
      hasHandledCheckoutRef.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (success === 'true' && sessionId && invoiceId && !hasHandledCheckoutRef.current) {
      const confirmPayment = async () => {
        try {
          setMessage('Bekrefter betaling...');
          await axios.post('/api/payments/checkout/confirm', {
            sessionId,
            invoiceId: Number(invoiceId)
          });
          setMessage('Betaling registrert! Takk for at du betalte via Stripe.');
          await fetchInvoices();
        } catch (err: any) {
          console.error('Kunne ikke bekrefte betaling', err);
          setError(err.response?.data?.error || 'Kunne ikke bekrefte betaling');
        } finally {
          hasHandledCheckoutRef.current = true;
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      confirmPayment();
    }
  }, []);

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
    setError(null);
    setMessage(null);

    const items = form.items
      .map(item => ({
        description: item.description.trim(),
        amount: parseFloat(item.amount.replace(',', '.')),
        quantity: item.quantity
      }))
      .filter(item => item.description && item.amount > 0 && item.quantity > 0);

    if (!form.month || items.length === 0) {
      setError('Angi måned og minst én gyldig kostnadslinje.');
      setSaving(false);
      return;
    }

    try {
      await axios.post('/api/payments/invoices', {
        month: form.month,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        items
      });
      setMessage('Faktura opprettet!');
      resetForm();
      await fetchInvoices();
    } catch (err: any) {
      console.error('Kunne ikke opprette faktura', err);
      setError(err.response?.data?.error || 'Kunne ikke opprette faktura');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (invoice: Invoice) => {
    try {
      setMessage('Laster Stripe-betaling...');
      const { data } = await axios.post<{ url: string }>('/api/payments/invoices/' + invoice.id + '/checkout');
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Kunne ikke starte Stripe-betaling.');
      }
    } catch (err: any) {
      console.error('Kunne ikke starte stripe-betaling', err);
      setError(err.response?.data?.error || 'Kunne ikke starte betaling');
    }
  };

  const handleInvoiceRequest = async (invoice: Invoice) => {
    const suggestedEmail = invoice.invoice_request_email || invoice.invoice_requested_by || '';
    const contactEmail = window.prompt('Oppgi e-postadressen fakturaen skal sendes til:', suggestedEmail) || undefined;

    try {
      const { data } = await axios.post<{ invoice: Invoice }>(`/api/payments/invoices/${invoice.id}/request-invoice`, {
        contactEmail
      });
      setMessage('Fakturabestilling registrert.');
      setInvoices(prev => prev.map(item => (item.id === invoice.id ? data.invoice : item)));
    } catch (err: any) {
      console.error('Kunne ikke forespørre faktura', err);
      setError(err.response?.data?.error || 'Kunne ikke forespørre faktura');
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-eok-600" />
          Betalingsoversikt
        </h2>
        <p className="text-gray-600">Hold oversikt over kostnader og sørg for enkel betaling via Stripe eller faktura.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {message}
        </div>
      )}

      {isSuperAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-eok-600" />
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-eok-500 focus:ring-eok-500"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Forfallsdato</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={event => setForm(prev => ({ ...prev, dueDate: event.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-eok-500 focus:ring-eok-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Notat (valgfritt)</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-eok-500 focus:ring-eok-500"
                  placeholder="F.eks. Lisens og drift"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900 flex items-center">
                  <PlusCircle className="h-5 w-5 mr-2 text-eok-600" />
                  Kostnadslinjer
                </h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-eok-600 hover:text-eok-700 font-medium"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-eok-500 focus:ring-eok-500"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-eok-500 focus:ring-eok-500"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-eok-500 focus:ring-eok-500"
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

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Totalbeløp: <span className="font-semibold text-gray-900">{formatCurrency(formTotal)}</span>
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
            <CreditCard className="h-5 w-5 mr-2 text-eok-600" />
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
                            Faktura forespurt {formatDate(invoice.invoice_requested_at)} av {invoice.invoice_requested_by || 'ukjent'}
                            {invoice.invoice_request_email && ` (sendes til ${invoice.invoice_request_email})`}
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
                        onClick={() => handleInvoiceRequest(invoice)}
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
    </div>
  );
};

export default PaymentManagement;
