import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  ShieldCheck,
  CreditCard,
  MapPin,
  Save,
  Check,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Settings = () => {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    business: {
      name: '',
      address: '',
      gstin: '',
      upiId: '',
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        business: {
          name: user.business?.name || '',
          address: user.business?.address || '',
          gstin: user.business?.gstin || '',
          upiId: user.business?.upiId || '',
        },
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateProfile(formData);
    setSubmitting(false);

    if (res?.success) {
      setSuccessMsg('Business profile saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res?.message || 'Failed to save settings.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings & Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your freelance business details, GSTIN, and UPI ID for invoices and payment links.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Section 1: Freelancer Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Account Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Managed via session</span>
            </div>
          </div>
        </div>

        {/* Section 2: Business & GST Details */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Business & Tax Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business / Trade Name
              </label>
              <input
                type="text"
                placeholder="e.g. Arjun Dev Design Studio"
                value={formData.business.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    business: { ...formData.business, name: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Shown prominently at the top of your invoices.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN (Indian GST Number)
              </label>
              <input
                type="text"
                placeholder="27AAPFU0939F1ZV"
                value={formData.business.gstin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    business: { ...formData.business, gstin: e.target.value.toUpperCase() },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Enables input tax credit (ITC) for your clients.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Business Address
            </label>
            <textarea
              rows={2}
              placeholder="Flat 301, Sunshine Heights, Outer Ring Road, Bengaluru, Karnataka 560103"
              value={formData.business.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  business: { ...formData.business, address: e.target.value },
                })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Section 3: Payment Preferences */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Instant Payment Acceptance</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              UPI ID (VPA) for Direct Payments
            </label>
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="yourname@okaxis or yourname@upi"
                value={formData.business.upiId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    business: { ...formData.business, upiId: e.target.value.toLowerCase() },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Clients can scan or click to pay you directly via GPay, PhonePe, Paytm, or BHIM.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
