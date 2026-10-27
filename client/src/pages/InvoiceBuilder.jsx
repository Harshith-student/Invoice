import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Calendar,
  Building,
  Percent,
  FileText,
  IndianRupee,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  formatPaise,
  paiseToRupees,
  rupeesToPaise,
  formatDateInput,
} from '../utils/formatters';

const GST_RATES = [0, 5, 12, 18, 28];

export const InvoiceBuilder = () => {
  const { id } = useParams(); // If present, edit mode
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState([
    { description: 'Web Development / Consulting', qty: 1, rate: 25000, gstPercent: 18 },
  ]);
  const [discountRupees, setDiscountRupees] = useState(0);
  const [notes, setNotes] = useState(
    user?.business?.upiId
      ? `Payment via UPI: ${user.business.upiId}\nThank you for your business!`
      : 'Thank you for your business!'
  );

  // Fetch clients and existing invoice if editing
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [clientsRes, invoiceRes] = await Promise.all([
          api.get('/clients'),
          isEditMode ? api.get(`/invoices/${id}`) : Promise.resolve(null),
        ]);

        if (clientsRes.data?.success) {
          setClients(clientsRes.data.clients || []);
          if (!isEditMode && clientsRes.data.clients.length > 0) {
            setClientId(clientsRes.data.clients[0]._id);
          }
        }

        if (isEditMode && invoiceRes?.data?.success) {
          const inv = invoiceRes.data.invoice;
          setClientId(inv.clientId?._id || inv.clientId);
          setIssueDate(formatDateInput(inv.issueDate));
          setDueDate(formatDateInput(inv.dueDate));
          setDiscountRupees(paiseToRupees(inv.discount));
          setNotes(inv.notes || '');
          if (inv.items && inv.items.length > 0) {
            setItems(
              inv.items.map((it) => ({
                description: it.description,
                qty: it.qty,
                rate: paiseToRupees(it.rate),
                gstPercent: it.gstPercent,
              }))
            );
          }
        }
      } catch (err) {
        setError('Failed to initialize invoice form.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, isEditMode]);

  // Live client-side calculation preview
  const calculateLiveTotals = () => {
    let subtotalRupees = 0;
    let taxTotalRupees = 0;

    const computedItems = items.map((it) => {
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      const amount = qty * rate;
      const gst = (amount * (Number(it.gstPercent) || 0)) / 100;
      subtotalRupees += amount;
      taxTotalRupees += gst;
      return { ...it, amount, gst };
    });

    const discount = Number(discountRupees) || 0;
    const totalRupees = Math.max(0, subtotalRupees - discount + taxTotalRupees);

    return {
      computedItems,
      subtotalRupees,
      discountRupees: discount,
      taxTotalRupees,
      totalRupees,
    };
  };

  const totals = calculateLiveTotals();

  // Line item manipulation
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', qty: 1, rate: 0, gstPercent: 18 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError('Please select or add a client.');
      return;
    }

    if (items.some((it) => !it.description.trim() || Number(it.qty) <= 0)) {
      setError('Each line item must have a valid description and positive quantity.');
      return;
    }

    // Convert rates to paise integers for server validation
    const payload = {
      clientId,
      issueDate,
      dueDate,
      items: items.map((it) => ({
        description: it.description.trim(),
        qty: Number(it.qty),
        rate: rupeesToPaise(it.rate), // Integer paise
        gstPercent: Number(it.gstPercent),
      })),
      discount: rupeesToPaise(discountRupees), // Integer paise
      notes,
    };

    try {
      setSubmitting(true);
      if (isEditMode) {
        const res = await api.put(`/invoices/${id}`, payload);
        if (res.data?.success) {
          navigate(`/invoices/${id}`);
        }
      } else {
        const res = await api.post('/invoices', payload);
        if (res.data?.success) {
          navigate(`/invoices/${res.data.invoice._id}`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">Loading invoice editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and page title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEditMode ? 'Edit Draft Invoice' : 'Create New Invoice'}
            </h1>
            <p className="text-xs text-slate-500">
              GST amounts and total will be securely verified on the server.
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isEditMode ? 'Update Invoice' : 'Save as Draft'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Invoice Builder Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-8">
        {/* Row 1: Client selection & dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Client Dropdown */}
          <div className="sm:col-span-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Client *
              </label>
              <Link
                to="/clients"
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                + Add Client
              </Link>
            </div>
            {clients.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                No clients yet.{' '}
                <Link to="/clients" className="font-bold underline">
                  Create a client
                </Link>{' '}
                first.
              </div>
            ) : (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.gstin ? `(GST: ${c.gstin})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Issue Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Issue Date *
            </label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Row 2: Line items table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Items & Services
            </h3>
            <span className="text-[11px] text-slate-400">
              Rates entered in Indian Rupees (₹)
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const lineTotal = (Number(item.qty) || 0) * (Number(item.rate) || 0);
              const lineGst = (lineTotal * (Number(item.gstPercent) || 0)) / 100;
              return (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  {/* Description */}
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      required
                      placeholder="Item / service description..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        required
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Rate in ₹ */}
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* GST % */}
                  <div className="sm:col-span-2">
                    <select
                      value={item.gstPercent}
                      onChange={(e) => handleItemChange(index, 'gstPercent', Number(e.target.value))}
                      className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {GST_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          GST {rate}%
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove Button */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors"
                      title="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Line Item</span>
          </button>
        </div>

        {/* Row 3: Notes & Live Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 pt-4 border-t border-slate-100">
          {/* Notes & Bank Details */}
          <div className="sm:col-span-7 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Notes / Payment Details
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add bank account details, UPI ID, or delivery terms..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <p className="text-[11px] text-slate-400">
              These notes will appear at the bottom of the client invoice and PDF.
            </p>
          </div>

          {/* Totals Summary */}
          <div className="sm:col-span-5 bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Payment Summary
            </h4>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                ₹{totals.subtotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Discount:</span>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountRupees}
                  onChange={(e) => setDiscountRupees(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <span>GST Total:</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                  Auto
                </span>
              </span>
              <span className="font-semibold text-slate-900">
                ₹{totals.taxTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-extrabold text-slate-900">Total Due:</span>
              <span className="text-xl font-black text-indigo-600 tracking-tight">
                ₹{totals.totalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 text-right">
              All final totals validated on server (Paise-level precision)
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceBuilder;
