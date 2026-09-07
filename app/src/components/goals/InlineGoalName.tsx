import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface InlineGoalNameProps {
  name: string;
  onSave: (name: string) => void;
  onOpen?: () => void;
  className?: string;
}

export function InlineGoalName({ name, onSave, onOpen, className = '' }: InlineGoalNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setValue(name);
    setError('');
    setEditing(false);
  };
  const save = () => {
    const next = value.trim();
    if (!next) {
      setError('Goal name cannot be empty.');
      return;
    }
    onSave(next);
    setError('');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={className} onClick={event => event.stopPropagation()}>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={value}
            onChange={event => { setValue(event.target.value); setError(''); }}
            onKeyDown={event => {
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') cancel();
            }}
            aria-label="Goal name"
            aria-invalid={Boolean(error)}
            className="min-w-0 flex-1 rounded-sm border border-[var(--action)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--action)]"
          />
          <button type="button" onClick={save} aria-label="Save goal name" className="rounded p-1 text-[var(--success)] hover:bg-[var(--success-soft)]"><Check size={15} /></button>
          <button type="button" onClick={cancel} aria-label="Cancel goal name edit" className="rounded p-1 text-[var(--ink-muted)] hover:bg-[var(--surface)]0/10"><X size={15} /></button>
        </div>
        {error && <p role="alert" className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-1 ${className}`} onClick={event => event.stopPropagation()}>
      <button type="button" onClick={onOpen} className="min-w-0 text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action)]">
        {name}
      </button>
      <button
        type="button"
        onClick={() => { setValue(name); setEditing(true); }}
        aria-label={`Rename ${name}`}
        title="Rename goal"
        className="shrink-0 rounded p-1 text-[var(--ink-muted)] opacity-70 transition hover:bg-[var(--action-soft)] hover:text-[var(--action)] focus:opacity-100 group-hover:opacity-100"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
