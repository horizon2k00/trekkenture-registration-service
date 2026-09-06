import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Eye, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { OptionsEditor } from '../components/OptionsEditor';
import { BoundsEditor } from '../components/BoundsEditor';
import { FormPreview } from '../components/FormPreview';
import { SortableList } from '../components/SortableList';
import {
  FormCatalog,
  FormDetail,
  FormInput,
  FormQuestion,
  QuestionDefinition,
  PAYMENT_GROUP_ID,
  PAYMENT_REFERENCE_ID,
} from '../types';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function FormBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<FormCatalog | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [selected, setSelected] = useState<FormQuestion[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [advancePayment, setAdvancePayment] = useState('');
  const [totalPayment, setTotalPayment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const paymentEnabled = groupIds.includes(PAYMENT_GROUP_ID);

  useEffect(() => {
    setPreview(false);
    setLoading(true);
    const load = async () => {
      try {
        const [library, form] = await Promise.all([
          apiRequest<FormCatalog>('/admin/form-catalog'),
          id
            ? apiRequest<FormDetail>(`/admin/forms/${id}`)
            : Promise.resolve(null),
        ]);
        // Saved questions remain editable even when their library originals change or disappear.
        setCatalog(
          form
            ? {
                groups: [
                  ...form.groups,
                  ...library.groups.filter(
                    (group) =>
                      !form.groups.some((saved) => saved.id === group.id),
                  ),
                ],
                questions: [
                  ...form.questions,
                  ...library.questions.filter(
                    (question) =>
                      !form.questions.some((saved) => saved.id === question.id),
                  ),
                ],
              }
            : library,
        );
        setName(form?.name ?? '');
        setSlug(form?.slug ?? '');
        setSlugEdited(Boolean(form));
        setSelected(form?.questions ?? []);
        setGroupIds(form?.groups.map((group) => group.id) ?? []);
        setExpandedGroupId(form?.groups[0]?.id ?? null);
        setAdvancePayment(form?.advancePayment?.toString() ?? '');
        setTotalPayment(form?.totalPayment?.toString() ?? '');
        setError('');
      } catch (caught) {
        setCatalog(null);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Could not load form builder',
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const addGroup = (groupId: string) => {
    if (!groupId || groupIds.includes(groupId)) return;
    if (groupId === PAYMENT_GROUP_ID) {
      const reference = catalog?.questions.find(
        (question) => question.id === PAYMENT_REFERENCE_ID,
      );
      if (!reference) {
        setError(
          'The Payment group is missing its transaction number question.',
        );
        return;
      }
      setSelected((current) => [...current, { ...reference, required: true }]);
    }
    setGroupIds((current) => [...current, groupId]);
    setExpandedGroupId(groupId);
  };

  const removeGroup = (groupId: string) => {
    setGroupIds((current) => current.filter((id) => id !== groupId));
    setSelected((current) =>
      current.filter((question) => question.groupId !== groupId),
    );
    if (expandedGroupId === groupId) setExpandedGroupId(null);
    if (groupId === PAYMENT_GROUP_ID) {
      setAdvancePayment('');
      setTotalPayment('');
    }
  };

  const toggle = (question: QuestionDefinition) => {
    setSelected((current) =>
      current.some((item) => item.id === question.id)
        ? current.filter((item) => item.id !== question.id)
        : [...current, { ...question, required: true }],
    );
  };

  const updateQuestion = (
    questionId: string,
    changes: Partial<FormQuestion>,
  ) => {
    setSelected((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, ...changes } : question,
      ),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const input: FormInput = {
      name,
      slug,
      groupIds,
      questions: selected.map((question) => ({
        id: question.id,
        required: question.required,
        ...(['dropdown', 'radio'].includes(question.fieldType) && {
          options: question.options.map((option) => option.trim()),
        }),
        ...(question.fieldType === 'text' &&
          ['number', 'date'].includes(question.answerType) && {
            min: question.min,
            max: question.max,
          }),
      })),
      advancePayment:
        paymentEnabled && advancePayment !== '' ? Number(advancePayment) : null,
      totalPayment:
        paymentEnabled && totalPayment !== '' ? Number(totalPayment) : null,
    };
    setSaving(true);
    try {
      await apiRequest(id ? `/admin/forms/${id}` : '/admin/forms', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(input),
      });
      navigate('/admin/forms');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not save form',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <p className="py-12 text-center text-slate-500">Loading builder…</p>;
  if (!catalog)
    return (
      <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">
        {error}
      </p>
    );

  if (preview) {
    return (
      <FormPreview
        form={{
          name,
          questions: selected.map((question) => ({
            ...question,
            options: question.options.map((option) => option.trim()),
          })),
          groups: groupIds.map((groupId) =>
            catalog.groups.find((group) => group.id === groupId),
          ),
          advancePayment: advancePayment === '' ? null : Number(advancePayment),
          totalPayment: totalPayment === '' ? null : Number(totalPayment),
        }}
        back={
          <button
            type="button"
            onClick={() => setPreview(false)}
            className="font-semibold text-primary"
          >
            Back to editing
          </button>
        }
      />
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl">
      <Link
        to="/admin/forms"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to forms
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">
          {id ? 'Edit draft' : 'Build a registration form'}
        </h1>
        <button
          type="button"
          disabled={saving}
          onClick={() => setPreview(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
        >
          <Eye className="h-4 w-4" /> Preview
        </button>
      </div>
      <p className="mb-6 mt-1 text-slate-500">
        Add a group, choose its questions, then add the next group. Drag the
        handles to set the order. Manage reusable questions in the{' '}
        <Link to="/admin/questions" className="font-semibold text-primary">
          question library
        </Link>
        .
      </p>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-rose-50 p-3 text-rose-700"
        >
          {error}
        </p>
      )}

      <section className="mb-6 grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Event name <span className="text-rose-500">*</span>
          <input
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugEdited) setSlug(slugify(event.target.value));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Public URL slug <span className="text-rose-500">*</span>
          <input
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
      </section>

      <div className="space-y-5">
        <SortableList
          ids={groupIds}
          label={(groupId) =>
            `Reorder group: ${catalog.groups.find((group) => group.id === groupId)?.name}`
          }
          onReorder={setGroupIds}
        >
          {(groupId, index, handle) => {
            const group = catalog.groups.find((item) => item.id === groupId)!;
            const expanded = expandedGroupId === groupId;
            const count = selected.filter(
              (question) => question.groupId === groupId,
            ).length;
            return (
              <section className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 p-4">
                  {handle}
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`group-${groupId}`}
                    aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.name}`}
                    onClick={() =>
                      setExpandedGroupId(expanded ? null : groupId)
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                      {index + 1}
                    </span>
                    <span className="flex-1">
                      <h2 className="font-bold text-slate-900">{group.name}</h2>
                      <span className="text-xs text-slate-500">
                        {count} question{count === 1 ? '' : 's'} selected
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove group: ${group.name}`}
                    onClick={() => removeGroup(groupId)}
                    className="ml-2 rounded px-2 py-1 text-sm font-semibold text-rose-600"
                  >
                    Remove
                  </button>
                </div>
                {expanded && (
                  <div
                    id={`group-${groupId}`}
                    className="border-t border-slate-100 p-6"
                  >
                    {group.description && (
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-500">
                        {group.description}
                      </p>
                    )}
                    {group.id === PAYMENT_GROUP_ID && (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Advance payment (INR)
                          <input
                            min="0"
                            step="0.01"
                            type="number"
                            value={advancePayment}
                            onChange={(event) =>
                              setAdvancePayment(event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                          />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                          Total payment (INR)
                          <input
                            min="0"
                            step="0.01"
                            type="number"
                            value={totalPayment}
                            onChange={(event) =>
                              setTotalPayment(event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                          />
                        </label>
                        <p className="text-xs text-slate-500 sm:col-span-2">
                          Advance amount, total amount and transaction number
                          are always included with Payment. Set both amounts
                          before publishing.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {catalog.questions
                        .filter((question) => question.groupId === group.id)
                        .map((question) => {
                          const chosen = selected.find(
                            (item) => item.id === question.id,
                          );
                          return (
                            <div
                              key={question.id}
                              className="rounded-lg border border-slate-200 p-3"
                            >
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  aria-label={`Include ${question.question}`}
                                  disabled={
                                    question.id === PAYMENT_REFERENCE_ID
                                  }
                                  type="checkbox"
                                  checked={Boolean(chosen)}
                                  onChange={() => toggle(question)}
                                  className="mt-1 h-4 w-4 accent-primary"
                                />
                                <span>
                                  <span className="block text-sm font-semibold text-slate-800">
                                    {question.question}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {question.fieldType}
                                    {question.answerType &&
                                      ` · ${question.answerType}`}
                                  </span>
                                </span>
                              </label>
                              {chosen && (
                                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                                  <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      aria-label={`Required: ${question.question}`}
                                      disabled={
                                        question.id === PAYMENT_REFERENCE_ID
                                      }
                                      type="checkbox"
                                      checked={chosen.required}
                                      onChange={(event) =>
                                        updateQuestion(question.id, {
                                          required: event.target.checked,
                                        })
                                      }
                                      className="accent-primary"
                                    />
                                    Required
                                  </label>
                                  <BoundsEditor
                                    question={chosen}
                                    label={chosen.question}
                                    onChange={(bounds) =>
                                      updateQuestion(question.id, bounds)
                                    }
                                  />
                                  {['dropdown', 'radio'].includes(
                                    chosen.fieldType,
                                  ) && (
                                    <OptionsEditor
                                      label={`Options: ${question.question}`}
                                      options={chosen.options}
                                      onChange={(options) =>
                                        updateQuestion(question.id, { options })
                                      }
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    {!catalog.questions.some(
                      (question) => question.groupId === groupId,
                    ) && (
                      <p className="text-sm text-slate-500">
                        This group has no questions yet. Add them in the
                        question library, or save a draft to finish later.
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          }}
        </SortableList>
        {groupIds.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
            No groups added yet. Choose your first group below.
          </p>
        )}
        <label className="block rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-700">
          Add a group
          <select
            aria-label="Add a group"
            value=""
            onChange={(event) => addGroup(event.target.value)}
            disabled={groupIds.length === catalog.groups.length}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:opacity-50"
          >
            <option value="">
              {groupIds.length === catalog.groups.length
                ? 'All groups added'
                : 'Choose a group…'}
            </option>
            {catalog.groups
              .filter((group) => !groupIds.includes(group.id))
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
        </label>
        {groupIds.length > 1 && (
          <p className="text-xs text-slate-500">
            Drag a group handle to reorder, or focus it and use the up/down
            arrow keys.
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Drafts can be incomplete. Preview the form before publishing.
        </p>
        <button
          disabled={saving}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white shadow-lg disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </form>
  );
}
