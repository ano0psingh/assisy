import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Plus, Activity, TrendingDown, TrendingUp, Minus, X } from 'lucide-react';
import type { MetricEntry } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { getLocalDateString } from '../../lib/dateUtils';

const STORAGE_KEY = 'assisy_metrics';

const PRESET_METRICS = [
  { type: 'Weight', unit: 'kg', placeholder: '75.5' },
  { type: 'Body Fat', unit: '%', placeholder: '18' },
  { type: 'Waist', unit: 'cm', placeholder: '80' },
  { type: 'Sleep', unit: 'hrs', placeholder: '7.5' },
  { type: 'Steps', unit: 'steps', placeholder: '10000' },
  { type: 'Calories', unit: 'kcal', placeholder: '2000' },
];

const CHART_COLORS = ['var(--action)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--danger)', 'var(--ink-secondary)'];

function loadMetrics(): MetricEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem('assisy_body_metrics');
      if (old) {
        const legacy = JSON.parse(old) as { id: string; date: string; weight?: number; note?: string }[];
        return legacy
          .filter(e => e.weight)
          .map(e => ({ id: e.id, date: e.date, metricType: 'Weight', value: e.weight!, unit: 'kg', note: e.note }));
      }
    }
    return JSON.parse(raw || '[]');
  } catch { return []; }
}

function saveMetrics(entries: MetricEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function BodyMetrics() {
  const [entries, setEntries] = useState<MetricEntry[]>(loadMetrics);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState('Weight');
  const [customType, setCustomType] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => getLocalDateString());
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  const metricTypes = useMemo(() => {
    const types = new Set(entries.map(e => e.metricType));
    PRESET_METRICS.forEach(p => types.add(p.type));
    return [...types];
  }, [entries]);

  const viewMetric = activeMetric || metricTypes[0] || 'Weight';

  const metricEntries = useMemo(
    () => entries.filter(e => e.metricType === viewMetric).sort((a, b) => a.date.localeCompare(b.date)),
    [entries, viewMetric],
  );

  const chartData = useMemo(
    () => metricEntries.map(e => ({
      date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: e.value,
    })),
    [metricEntries],
  );

  const latest = metricEntries.length > 0 ? metricEntries[metricEntries.length - 1] : null;
  const first = metricEntries.length > 0 ? metricEntries[0] : null;
  const change = latest && first && metricEntries.length > 1 ? +(latest.value - first.value).toFixed(1) : null;
  const unit = latest?.unit || PRESET_METRICS.find(p => p.type === viewMetric)?.unit || '';

  const isCustom = selectedType === '__custom';
  const resolvedType = isCustom ? customType.trim() : selectedType;
  const resolvedUnit = isCustom ? customUnit.trim() : (PRESET_METRICS.find(p => p.type === selectedType)?.unit || '');
  const placeholder = PRESET_METRICS.find(p => p.type === selectedType)?.placeholder || '0';

  const handleAdd = () => {
    const v = parseFloat(value);
    if (!v || !resolvedType || !resolvedUnit) return;
    const entry: MetricEntry = { id: uuidv4(), date, metricType: resolvedType, value: v, unit: resolvedUnit, note: note.trim() || undefined };
    const next = [...entries.filter(e => !(e.date === date && e.metricType === resolvedType)), entry];
    setEntries(next);
    saveMetrics(next);
    setValue('');
    setNote('');
    setShowForm(false);
    setActiveMetric(resolvedType);
  };

  const handleDelete = (id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveMetrics(next);
  };

  const inputCls = 'input w-full px-3 py-2 text-sm';

  return (
    <div className="border border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[var(--action)]" />
            <h2 className="text-lg font-bold text-[var(--ink)]">Health signals</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">Private measurements and trend lines.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className="flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'Log'}
        </button>
      </div>

      {showForm && (
        <div className={`mb-4 p-3 rounded-md border space-y-2 bg-[var(--surface)] border-[var(--rule)]`}>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[120px]">
              <label className={`text-xs font-medium mb-1 block text-[var(--ink-muted)]`}>Metric</label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={inputCls}>
                {PRESET_METRICS.map(p => <option key={p.type} value={p.type}>{p.type} ({p.unit})</option>)}
                <option value="__custom">+ Custom...</option>
              </select>
            </div>
            {isCustom && (
              <>
                <div className="flex-1 min-w-[80px]">
                  <label className={`text-xs font-medium mb-1 block text-[var(--ink-muted)]`}>Name</label>
                  <input type="text" value={customType} onChange={e => setCustomType(e.target.value)} placeholder="e.g. Resting HR" className={inputCls} />
                </div>
                <div className="w-20">
                  <label className={`text-xs font-medium mb-1 block text-[var(--ink-muted)]`}>Unit</label>
                  <input type="text" value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="bpm" className={inputCls} />
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[90px]">
              <label className={`text-xs font-medium mb-1 block text-[var(--ink-muted)]`}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1 min-w-[80px]">
              <label className={`text-xs font-medium mb-1 block text-[var(--ink-muted)]`}>Value ({resolvedUnit})</label>
              <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className={inputCls} />
            </div>
            <div className="flex-1 min-w-[90px]">
              <label className={`text-xs font-medium mb-1 block text-[var(--ink-muted)]`}>Note</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="optional" className={inputCls} />
            </div>
            <button type="button" onClick={handleAdd} className="btn-primary px-4 py-2 rounded-sm text-sm flex-shrink-0">Save</button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="border-t border-[var(--rule)] pt-3 text-sm text-[var(--ink-muted)]">
          Log a health signal to start a private trend line.
        </p>
      )}

      {/* Metric type tabs */}
      {metricTypes.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {metricTypes.filter(t => entries.some(e => e.metricType === t)).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveMetric(t)}
              className={`px-3 py-1 rounded-sm text-xs font-medium whitespace-nowrap transition-colors ${
                viewMetric === t
                  ? 'bg-[var(--action-soft)] text-[var(--action)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
              style={viewMetric === t ? { borderBottom: `2px solid ${CHART_COLORS[i % CHART_COLORS.length]}` } : undefined}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      {metricEntries.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-3">
          <div>
            <p className={`text-xs text-[var(--ink-muted)]`}>Latest</p>
            <p className={`text-base font-bold text-[var(--ink)]`}>{latest?.value} {unit}</p>
          </div>
          {change !== null && (
            <div>
              <p className={`text-xs text-[var(--ink-muted)]`}>Change</p>
              <p className={`text-base font-bold flex items-center gap-1 ${
                change < 0 ? ('text-[var(--success)]') : change > 0 ? ('text-[var(--danger)]') : ('text-[var(--ink-muted)]')
              }`}>
                {change < 0 ? <TrendingDown size={14} /> : change > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
                {change > 0 ? '+' : ''}{change} {unit}
              </p>
            </div>
          )}
          <div>
            <p className={`text-xs text-[var(--ink-muted)]`}>Entries</p>
            <p className={`text-base font-bold text-[var(--ink)]`}>{metricEntries.length}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} stroke="var(--rule-strong)" />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} stroke="var(--rule-strong)" />
              <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--rule-strong)', color: 'var(--ink)' }} />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[metricTypes.indexOf(viewMetric) % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} name={viewMetric} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : metricEntries.length > 0 ? (
        <p className={`text-sm text-center py-4 text-[var(--ink-muted)]`}>
          One more entry to see the trend.
        </p>
      ) : null}
      {/* With no entries at all there is nothing to explain: the heading and the
          Log button already say what this is, so the placeholder only added
          height. The one-entry case above is worth keeping, because there the
          absence of a chart genuinely needs accounting for. */}

      {/* Recent entries */}
      {metricEntries.length > 0 && (
        <div className="mt-3 space-y-1">
          {[...metricEntries].reverse().slice(0, 5).map(entry => (
            <div key={entry.id} className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs bg-[var(--surface)]`}>
              <span className={`flex-shrink-0 text-[var(--ink-muted)]`}>
                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className={`font-medium text-[var(--ink)]`}>{entry.value} {entry.unit}</span>
              {entry.note && <span className={`truncate text-[var(--ink-muted)]`}>{entry.note}</span>}
              <button type="button" onClick={() => handleDelete(entry.id)} className={`ml-auto p-1 rounded text-[var(--ink-muted)] hover:text-[var(--danger)]`}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
