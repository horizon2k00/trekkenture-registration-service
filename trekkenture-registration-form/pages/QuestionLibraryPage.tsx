import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '../api';
import { OptionsEditor } from '../components/OptionsEditor';
import { BoundsEditor } from '../components/BoundsEditor';
import {
  AnswerType,
  FieldType,
  FormCatalog,
  GroupDefinition,
  QuestionDefinition,
  PAYMENT_GROUP_ID,
  PAYMENT_REFERENCE_ID,
} from '../types';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal';
const buttonClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600';

export function QuestionLibraryPage() {
  const [catalog, setCatalog] = useState<FormCatalog | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDefinition | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDefinition | null>(
    null,
  );
  const [newQuestionGroupId, setNewQuestionGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<FormCatalog>('/admin/form-catalog')
      .then(setCatalog)
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : 'Could not load questions',
        ),
      );
  }, []);

  const changeLibrary = async (
    path: string,
    method: string,
    body?: unknown,
  ) => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(path, {
        method,
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
      setCatalog(await apiRequest<FormCatalog>('/admin/form-catalog'));
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not update question library',
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupDraft) return;
    const path = groupDraft.id
      ? `/admin/question-groups/${groupDraft.id}`
      : '/admin/question-groups';
    if (
      await changeLibrary(path, groupDraft.id ? 'PUT' : 'POST', {
        name: groupDraft.name.trim(),
        description: groupDraft.description.trim(),
      })
    )
      setGroupDraft(null);
  };

  const saveQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!questionDraft) return;
    const { id, ...question } = questionDraft;
    const hasBounds =
      question.fieldType === 'text' &&
      ['number', 'date'].includes(question.answerType);
    const body = {
      ...question,
      question: question.question.trim(),
      answerType: question.fieldType === 'text' ? question.answerType : null,
      options: ['dropdown', 'radio'].includes(question.fieldType)
        ? question.options.map((option) => option.trim())
        : [],
      min: hasBounds ? question.min || null : null,
      max: hasBounds ? question.max || null : null,
    };
    if (
      await changeLibrary(
        id ? `/admin/questions/${id}` : '/admin/questions',
        id ? 'PUT' : 'POST',
        body,
      )
    )
      setQuestionDraft(null);
  };

  const deleteGroup = async (group: GroupDefinition) => {
    if (
      !window.confirm(
        `Delete group "${group.name}"? Delete or move its questions first. Existing forms keep their saved copy.`,
      )
    )
      return;
    if (await changeLibrary(`/admin/question-groups/${group.id}`, 'DELETE')) {
      if (groupDraft?.id === group.id) setGroupDraft(null);
    }
  };

  const deleteQuestion = async (question: QuestionDefinition) => {
    if (
      !window.confirm(
        `Delete question "${question.question}" from the library? Existing forms keep their saved copy.`,
      )
    )
      return;
    if (await changeLibrary(`/admin/questions/${question.id}`, 'DELETE')) {
      if (questionDraft?.id === question.id) setQuestionDraft(null);
    }
  };

  const newQuestion = (groupId: string) => {
    setError('');
    setGroupDraft(null);
    setNewQuestionGroupId(groupId);
    setQuestionDraft({
      id: '',
      groupId,
      question: '',
      fieldType: 'text',
      answerType: 'string',
      options: [],
      min: null,
      max: null,
    });
  };

  if (!catalog)
    return (
      <p
        role={error ? 'alert' : undefined}
        className="py-12 text-center text-slate-500"
      >
        {error || 'Loading question library…'}
      </p>
    );

  const errorMessage = error && (
    <p role="alert" className="my-4 rounded-lg bg-rose-50 p-3 text-rose-700">
      {error}
    </p>
  );

  const groupEditor = groupDraft && (
    <form
      onSubmit={saveGroup}
      className="my-4 space-y-4 rounded-xl border border-primary/30 bg-white p-6"
    >
      <h2 className="text-lg font-bold">
        {groupDraft.id ? 'Edit group' : 'New group'}
      </h2>
      <label className="block text-sm font-semibold text-slate-700">
        Group name
        <input
          autoFocus
          required
          value={groupDraft.name}
          onChange={(event) =>
            setGroupDraft({ ...groupDraft, name: event.target.value })
          }
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Description / instructions
        <textarea
          rows={3}
          value={groupDraft.description}
          onChange={(event) =>
            setGroupDraft({
              ...groupDraft,
              description: event.target.value,
            })
          }
          className={inputClass}
        />
      </label>
      {errorMessage}
      <div className="flex gap-3">
        <button
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white"
        >
          Save group
        </button>
        <button
          disabled={busy}
          type="button"
          onClick={() => {
            setGroupDraft(null);
            setError('');
          }}
          className={buttonClass}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  const questionEditor = questionDraft && (
    <form
      onSubmit={saveQuestion}
      className="my-3 w-full rounded-xl border border-primary/30 bg-white p-6"
    >
      <h2 className="mb-4 text-lg font-bold">
        {questionDraft.id ? 'Edit question' : 'New question'}
      </h2>
      <QuestionEditor
        key={questionDraft.id ?? 'new'}
        question={questionDraft}
        groups={catalog.groups}
        onChange={setQuestionDraft}
      />
      {errorMessage}
      <div className="mt-4 flex gap-3">
        <button
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white"
        >
          Save question
        </button>
        <button
          disabled={busy}
          type="button"
          onClick={() => {
            setQuestionDraft(null);
            setError('');
          }}
          className={buttonClass}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Question library
          </h1>
          <p className="mt-1 text-slate-500">
            Reusable groups and questions. Each form keeps a saved copy, so
            library edits do not change existing forms.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            setError('');
            setQuestionDraft(null);
            setGroupDraft({ id: '', name: '', description: '' });
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> New group
        </button>
      </div>
      {!groupDraft && !questionDraft && errorMessage}

      {groupDraft?.id === '' && groupEditor}

      <div className="space-y-5">
        {catalog.groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Create a group, then add its questions.
          </p>
        )}
        {catalog.groups.map((group) => (
          <section
            key={group.id}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">{group.name}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  onClick={() => newQuestion(group.id)}
                  className={buttonClass}
                >
                  Add question to {group.name}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setQuestionDraft(null);
                    setGroupDraft({ ...group });
                  }}
                  className={buttonClass}
                >
                  Edit {group.name}
                </button>
                <button
                  disabled={busy || group.id === PAYMENT_GROUP_ID}
                  onClick={() => void deleteGroup(group)}
                  className={buttonClass}
                >
                  Delete {group.name}
                </button>
              </div>
            </div>
            {group.description && (
              <p className="mt-3 whitespace-pre-line text-sm text-slate-500">
                {group.description}
              </p>
            )}
            {groupDraft?.id === group.id && groupEditor}
            {group.id === PAYMENT_GROUP_ID && (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold">
                  Always included: advance amount, total amount and transaction
                  number.
                </p>
                <p className="mt-1">
                  Set the amounts when building a form. Add extra payment
                  questions below, or remove the whole Payment group from a
                  form.
                </p>
              </div>
            )}
            <ul className="mt-4 divide-y divide-slate-100">
              {catalog.questions
                .filter((question) => question.groupId === group.id)
                .map((question) => (
                  <li
                    key={question.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    {questionDraft?.id === question.id ? (
                      questionEditor
                    ) : (
                      <>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {question.question}
                          </p>
                          <p className="text-xs text-slate-500">
                            {question.id === PAYMENT_REFERENCE_ID &&
                              'Required payment question · '}
                            {question.fieldType}
                            {question.answerType && ` · ${question.answerType}`}
                            {['dropdown', 'radio'].includes(
                              question.fieldType,
                            ) &&
                              question.options.length > 0 &&
                              ` · ${question.options.join(', ')}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={busy}
                            onClick={() => {
                              setError('');
                              setGroupDraft(null);
                              setQuestionDraft({ ...question });
                            }}
                            aria-label={`Edit question: ${question.question}`}
                            className={buttonClass}
                          >
                            Edit
                          </button>
                          <button
                            disabled={
                              busy || question.id === PAYMENT_REFERENCE_ID
                            }
                            onClick={() => void deleteQuestion(question)}
                            aria-label={`Delete question: ${question.question}`}
                            className={buttonClass}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
            </ul>
            {questionDraft?.id === '' &&
              newQuestionGroupId === group.id &&
              questionEditor}
          </section>
        ))}
      </div>
    </section>
  );
}

function QuestionEditor({
  question,
  groups,
  onChange,
}: {
  question: QuestionDefinition;
  groups: GroupDefinition[];
  onChange: (question: QuestionDefinition) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
        Question
        <input
          autoFocus
          required
          value={question.question}
          onChange={(event) =>
            onChange({ ...question, question: event.target.value })
          }
          className={inputClass}
        />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Group
        <select
          disabled
          value={question.groupId}
          className={`${inputClass} bg-slate-100 text-slate-500`}
        >
          <option value="">Select group…</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Field type
        <select
          disabled={question.id === PAYMENT_REFERENCE_ID}
          value={question.fieldType}
          onChange={(event) => {
            const fieldType = event.target.value as FieldType;
            onChange({
              ...question,
              fieldType,
              answerType: fieldType === 'text' ? 'string' : null,
              options: ['dropdown', 'radio'].includes(fieldType)
                ? question.options
                : [],
              min: null,
              max: null,
            });
          }}
          className={inputClass}
        >
          <option value="text">Text input</option>
          <option value="dropdown">Dropdown</option>
          <option value="radio">Radio buttons</option>
          <option value="checkbox">Checkbox</option>
        </select>
      </label>
      {question.fieldType === 'text' ? (
        <label className="text-sm font-semibold text-slate-700">
          Answer type
          <select
            disabled={question.id === PAYMENT_REFERENCE_ID}
            value={question.answerType ?? 'string'}
            onChange={(event) =>
              onChange({
                ...question,
                answerType: event.target.value as AnswerType,
                min: null,
                max: null,
              })
            }
            className={inputClass}
          >
            <option value="string">String (text)</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="email">Email</option>
            <option value="phone">Phone number</option>
          </select>
        </label>
      ) : ['dropdown', 'radio'].includes(question.fieldType) ? (
        <div className="sm:col-span-2">
          <OptionsEditor
            label="Default options"
            options={question.options}
            onChange={(options) => onChange({ ...question, options })}
          />
          <p className="mt-1 text-xs text-slate-500">
            Options can be added, replaced, or removed when building a form.
          </p>
        </div>
      ) : null}
      <BoundsEditor
        question={question}
        onChange={(bounds) => onChange({ ...question, ...bounds })}
      />
    </div>
  );
}
