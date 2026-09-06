import { QuestionDefinition } from '../types';

export function BoundsEditor({
  question,
  label,
  onChange,
}: {
  question: Pick<
    QuestionDefinition,
    'fieldType' | 'answerType' | 'min' | 'max'
  >;
  label?: string;
  onChange: (bounds: { min?: string | null; max?: string | null }) => void;
}) {
  if (
    question.fieldType !== 'text' ||
    (question.answerType !== 'number' && question.answerType !== 'date')
  )
    return null;
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      {(['min', 'max'] as const).map((bound) => {
        const title = `${bound === 'min' ? 'Minimum' : 'Maximum'} ${question.answerType === 'date' ? 'date' : 'value'}`;
        return (
          <label key={bound} className="text-sm font-semibold text-slate-700">
            {title}
            <input
              aria-label={label ? `${title}: ${label}` : title}
              type={question.answerType}
              step={question.answerType === 'number' ? 'any' : undefined}
              min={bound === 'max' ? (question.min ?? undefined) : undefined}
              max={bound === 'min' ? (question.max ?? undefined) : undefined}
              value={question[bound] ?? ''}
              onChange={(event) =>
                onChange({ [bound]: event.target.value || null })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
        );
      })}
    </div>
  );
}
