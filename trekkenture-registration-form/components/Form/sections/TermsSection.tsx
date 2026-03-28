import React from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { TERMS_POINTS, IMPORTANT_NOTES } from '../../../data/constants';

interface TermsSectionProps {
  agreedToTerms: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export const TermsSection: React.FC<TermsSectionProps> = ({ agreedToTerms, onChange, error }) => {
  return (
    <section className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${error ? 'border-rose-500 ring-1 ring-rose-200' : 'border-slate-200'}`}>
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200">1</div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          Terms & Conditions
        </h2>
      </div>
      
      <div className="p-6">
        <div className="space-y-4 text-sm text-slate-600 leading-relaxed mb-6">
          <ul className="list-disc pl-5 space-y-2 marker:text-slate-300">
            {TERMS_POINTS.map((point, idx) => (
              <li key={idx} className="pl-1">{point}</li>
            ))}
          </ul>
          
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mt-4">
            <h3 className="font-bold text-amber-800 mb-2 text-xs uppercase tracking-wider">Other Important Points</h3>
            <ul className="list-disc pl-5 space-y-1 marker:text-amber-300 text-amber-900">
              {IMPORTANT_NOTES.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <label className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer group ${error ? 'border-rose-500 bg-slate-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-50/80 hover:border-slate-200'}`}>
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                id="agreedToTerms"
                name="agreedToTerms"
                checked={agreedToTerms}
                onChange={(e) => onChange(e.target.checked)}
                className={`peer h-5 w-5 cursor-pointer appearance-none rounded border checked:bg-primary checked:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${error ? 'border-rose-500' : 'border-slate-300 bg-white'}`}
              />
              <CheckCircle className="pointer-events-none absolute left-0 top-0 h-5 w-5 opacity-0 text-white peer-checked:opacity-100 p-0.5" />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
              I have read the itinerary, understood the risks, and agree to the terms, conditions, and cancellation policy stated above.
            </span>
          </label>
          {error && (
             <p className="text-xs text-rose-600 font-medium ml-1 flex items-center gap-1 animate-pulse">
               <AlertCircle className="w-3 h-3" /> {error}
             </p>
          )}
        </div>
      </div>
    </section>
  );
};