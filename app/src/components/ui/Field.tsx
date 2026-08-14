import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

/**
 * Text and select inputs, with the label wiring and error reporting built in.
 *
 * The forms pass established the pattern — associate the label, mark the field
 * invalid, point at the message with `aria-describedby` — but it had to be
 * repeated per field. Here it is derived from `label` and `error`, so a field
 * cannot be left unlabelled or an error left unannounced.
 */
const CONTROL_CLASSES =
  'w-full px-3 py-2.5 rounded-xl text-sm transition-colors border ' +
  'bg-white text-slate-900 border-slate-200 placeholder:text-slate-400 ' +
  'dark:bg-white/5 dark:text-white dark:border-white/10 dark:placeholder:text-gray-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-transparent';

const INVALID_CLASSES = 'border-red-400 dark:border-red-500/60';

interface FieldShellProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-gray-400">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-500 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-slate-400 dark:text-gray-600">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, className = '', ...rest }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL_CLASSES} ${error ? INVALID_CLASSES : ''} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function SelectField({ label, error, hint, className = '', children, ...rest }: SelectFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL_CLASSES} ${error ? INVALID_CLASSES : ''} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}
