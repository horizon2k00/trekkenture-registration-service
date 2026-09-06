import { Answer, FormQuestion } from '../types';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900';

export function QuestionField({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value?: Answer;
  onChange: (value: Answer) => void;
}) {
  const { fieldType, answerType, options, required } = question;
  const label = (
    <>
      {question.question}
      {required && <span className="text-rose-500"> *</span>}
    </>
  );

  if (fieldType === 'checkbox') {
    return (
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
        <input
          required={required}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-5 w-5 accent-primary"
        />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </label>
    );
  }

  if (fieldType === 'radio') {
    return (
      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          {label}
        </legend>
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={value === option}
                required={required}
                onChange={() => onChange(option)}
                className="h-4 w-4 accent-primary"
              />
              {option}
            </label>
          ))}
        </div>
        {!required && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="mt-3 text-sm font-semibold text-primary"
          >
            Clear selection
          </button>
        )}
      </fieldset>
    );
  }

  const inputType =
    answerType === 'string'
      ? 'text'
      : answerType === 'phone'
        ? 'tel'
        : (answerType ?? 'text');
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      {fieldType === 'dropdown' ? (
        <select
          required={required}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          required={required}
          type={inputType}
          step={answerType === 'number' ? 'any' : undefined}
          min={question.min ?? undefined}
          max={question.max ?? undefined}
          value={String(value ?? '')}
          onChange={(event) =>
            onChange(
              answerType === 'number' && event.target.value !== ''
                ? Number(event.target.value)
                : event.target.value,
            )
          }
          className={inputClass}
        />
      )}
    </label>
  );
}
