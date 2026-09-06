import { FormEvent, ReactNode, useState } from 'react';
import { Copy, Mountain, Send } from 'lucide-react';
import { QuestionField } from './QuestionField';
import {
  Answer,
  PaymentConfiguration,
  PublicForm,
  PAYMENT_GROUP_ID,
} from '../types';

export function RegistrationForm({
  form,
  answers,
  onAnswerChange,
  onSubmit,
  submitting = false,
  error = '',
}: {
  form: Pick<PublicForm, 'name' | 'questions' | 'groups' | 'payment'>;
  answers: Record<string, Answer>;
  onAnswerChange: (id: string, value: Answer) => void;
  onSubmit?: (event: FormEvent) => void;
  submitting?: boolean;
  error?: string;
}) {
  return (
    <>
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">
          Trekkenture registration
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
          {form.name}
        </h1>
        <p className="mt-2 text-slate-600">
          Complete the selected sections below to secure your spot.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-rose-50 p-3 text-rose-700"
        >
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.(event);
        }}
        className="space-y-6"
      >
        {!form.questions?.length && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No questions selected yet.
          </p>
        )}
        {(form.groups ?? []).map((group, index) => (
          <section
            key={group.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 font-bold text-slate-600">
                {index + 1}
              </span>
              <h2 className="text-lg font-bold text-slate-800">{group.name}</h2>
            </div>
            <div className="p-6">
              {group.description && (
                <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {group.description}
                </p>
              )}
              {group.id === PAYMENT_GROUP_ID && form.payment && (
                <PaymentInstructions payment={form.payment} />
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                {(form.questions ?? [])
                  .filter((question) => question.groupId === group.id)
                  .map((question) => (
                    <QuestionField
                      key={question.id}
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) => onAnswerChange(question.id, value)}
                    />
                  ))}
              </div>
            </div>
          </section>
        ))}
        <button
          disabled={!onSubmit || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-4 font-bold text-white shadow-lg disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit registration'}{' '}
          <Send className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}

export function RegistrationFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-2 text-lg font-bold text-slate-800">
          <Mountain className="h-6 w-6 text-primary" /> Trekkenture
        </div>
        {children}
        <footer className="mt-16 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Trekkenture
        </footer>
      </div>
    </div>
  );
}

function PaymentInstructions({ payment }: { payment: PaymentConfiguration }) {
  const [copyError, setCopyError] = useState('');
  const upiUrl = `upi://pay?pa=${encodeURIComponent(payment.upiId)}&pn=${encodeURIComponent(payment.payeeName)}&cu=${payment.currency}&am=${payment.advancePayment}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payment.upiId);
      setCopyError('');
    } catch {
      setCopyError('Could not copy. Select and copy the UPI ID above.');
    }
  };
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-5 rounded-lg bg-indigo-50 p-4 sm:flex-row sm:items-center">
        {payment.upiId && payment.advancePayment !== null && (
          <img
            alt="Payment QR code"
            className="h-40 w-40 rounded-lg bg-white p-2"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`}
          />
        )}
        <div>
          <p className="font-semibold text-indigo-950">
            {payment.advancePayment === null
              ? 'Advance payment: not set'
              : `Pay ₹${payment.advancePayment} advance`}
          </p>
          <p className="text-sm text-indigo-800">
            Total event cost:{' '}
            {payment.totalPayment === null
              ? 'not set'
              : `₹${payment.totalPayment}`}
          </p>
          {payment.upiId ? (
            <button
              type="button"
              onClick={() => void copy()}
              className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary"
            >
              <Copy className="h-4 w-4" /> {payment.upiId}
            </button>
          ) : (
            <p className="mt-3 text-sm text-amber-800">
              Payment account has not been configured yet.
            </p>
          )}
          {copyError && (
            <p role="alert" className="mt-2 text-sm text-rose-700">
              {copyError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
