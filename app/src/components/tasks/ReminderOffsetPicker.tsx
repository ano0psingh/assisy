import type { ReminderOffsetMinutes } from '../../types';

const OPTIONS: { value: ReminderOffsetMinutes; label: string }[] = [
  { value: 0, label: 'At time' },
  { value: 10, label: '10m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 1440, label: '1d' },
];

export function ReminderOffsetPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ReminderOffsetMinutes[];
  onChange: (value: ReminderOffsetMinutes[]) => void;
}) {
  const toggle = (offset: ReminderOffsetMinutes) => {
    onChange(value.includes(offset)
      ? value.filter(item => item !== offset)
      : [...value, offset].sort((a, b) => b - a));
  };
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold text-[var(--ink-secondary)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`min-h-11 rounded-[var(--radius-md)] border px-3 text-xs font-medium transition-colors ${
            value.length === 0
              ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
              : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
          }`}
        >
          None
        </button>
        {OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value.includes(option.value)}
            onClick={() => toggle(option.value)}
            className={`min-h-11 rounded-[var(--radius-md)] border px-3 text-xs font-medium transition-colors ${
              value.includes(option.value)
                ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
