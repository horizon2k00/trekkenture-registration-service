import { useState } from 'react';
import { SortableList } from './SortableList';

export function OptionsEditor({
  label,
  options,
  onChange,
}: {
  label: string;
  options: string[];
  onChange: (options: string[]) => void;
}) {
  // Keep each row's identity while its text or position changes.
  const [ids, setIds] = useState<string[]>(() =>
    options.map(() => crypto.randomUUID()),
  );
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-700">{label}</legend>
      <div className="mt-2">
        <SortableList
          ids={ids}
          label={(_, index) => `Reorder option ${index + 1}: ${label}`}
          onReorder={(reordered) => {
            onChange(reordered.map((id) => options[ids.indexOf(id)]));
            setIds(reordered);
          }}
        >
          {(id, index, handle) => {
            const option = options[index];
            const duplicate = options.some(
              (other, otherIndex) =>
                otherIndex !== index && other.trim() === option.trim(),
            );
            return (
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  {handle}
                  <input
                    aria-label={`${label}: option ${index + 1}`}
                    required
                    title="Enter an option, or delete this row."
                    value={option}
                    ref={(input) =>
                      input?.setCustomValidity(
                        !option.trim()
                          ? 'Enter an option, or delete this row.'
                          : duplicate
                            ? 'Each option must be unique.'
                            : '',
                      )
                    }
                    onChange={(event) =>
                      onChange(
                        options.map((current, optionIndex) =>
                          optionIndex === index ? event.target.value : current,
                        ),
                      )
                    }
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={`Delete option ${index + 1}: ${label}`}
                    onClick={() => {
                      setIds(ids.filter((rowId) => rowId !== id));
                      onChange(
                        options.filter(
                          (_, optionIndex) => optionIndex !== index,
                        ),
                      );
                    }}
                    className="text-xs font-semibold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
                {duplicate && (
                  <p className="mt-2 text-xs text-rose-600">
                    Each option must be unique.
                  </p>
                )}
              </div>
            );
          }}
        </SortableList>
      </div>
      <button
        type="button"
        aria-label={`Add option: ${label}`}
        onClick={() => {
          setIds([...ids, crypto.randomUUID()]);
          onChange([...options, '']);
        }}
        className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-primary"
      >
        Add option
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Drag the handle to reorder, or focus it and use the up/down arrow keys.
        Complete each option or delete its row before saving.
      </p>
    </fieldset>
  );
}
