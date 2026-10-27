import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowUpRight,
  FileText,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatPaise, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderToast, setReminderToast] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      if (res.data?.success) {
        setStats(res.data.stats || {});
        setRecentInvoices(res.data.recentInvoices || []);
      }
    } catch (err) {
      setError('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRunReminders = async () => {
    try {
      setRunningReminders(true);
      setReminderToast(null);
      const res = await api.post('/reminders/run');
      if (res.data?.success) {
        setReminderToast({ type: 'success', message: res.data.message });
        const statsRes = await api.get('/dashboard/stats');
        if (statsRes.data?.success) {
          setStats(statsRes.data.stats || {});
          setRecentInvoices(statsRes.data.recentInvoices || []);
        }
        setTimeout(() => setReminderToast(null), 6000);
      }
    } catch (err) {
      setReminderToast({ type: 'error', message: err.response?.data?.message || 'Failed to execute reminders.' });
    } finally {
      setRunningReminders(false);
    }
  };

  const hasBusinessDetails = user?.business?.name || user?.business?.gstin;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-9 h-9 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">Loading your freelance overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Greeting & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hi, {user?.name?.split(' ')[0] || 'Freelancer'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's your cash flow and invoice status for this month.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRunReminders}
            disabled={runningReminders}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {runningReminders ? (
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-indigo-700 rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600" />
            )}
            <span>{runningReminders ? 'Running AI Engine...' : 'Run Reminders Now'}</span>
          </button>

          <Link
            to="/invoices/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Reminder notification toast */}
      {reminderToast && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            reminderToast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{reminderToast.message}</span>
        </div>
      )}

      {/* Business Setup Prompt if not configured */}
      {!hasBusinessDetails && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Complete your Business Profile
              </h4>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Add your Business Name, GSTIN, and UPI ID to generate compliant invoices with instant payment links.
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 shadow-sm transition-all"
          >
            <span>Update Profile</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Outstanding */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatPaise(stats.totalOutstanding)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              From sent & viewed invoices waiting for payment
            </p>
          </div>
        </div>

        {/* Card 2: Overdue Amount */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Amount
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
              {formatPaise(stats.overdueAmount)}
            </div>
            <p className="text-xs text-rose-500/80 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Covered by AI auto-reminders</span>
            </p>
          </div>
        </div>

        {/* Card 3: Paid This Month */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paid This Month
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              {formatPaise(stats.paidThisMonth)}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>Realized cash in bank</span>
            </p>
          </div>
        </div>
      </div>

      {/* Recent Invoices Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Invoices</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest billing activity and statuses</p>
          </div>
          <Link
            to="/invoices"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">No invoices yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first GST invoice in less than 60 seconds with automatic tax calculation.
            </p>
            <Link
              to="/invoices/new"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Invoice</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Client</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6 text-right">Amount</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-indigo-600 font-mono">
                      <Link to={`/invoices/${inv._id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6 text-slate-800 font-medium">
                      {inv.clientId?.name || 'Unknown Client'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-semibold text-slate-900">
                      {formatPaise(inv.total)}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={inv.status} size="small" />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/invoices/${inv._id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
