import { ReactNode, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const instructions =
  'Drag to reorder, or focus the handle and use the up and down arrow keys.';

export function SortableList({
  ids,
  label,
  onReorder,
  children,
}: {
  ids: string[];
  label: (id: string, index: number) => string;
  onReorder: (ids: string[]) => void;
  children: (id: string, index: number, handle: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [announcement, setAnnouncement] = useState('');
  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= ids.length) return;
    onReorder(arrayMove(ids, from, to));
    setAnnouncement(
      `${label(ids[from], from)} moved to position ${to + 1} of ${ids.length}.`,
    );
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ screenReaderInstructions: { draggable: instructions } }}
      onDragEnd={({ active, over }) => {
        if (over)
          move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {ids.map((id, index) => (
            <SortableRow
              key={id}
              id={id}
              label={label(id, index)}
              disabled={ids.length < 2}
              onMove={(offset) => move(index, index + offset)}
            >
              {(handle) => children(id, index, handle)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  disabled,
  onMove,
  children,
}: {
  id: string;
  label: string;
  disabled: boolean;
  onMove: (offset: number) => void;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      data-sortable-id={id}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`relative rounded-xl bg-white ${isDragging ? 'shadow-xl ring-2 ring-primary/40' : ''}`}
    >
      {children(
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={label}
          aria-keyshortcuts="ArrowUp ArrowDown"
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              onMove(event.key === 'ArrowUp' ? -1 : 1);
            }
          }}
          className="touch-none select-none rounded p-2 text-slate-400 cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-40"
        >
          <GripVertical aria-hidden="true" className="h-5 w-5" />
        </button>,
      )}
    </div>
  );
}
