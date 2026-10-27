import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Edit,
  Building2,
  User,
  Calendar,
  AlertCircle,
  ExternalLink,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatPaise, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const [invRes, remRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get(`/reminders/invoices/${id}`).catch(() => ({ data: { reminders: [] } })),
      ]);

      if (invRes.data?.success) {
        setInvoice(invRes.data.invoice);
      }
      if (remRes.data?.success) {
        setReminders(remRes.data.reminders || []);
      }
    } catch (err) {
      setError('Invoice not found or could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleCopyLink = () => {
    if (!invoice?.publicId) return;
    const url = `${window.location.origin}/i/${invoice.publicId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate or download invoice PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!window.confirm(`Email invoice ${invoice.invoiceNumber} to ${invoice.clientId?.email || 'client'}?`)) return;
    try {
      setSendingEmail(true);
      setFeedback(null);
      const res = await api.post(`/invoices/${id}/send`);
      if (res.data?.success) {
        setInvoice(res.data.invoice);
        setFeedback({ type: 'success', message: res.data.message || 'Invoice sent successfully!' });
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to send invoice email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm('Mark this invoice as Paid?')) return;
    try {
      setActionLoading(true);
      // In Phase 2/3 update invoice status
      const res = await api.put(`/invoices/${id}`, {
        status: 'paid',
        paidAt: new Date(),
      });
      if (res.data?.success) {
        setInvoice(res.data.invoice);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error || 'Invoice not found'}</div>
        <Link to="/invoices" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to all invoices
        </Link>
      </div>
    );
  }

  const client = invoice.clientId || {};
  const business = user?.business || {};
  const publicPayUrl = `${window.location.origin}/i/${invoice.publicId}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued {formatDate(invoice.issueDate)} • Due {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {downloadingPdf ? (
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-indigo-700 rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>{downloadingPdf ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {/* Send to Client Email */}
          <button
            onClick={handleSendInvoice}
            disabled={sendingEmail}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {sendingEmail ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{sendingEmail ? 'Sending...' : 'Send Invoice'}</span>
          </button>

          {/* Copy Pay Link */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Copy Pay Link'}</span>
          </button>

          {/* View Public Page */}
          <Link
            to={`/i/${invoice.publicId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Page</span>
          </Link>

          {/* Edit (if draft) */}
          {invoice.status === 'draft' && (
            <Link
              to={`/invoices/${invoice._id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Link>
          )}

          {/* Mark as paid demo fallback */}
          {invoice.status !== 'paid' && (
            <button
              onClick={handleMarkAsPaid}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-200 transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Paid</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Invoice Card (Print / PDF visual style) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-100 p-8 sm:p-12 space-y-8">
        {/* Header: Business & Invoice Info */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pb-8 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1 block">
              TAX INVOICE
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {business.name || user?.name || 'Freelancer'}
            </h2>
            {business.address && (
              <p className="text-xs text-slate-500 mt-1 max-w-xs whitespace-pre-line">
                {business.address}
              </p>
            )}
            {business.gstin && (
              <p className="text-xs font-mono font-medium text-slate-700 mt-1">
                GSTIN: <span className="font-bold text-slate-900">{business.gstin}</span>
              </p>
            )}
            {business.upiId && (
              <p className="text-xs text-slate-600 mt-0.5">
                UPI ID: <span className="font-mono font-medium text-indigo-600">{business.upiId}</span>
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <div className="text-sm font-mono font-bold text-slate-900">
              {invoice.invoiceNumber}
            </div>
            <div className="text-xs text-slate-500">
              Issue Date:{' '}
              <span className="font-semibold text-slate-800">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="text-xs text-slate-500">
              Due Date:{' '}
              <span className="font-semibold text-slate-800">{formatDate(invoice.dueDate)}</span>
            </div>
          </div>
        </div>

        {/* Bill To & Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-6 rounded-2xl border border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Billed To
            </span>
            <h3 className="font-bold text-slate-900 text-sm">{client.name || 'Client Name'}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{client.email}</p>
            {client.phone && <p className="text-xs text-slate-500 mt-0.5">{client.phone}</p>}
            {client.address && (
              <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{client.address}</p>
            )}
            {client.gstin && (
              <p className="text-xs font-mono font-semibold text-emerald-700 mt-1">
                Client GSTIN: {client.gstin}
              </p>
            )}
          </div>

          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Payment Status
              </span>
              <StatusBadge status={invoice.status} />
              {invoice.paidAt && (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Paid on {formatDate(invoice.paidAt)}
                </p>
              )}
            </div>

            <div className="mt-4 sm:mt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Amount Due
              </span>
              <span className="text-2xl font-black text-indigo-600 tracking-tight">
                {formatPaise(invoice.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Rate</th>
                <th className="py-3 px-2 text-right">GST</th>
                <th className="py-3 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {invoice.items?.map((item, idx) => {
                const itemTotal = (item.amount || 0) + (item.gstAmount || 0);
                return (
                  <tr key={idx}>
                    <td className="py-3.5 px-2 font-medium text-slate-800">
                      {item.description}
                    </td>
                    <td className="py-3.5 px-2 text-center text-slate-600">
                      {item.qty}
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono text-slate-600">
                      {formatPaise(item.rate)}
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono text-slate-600">
                      {item.gstPercent}% ({formatPaise(item.gstAmount)})
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono font-bold text-slate-900">
                      {formatPaise(itemTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-slate-100">
          <div className="max-w-xs space-y-2">
            {invoice.notes && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Notes & Terms
                </span>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatPaise(invoice.subtotal)}</span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-semibold">-{formatPaise(invoice.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>GST Total:</span>
              <span className="font-semibold text-slate-800">{formatPaise(invoice.taxTotal)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-black text-slate-900">Grand Total:</span>
              <span className="text-xl font-black text-indigo-600 font-mono">
                {formatPaise(invoice.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Payment Link Card (if generated) */}
      {invoice.paymentLinkUrl && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Razorpay Payment Link Active
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-sm">
                {invoice.paymentLinkUrl}
              </p>
            </div>
          </div>

          <a
            href={invoice.paymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap active:scale-[0.98]"
          >
            <span>Open Checkout</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Reminder History Timeline Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              AI Payment Reminder History
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {reminders.length} reminder{reminders.length === 1 ? '' : 's'} dispatched
          </span>
        </div>

        {reminders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No automatic payment reminders sent for this invoice yet. The AI engine checks daily at 9:00 AM (or on manual trigger) for pre-due, due, and overdue stages.
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((log) => (
              <div
                key={log._id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 font-mono">
                      {log.type}
                    </span>
                    <span className="font-bold text-slate-800">{log.subject}</span>
                  </div>
                  <p className="text-slate-600 whitespace-pre-line text-[11px] leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60 font-sans">
                    {log.body}
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 whitespace-nowrap">
                  {formatDate(log.sentAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetail;
