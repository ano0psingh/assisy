import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';

/**
 * Text and select inputs, with the label wiring and error reporting built in.
 *
 * The forms pass established the pattern — associate the label, mark the field
 * invalid, point at the message with `aria-describedby` — but it had to be
 * repeated per field. Here it is derived from `label` and `error`, so a field
 * cannot be left unlabelled or an error left unannounced.
 */
const CONTROL_CLASSES =
  'w-full h-12 px-3 rounded-xl text-sm transition-colors duration-150 border ' +
  'bg-surface-raised text-text border-border placeholder:text-text-muted ' +
  'focus:outline-none focus:border-primary';

const INVALID_CLASSES = 'border-danger';

interface FieldShellProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

// The label is text-sm to match the labels above the button groups these forms
// also contain, so a migrated field and a hand-built one read alike. Hints and
// errors stay text-xs, which keeps the label the dominant line.
function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-text-muted">
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
  /**
   * Forms focus the first invalid field on submit, which needs the element. In
   * React 19 `ref` is an ordinary prop on a function component, so this needs no
   * `forwardRef` — only the type, whose absence previously made these fields
   * unusable for any form doing focus management.
   */
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ label, error, hint, className = '', ref, ...rest }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        ref={ref}
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
