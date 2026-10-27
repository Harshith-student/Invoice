import React from 'react';
import { Check, Sparkles, IndianRupee, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Pricing = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 py-4">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Simple, Honest Freelance Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Spend less time chasing, more time creating
        </h1>
        <p className="text-sm text-slate-500">
          Start for free, upgrade when you want Gemini AI to handle the awkward payment follow-ups for you.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Starter Freelancer</h3>
              <p className="text-xs text-slate-500 mt-1">
                Perfect for part-time freelancers testing the waters.
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">₹0</span>
              <span className="text-xs text-slate-500 font-medium">/ forever</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-6">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Up to <strong>5 invoices</strong> per month</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>GST-compliant PDF generation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Client directory & tax records</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>UPI ID & QR code on invoices</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400">
                <span className="w-4 h-4 rounded-full border border-slate-300 text-center leading-3">×</span>
                <span className="line-through">AI automated reminder emails</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400">
                <span className="w-4 h-4 rounded-full border border-slate-300 text-center leading-3">×</span>
                <span className="line-through">Razorpay automated payment links</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <Link
              to="/dashboard"
              className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Current Active Plan
            </Link>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-gradient-to-b from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-950/20 relative flex flex-col justify-between border border-indigo-700/50">
          <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
            Most Popular
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Pro Autopilot</span>
              </div>
              <h3 className="text-lg font-bold text-white">Full-Time Freelancer</h3>
              <p className="text-xs text-slate-300 mt-1">
                Zero effort collection: AI drafts and chases invoices until settled.
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">₹499</span>
              <span className="text-xs text-slate-300 font-medium">/ month (or ₹4,999/yr)</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-200 border-t border-slate-700/60 pt-6">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>Unlimited</strong> invoices & clients</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>Gemini AI</strong> polite-to-firm reminder tone progression</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>Razorpay</strong> instant payment links & webhook tracking</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Daily 9:00 AM automated cron scheduler</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Custom branding & business logo</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Priority WhatsApp & Email support</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              onClick={() => alert('Razorpay subscription link will be activated in Phase 5!')}
              className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl text-xs font-bold text-indigo-900 bg-white hover:bg-indigo-50 shadow-lg shadow-white/10 transition-all active:scale-[0.98]"
            >
              Upgrade to Pro (Demo)
            </button>
          </div>
        </div>
      </div>

      {/* Feature comparison guarantee */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">100% Tax Compliant for Indian Law</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports CGST, SGST, IGST, reverse charges, and mandatory SAC/HSN codes.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
          Cancel anytime with 1 click
        </div>
      </div>
    </div>
  );
};

export default Pricing;
