import { ReactNode, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import {
  Answer,
  FormDetail,
  PaymentSettings,
  PAYMENT_GROUP_ID,
} from '../types';
import { RegistrationForm, RegistrationFrame } from './RegistrationForm';

export function FormPreview({
  form,
  back,
}: {
  form: Pick<
    FormDetail,
    'name' | 'questions' | 'groups' | 'advancePayment' | 'totalPayment'
  >;
  back: ReactNode;
}) {
  const paymentEnabled = form.groups.some(
    (group) => group.id === PAYMENT_GROUP_ID,
  );
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings | null>(null);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (!paymentEnabled) return;
    apiRequest<PaymentSettings>('/admin/forms/payment-settings')
      .then(setPaymentSettings)
      .catch(() =>
        setPaymentError(
          'Could not load payment instructions. Return and reopen the preview to try again.',
        ),
      );
  }, [paymentEnabled]);

  return (
    <section>
      <div className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div>
          <h2 className="font-bold text-blue-950">Form preview</h2>
          <p className="text-sm text-blue-800">
            Try the fields below. Preview answers are not saved.
          </p>
        </div>
        {back}
      </div>
      <RegistrationFrame>
        {paymentEnabled && !paymentSettings && !paymentError && (
          <p role="status" className="mb-4 text-sm text-slate-500">
            Loading payment instructions…
          </p>
        )}
        <RegistrationForm
          form={{
            ...form,
            name: form.name.trim() || 'Untitled form',
            payment:
              paymentEnabled && paymentSettings
                ? {
                    ...paymentSettings,
                    advancePayment: form.advancePayment,
                    totalPayment: form.totalPayment,
                  }
                : undefined,
          }}
          answers={answers}
          onAnswerChange={(id, value) =>
            setAnswers((current) => ({ ...current, [id]: value }))
          }
          error={paymentError}
        />
      </RegistrationFrame>
    </section>
  );
}
