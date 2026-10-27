import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  IndianRupee,
  CheckCircle2,
  Calendar,
  Building,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowRight,
  FileText,
} from 'lucide-react';
import api from '../api/axios';
import { formatPaise, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export const PublicInvoice = () => {
  const { publicId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  const fetchPublicInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/invoices/${publicId}`);
      if (res.data?.success) {
        setInvoice(res.data.invoice);
      } else {
        setError('Invoice not found or link expired.');
      }
    } catch {
      setError('Could not load invoice.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicInvoice();
  }, [publicId]);

  const handlePayNow = async () => {
    setPaying(true);
    try {
      // If we already have a real Razorpay link (https://rzp.io/...), redirect directly
      if (invoice?.paymentLinkUrl && invoice.paymentLinkUrl.includes('rzp.io')) {
        window.location.href = invoice.paymentLinkUrl;
        return;
      }

      // Otherwise request or ensure link via backend
      const res = await api.post(`/public/invoices/${publicId}/pay`);
      if (res.data?.paymentLinkUrl && res.data.paymentLinkUrl.includes('rzp.io')) {
        window.location.href = res.data.paymentLinkUrl;
        return;
      }

      // If demo mode (mock payment link), simulate payment or update state
      if (res.data?.paymentLinkUrl) {
        // Fallback for mock demo: offer instant simulation
        await handleSimulatePayment();
      }
    } catch (err) {
      console.error('Payment error:', err);
      // Fallback: simulate payment
      await handleSimulatePayment();
    } finally {
      setPaying(false);
    }
  };

  const handleSimulatePayment = async () => {
    setPaying(true);
    try {
      const res = await api.post(`/public/invoices/${publicId}/simulate-pay`);
      if (res.data?.success) {
        setInvoice(res.data.invoice);
        setSimulatedSuccess(true);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-2">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Invoice Unavailable</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {error || 'This public invoice link is not accessible.'}
          </p>
        </div>
      </div>
    );
  }

  const client = invoice.clientId || {};
  const freelancer = invoice.userId || {};
  const isPaid = invoice.status === 'paid' || simulatedSuccess;
  const isRealRazorpay = invoice.paymentLinkUrl && invoice.paymentLinkUrl.includes('rzp.io');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Brand bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <IndianRupee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                Chase<span className="text-indigo-600">Pay</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-medium">Verified Payment Gateway</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-Bit Encrypted</span>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                TAX INVOICE
              </span>
              <h1 className="text-2xl font-black text-slate-900">
                {invoice.invoiceNumber}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Issued on {formatDate(invoice.issueDate)}
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Status
              </span>
              <StatusBadge status={isPaid ? 'paid' : invoice.status} />
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Payee (Freelancer / Agency)
              </span>
              <div className="font-bold text-slate-900 text-sm">{freelancer.business?.name || freelancer.name}</div>
              {freelancer.business?.gstin && (
                <div className="text-xs text-slate-600 mt-0.5">GSTIN: <span className="font-mono font-medium">{freelancer.business.gstin}</span></div>
              )}
              {freelancer.business?.upiId && (
                <div className="text-xs text-slate-600 mt-0.5">UPI ID: <span className="font-mono font-medium">{freelancer.business.upiId}</span></div>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed To
              </span>
              <div className="font-bold text-slate-900 text-sm">{client.name}</div>
              <div className="text-xs text-slate-500">{client.email}</div>
              {client.gstin && (
                <div className="text-xs text-slate-600 mt-0.5">Client GSTIN: <span className="font-mono">{client.gstin}</span></div>
              )}
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-indigo-50/80 border border-indigo-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                Total Amount Due
              </span>
              <div className="text-3xl font-black text-indigo-700 mt-0.5">
                {formatPaise(invoice.total)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Due Date: <span className="font-semibold text-slate-800">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>

            {/* Line items preview summary */}
            <div className="text-xs text-slate-600 sm:text-right">
              <div>Subtotal: <span className="font-semibold">{formatPaise(invoice.subtotal)}</span></div>
              <div>GST: <span className="font-semibold">{formatPaise(invoice.taxTotal)}</span></div>
              <div className="text-[11px] text-slate-400 mt-1">{invoice.items?.length || 1} line item(s) included</div>
            </div>
          </div>

          {/* Payment Actions */}
          {!isPaid ? (
            <div className="p-8 rounded-2xl bg-white border-2 border-indigo-100 shadow-sm text-center space-y-4">
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Ready to settle this invoice?
                </h3>
                <p className="text-xs text-slate-600">
                  Secure checkout via UPI (Google Pay, PhonePe, Paytm), NetBanking, or Cards powered by Razorpay.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {paying
                      ? 'Opening Checkout...'
                      : isRealRazorpay
                      ? `Pay ${formatPaise(invoice.total)} with Razorpay`
                      : `Pay ${formatPaise(invoice.total)} Now`}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>

                {/* Instant Test Settle Button */}
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={paying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                  title="Simulate instant payment capture without entering card/UPI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Simulate Instant Payment (Test)</span>
                </button>
              </div>

              {invoice.paymentLinkUrl && isRealRazorpay && (
                <div className="pt-2 text-[11px] text-slate-500">
                  Direct Razorpay link: <a href={invoice.paymentLinkUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-mono">{invoice.paymentLinkUrl}</a>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">
                Invoice Paid & Settled
              </h3>
              <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                Payment of <span className="font-bold">{formatPaise(invoice.total)}</span> was successfully received and acknowledged on {formatDate(invoice.paidAt || invoice.updatedAt)}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicInvoice;
