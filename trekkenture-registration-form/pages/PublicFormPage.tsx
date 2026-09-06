import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../api';
import {
  RegistrationForm,
  RegistrationFrame,
} from '../components/RegistrationForm';
import { Answer, PublicForm } from '../types';

export function PublicFormPage() {
  const { eventSlug = '' } = useParams();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setForm(null);
    setAnswers({});
    setSubmitted(false);
    setError('');
    apiRequest<PublicForm>(`/forms/${eventSlug}`, {}, false)
      .then(setForm)
      .catch((caught) =>
        setError(
          caught instanceof ApiError && caught.status === 404
            ? 'This registration form was not found.'
            : caught instanceof Error
              ? caught.message
              : 'Could not load form',
        ),
      )
      .finally(() => setLoading(false));
  }, [eventSlug]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const submittedAnswers = { ...answers };
    for (const question of form?.questions ?? []) {
      if (question.fieldType === 'checkbox') {
        submittedAnswers[question.id] = answers[question.id] === true;
      }
    }
    try {
      await apiRequest(
        `/forms/${eventSlug}/submissions`,
        { method: 'POST', body: JSON.stringify({ answers: submittedAnswers }) },
        false,
      );
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not submit registration',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <RegistrationFrame>
        <p className="py-16 text-center text-slate-500">
          Loading registration…
        </p>
      </RegistrationFrame>
    );
  if (!form)
    return (
      <RegistrationFrame>
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-6 text-center text-rose-700"
        >
          {error}
        </p>
      </RegistrationFrame>
    );
  if (form.status === 'CLOSED') {
    return (
      <RegistrationFrame>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900">{form.name}</h1>
          <p className="mt-3 text-amber-800">
            Registrations are currently closed.
          </p>
        </div>
      </RegistrationFrame>
    );
  }
  if (submitted) {
    return (
      <RegistrationFrame>
        <div className="py-16 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" />
          <h1 className="mt-5 text-3xl font-bold">Registration complete</h1>
          <p className="mt-3 text-slate-600">
            Your response for {form.name} has been saved.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
            }}
            className="mt-6 font-semibold text-primary"
          >
            Submit another response
          </button>
        </div>
      </RegistrationFrame>
    );
  }

  return (
    <RegistrationFrame>
      <RegistrationForm
        form={form}
        answers={answers}
        onAnswerChange={(id, value) =>
          setAnswers((current) => ({ ...current, [id]: value }))
        }
        onSubmit={submit}
        submitting={submitting}
        error={error}
      />
    </RegistrationFrame>
  );
}
