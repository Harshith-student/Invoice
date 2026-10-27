import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  IndianRupee,
  CheckCircle2,
  Calendar,
  Building,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import api from '../api/axios';
import { formatPaise, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export const PublicInvoice = () => {
  const { publicId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicInvoice = async () => {
      try {
        setLoading(true);
        // Phase 4 will expose /api/public/invoices/:publicId
        const res = await api.get(`/public/invoices/${publicId}`);
        if (res.data?.success) {
          setInvoice(res.data.invoice);
        } else {
          setError('Invoice not found or link expired.');
        }
      } catch (err) {
        setError('Could not load invoice.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicInvoice();
  }, [publicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-2">Loading invoice...</p>
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
            {error || 'This public invoice link is not yet accessible.'}
          </p>
          <p className="text-[11px] text-slate-400">
            Public invoices and Razorpay checkout links are activated in Phase 4 & 5.
          </p>
        </div>
      </div>
    );
  }

  const client = invoice.clientId || {};
  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-slate-100/70 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Brand bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <IndianRupee className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg">
              Chase<span className="text-indigo-600">Pay</span>
            </span>
          </div>
          <span className="text-xs text-slate-500">Secured Payment Portal</span>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-12 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                INVOICE
              </span>
              <h1 className="text-xl font-black text-slate-900">
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
              <StatusBadge status={invoice.status} />
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed To
              </span>
              <div className="font-bold text-slate-900 text-sm">{client.name}</div>
              <div className="text-xs text-slate-500">{client.email}</div>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Amount Payable
              </span>
              <div className="text-2xl font-black text-indigo-600">
                {formatPaise(invoice.total)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Due by {formatDate(invoice.dueDate)}
              </div>
            </div>
          </div>

          {/* Pay Button */}
          {!isPaid ? (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-center space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Ready to settle this invoice?</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Pay directly via UPI, NetBanking, Debit/Credit Cards, or Razorpay.
              </p>
              <button
                onClick={() => {
                  if (invoice.paymentLinkUrl) {
                    window.location.href = invoice.paymentLinkUrl;
                  } else {
                    alert('Razorpay payment gateway connects in Phase 5!');
                  }
                }}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay {formatPaise(invoice.total)} Now</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>This invoice was settled on {formatDate(invoice.paidAt || invoice.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicInvoice;
