import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { FormPreview } from '../components/FormPreview';
import { FormDetail } from '../types';

export function FormPreviewPage() {
  const { id } = useParams();
  const [form, setForm] = useState<FormDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(null);
    setError('');
    apiRequest<FormDetail>(`/admin/forms/${id}`)
      .then(setForm)
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : 'Could not load preview',
        ),
      );
  }, [id]);

  const back = (
    <Link to="/admin/forms" className="font-semibold text-primary">
      Back to forms
    </Link>
  );
  if (error)
    return (
      <div>
        {back}
        <p role="alert" className="mt-4 text-rose-700">
          {error}
        </p>
      </div>
    );
  if (!form)
    return <p className="py-12 text-center text-slate-500">Loading preview…</p>;
  return <FormPreview key={form.id} form={form} back={back} />;
}
