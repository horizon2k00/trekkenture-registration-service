import React from 'react';
import { CreditCard, Copy, Info } from 'lucide-react';
import { InputGroup } from '../../InputGroup';
import { BUSINESS_INFO } from '../../../data/constants';

interface PaymentSectionProps {
  paymentUtr: string;
  onChange: (value: string) => void;
  error?: string;
  onCopy: (text: string) => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({ paymentUtr, onChange, error, onCopy }) => {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200">4</div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-400" />
          Payment
        </h2>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* QR Code Column */}
          <div className="flex flex-col items-center flex-shrink-0">
             <div className="w-48 h-48 bg-white p-3 border border-slate-200 rounded-xl shadow-sm mb-3">
                <img 
                  src={`${BUSINESS_INFO.qrBaseUrl}?size=${BUSINESS_INFO.qrSize}&data=upi://pay?pa=${BUSINESS_INFO.upiId}&pn=${BUSINESS_INFO.payeeName}&cu=${BUSINESS_INFO.currency}`}
                  alt="Payment QR" 
                  className="w-full h-full object-contain mix-blend-multiply"
                />
             </div>
             <div className="text-center w-full max-w-[200px]">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Scan to Pay</span>
               <div className="flex items-center justify-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 group cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => onCopy(BUSINESS_INFO.upiId)}
                    title="Click to copy UPI ID">
                  <span className="text-sm font-mono font-medium text-slate-700">{BUSINESS_INFO.upiId}</span>
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary" />
               </div>
             </div>
          </div>

          {/* Information Column */}
          <div className="flex-grow flex flex-col justify-center gap-6">
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">Payment Instructions</p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  1. Scan the QR code or use the UPI ID to make the payment.<br/>
                  2. After successful payment, locate the <strong>UTR / Reference Number</strong> in your payment app.<br/>
                  3. Enter the UTR number below to complete registration.
                </p>
              </div>
            </div>

            <div className="max-w-md">
              <InputGroup
                label="UTR / Transaction Reference Number"
                name="paymentUtr"
                required
                placeholder="e.g. 3089XXXXXXXX"
                value={paymentUtr}
                onChange={(e) => onChange(e.target.value)}
                error={error}
                className="w-full"
              />
              <p className="text-xs text-slate-400 mt-2 ml-1">Usually a 12-digit number starting with the year or bank code.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};