import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { apiPost } from '../utils/apiClient';
import { useToast } from '../contexts/ToastContext';

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
  updated_at: string;
  stripe_invoice_url?: string | null;
  stripe_invoice_pdf?: string | null;
  items: InvoiceItem[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(amount);

const PaymentCompletePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sessionId = searchParams.get('session_id');
  const invoiceId = searchParams.get('invoiceId');

  useEffect(() => {
    const confirmPayment = async () => {
      if (!sessionId || !invoiceId) {
        setStatus('error');
        setErrorMessage('Manglet nødvendig informasjon fra Stripe.');
        return;
      }

      try {
        const { data } = await apiPost('/api/payments/checkout/confirm', {
          sessionId,
          invoiceId: Number(invoiceId)
        });

        if (data?.invoice) {
          setInvoice(data.invoice);
          sessionStorage.setItem('kartarkiv:lastPaidInvoice', JSON.stringify(data.invoice));
          showSuccess('Betaling fullført', 'Betalingen ble registrert som betalt.');
          setStatus('success');
        } else {
          throw new Error('Svar manglet faktura.');
        }
      } catch (error: any) {
        console.error('Kunne ikke bekrefte betaling', error);
        const responseMessage = error?.response?.data?.error || 'Kunne ikke bekrefte betalingen.';
        setErrorMessage(responseMessage);
        showError('Kunne ikke bekrefte betaling', responseMessage);
        setStatus('error');
      }
    };

    confirmPayment();
  }, [invoiceId, sessionId, showError, showSuccess]);

  const handleBackToPayments = () => {
    navigate('/admin', {
      replace: true,
      state: { focusTab: 'payments', invoiceId: invoice?.id || null }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full">
        <div className="bg-white shadow rounded-2xl p-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-12 w-12 text-eok-600 animate-spin" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Bekrefter Stripe-betaling</h1>
                <p className="text-gray-600 mt-2">
                  Vennligst vent mens vi bekrefter betalingen og oppdaterer fakturaen.
                </p>
              </div>
            </div>
          )}

          {status === 'success' && invoice && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-gray-900">Betaling fullført</h1>
                <p className="text-gray-600">
                  Takk! Betalingen for fakturaen {invoice.month} er registrert som betalt.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-left">
                <dl className="space-y-4 text-gray-700">
                  <div className="flex items-center justify-between">
                    <dt className="font-medium">Totalt beløp</dt>
                    <dd>{formatCurrency(invoice.total_amount)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium">Status</dt>
                    <dd className="text-green-600 font-semibold">Betalt</dd>
                  </div>
                  {invoice.stripe_invoice_url && (
                    <div className="flex items-center justify-between">
                      <dt className="font-medium">Stripe-kvittering</dt>
                      <dd>
                        <a
                          href={invoice.stripe_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-eok-700 hover:text-eok-800"
                        >
                          Åpne kvittering
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleBackToPayments}
                  className="btn-primary inline-flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tilbake til betalinger
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-red-100 rounded-full p-4">
                  <AlertTriangle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-gray-900">Kunne ikke bekrefte betaling</h1>
                <p className="text-gray-600">{errorMessage || 'Prøv å oppdatere siden eller kontakt en administrator.'}</p>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleBackToPayments}
                  className="btn-secondary inline-flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tilbake til betalinger
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCompletePage;
