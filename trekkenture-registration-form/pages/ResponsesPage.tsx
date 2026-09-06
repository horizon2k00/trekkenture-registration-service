import { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, downloadExport } from '../api';
import { FormDetail, Submission } from '../types';

export function ResponsesPage() {
  const { id = '' } = useParams();
  const [form, setForm] = useState<FormDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<FormDetail>(`/admin/forms/${id}`),
      apiRequest<Submission[]>(`/admin/forms/${id}/submissions`),
    ])
      .then(([formResult, submissionResult]) => {
        setForm(formResult);
        setSubmissions(submissionResult);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : 'Could not load responses',
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <p className="py-12 text-center text-slate-500">Loading responses…</p>
    );
  if (!form)
    return (
      <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">
        {error}
      </p>
    );

  const display = (value: unknown) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    return String(value ?? '');
  };

  const exportResponses = async () => {
    setError('');
    try {
      await downloadExport(form.id, form.slug);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not export responses',
      );
    }
  };

  return (
    <section>
      <Link
        to="/admin/forms"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to forms
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{form.name}</h1>
          <p className="mt-1 text-slate-500">
            {submissions.length} response{submissions.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => void exportResponses()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white"
        >
          <Download className="h-4 w-4" /> Export Excel
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700"
        >
          {error}
        </p>
      )}
      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          No responses yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-max text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Submitted</th>
                {form.questions.map((field) => (
                  <th key={field.id} className="px-4 py-3">
                    {field.question}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </td>
                  {form.questions.map((field) => (
                    <td
                      key={field.id}
                      className="max-w-xs px-4 py-3 text-slate-700"
                    >
                      {display(submission.answers[field.id])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
