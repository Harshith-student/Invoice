import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  IndianRupee,
  CheckCircle2,
  Calendar,
  Building,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Loader2,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import api from '../api/axios';
import { formatPaise, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

// Dynamically load Razorpay checkout script
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const PublicInvoice = () => {
  const { publicId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const fetchPublicInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/invoices/${publicId}`);
      if (res.data?.success) {
        setInvoice(res.data.invoice);
        if (res.data.invoice.status === 'paid') setPaymentSuccess(true);
      } else {
        setError('Invoice not found or link expired.');
      }
    } catch {
      setError('Could not load invoice.');
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    fetchPublicInvoice();
  }, [fetchPublicInvoice]);

  // ── Main Pay via Razorpay embedded modal ─────────────────────────────────
  const handleRazorpayCheckout = async () => {
    setPaymentError(null);
    setPaying(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentError('Razorpay SDK could not be loaded. Please check your connection.');
        return;
      }

      // Create order on backend
      const res = await api.post(`/public/invoices/${publicId}/create-order`);

      if (res.data?.alreadyPaid) {
        setPaymentSuccess(true);
        await fetchPublicInvoice();
        return;
      }

      const { orderId, amount, currency, keyId, prefill, demo } = res.data;

      // In demo mode (no real Razorpay keys), skip checkout and simulate
      if (demo) {
        await handleSimulatePayment();
        return;
      }

      // Open Razorpay modal
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'ChasePay',
        description: `Invoice ${invoice?.invoiceNumber || ''} Payment`,
        image: '', // logo optional
        order_id: orderId,
        prefill: {
          name: prefill?.name || '',
          email: prefill?.email || '',
          contact: prefill?.contact || '',
        },
        notes: {
          publicId,
          invoiceNumber: invoice?.invoiceNumber,
        },
        theme: {
          color: '#4f46e5', // indigo-600
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
        handler: async (response) => {
          // Payment completed — verify on server
          try {
            const verifyRes = await api.post(`/public/invoices/${publicId}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              setPaymentSuccess(true);
              await fetchPublicInvoice();
            } else {
              setPaymentError('Payment received but verification failed. Please contact support.');
            }
          } catch (verifyErr) {
            setPaymentError('Payment received but could not be confirmed. Contact support with your Payment ID: ' + response.razorpay_payment_id);
          } finally {
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setPaymentError(`Payment failed: ${response.error?.description || 'Unknown error'}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Checkout error:', err);
      setPaymentError('Could not initiate payment. Please try again.');
      setPaying(false);
    }
  };

  // ── Simulate / demo payment ───────────────────────────────────────────────
  const handleSimulatePayment = async () => {
    setPaying(true);
    setPaymentError(null);
    try {
      const res = await api.post(`/public/invoices/${publicId}/simulate-pay`);
      if (res.data?.success) {
        setInvoice(res.data.invoice);
        setPaymentSuccess(true);
      }
    } catch (err) {
      setPaymentError('Simulation failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-3">
        <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading invoice...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
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
  const isPaid = invoice.status === 'paid' || paymentSuccess;

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

          {/* Amount box */}
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

            <div className="text-xs text-slate-600 sm:text-right">
              <div>Subtotal: <span className="font-semibold">{formatPaise(invoice.subtotal)}</span></div>
              <div>GST: <span className="font-semibold">{formatPaise(invoice.taxTotal)}</span></div>
              <div className="text-[11px] text-slate-400 mt-1">{invoice.items?.length || 1} line item(s) included</div>
            </div>
          </div>

          {/* ── Payment Actions / Success ─────────────────────────────── */}
          {!isPaid ? (
            <div className="p-8 rounded-2xl bg-white border-2 border-indigo-100 shadow-sm space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Ready to settle this invoice?</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Pay securely via UPI (Google Pay, PhonePe, Paytm), Net Banking, or Cards — powered by Razorpay.
                </p>
              </div>

              {/* Razorpay pay button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  id="btn-pay-razorpay"
                  type="button"
                  onClick={handleRazorpayCheckout}
                  disabled={paying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay {formatPaise(invoice.total)} with Razorpay</span>
                    </>
                  )}
                </button>

                {/* Demo simulate button */}
                <button
                  id="btn-simulate-pay"
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={paying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                  title="Demo: instantly mark paid without card/UPI entry"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Simulate Instant Payment (Demo)</span>
                </button>
              </div>

              {/* Accepted payment methods */}
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {['UPI', 'Google Pay', 'PhonePe', 'Paytm', 'Net Banking', 'Visa/MC'].map((m) => (
                  <span key={m} className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500">
                    {m}
                  </span>
                ))}
              </div>

              {/* Payment error */}
              {paymentError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Powered by Razorpay badge */}
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-medium">
                  🔒 Secured & powered by Razorpay · PCI-DSS Level 1 Certified
                </span>
              </div>
            </div>
          ) : (
            /* ── Paid success card ────────────────────────────────────── */
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">Invoice Paid &amp; Settled</h3>
              <p className="text-sm text-emerald-700 max-w-sm mx-auto">
                Payment of <span className="font-bold">{formatPaise(invoice.total)}</span> was successfully received and acknowledged on{' '}
                {formatDate(invoice.paidAt || invoice.updatedAt)}.
              </p>
              {invoice.razorpayPaymentId && (
                <div className="pt-2 text-[11px] text-emerald-600 font-mono bg-emerald-100/50 rounded-lg px-4 py-2 border border-emerald-200 inline-block">
                  Payment ID: {invoice.razorpayPaymentId}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 pb-4">
          ChasePay · GST Invoicing & Smart Reminders for Indian Freelancers
        </p>
      </div>
    </div>
  );
};

export default PublicInvoice;
