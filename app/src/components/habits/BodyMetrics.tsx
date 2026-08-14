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
import { useTheme } from '../../context/ThemeContext';
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

const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4'];

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
  }`;

  return (
    <div className="card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
          <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Metrics</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
            isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'Log'}
        </button>
      </div>

      {showForm && (
        <div className={`mb-4 p-3 rounded-xl border space-y-2 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[120px]">
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Metric</label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={inputCls}>
                {PRESET_METRICS.map(p => <option key={p.type} value={p.type}>{p.type} ({p.unit})</option>)}
                <option value="__custom">+ Custom...</option>
              </select>
            </div>
            {isCustom && (
              <>
                <div className="flex-1 min-w-[80px]">
                  <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Name</label>
                  <input type="text" value={customType} onChange={e => setCustomType(e.target.value)} placeholder="e.g. Resting HR" className={inputCls} />
                </div>
                <div className="w-20">
                  <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Unit</label>
                  <input type="text" value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="bpm" className={inputCls} />
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[90px]">
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1 min-w-[80px]">
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Value ({resolvedUnit})</label>
              <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className={inputCls} />
            </div>
            <div className="flex-1 min-w-[90px]">
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Note</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="optional" className={inputCls} />
            </div>
            <button type="button" onClick={handleAdd} className="btn-primary px-4 py-2 rounded-lg text-sm flex-shrink-0">Save</button>
          </div>
        </div>
      )}

      {/* Metric type tabs */}
      {metricTypes.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {metricTypes.filter(t => entries.some(e => e.metricType === t)).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveMetric(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                viewMetric === t
                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'
                  : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
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
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Latest</p>
            <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{latest?.value} {unit}</p>
          </div>
          {change !== null && (
            <div>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Change</p>
              <p className={`text-base font-bold flex items-center gap-1 ${
                change < 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : change > 0 ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-gray-400' : 'text-slate-500')
              }`}>
                {change < 0 ? <TrendingDown size={14} /> : change > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
                {change > 0 ? '+' : ''}{change} {unit}
              </p>
            </div>
          )}
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Entries</p>
            <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{metricEntries.length}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={isDark ? '#52525b' : '#94a3b8'} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10 }} stroke={isDark ? '#52525b' : '#94a3b8'} />
              <Tooltip contentStyle={isDark ? { background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)' } : {}} />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[metricTypes.indexOf(viewMetric) % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} name={viewMetric} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          {metricEntries.length === 0 ? `Log ${viewMetric.toLowerCase()} to see a trend.` : 'One more entry to see the trend.'}
        </p>
      )}

      {/* Recent entries */}
      {metricEntries.length > 0 && (
        <div className="mt-3 space-y-1">
          {[...metricEntries].reverse().slice(0, 5).map(entry => (
            <div key={entry.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
              <span className={`flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{entry.value} {entry.unit}</span>
              {entry.note && <span className={`truncate ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{entry.note}</span>}
              <button type="button" onClick={() => handleDelete(entry.id)} className={`ml-auto p-0.5 rounded ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
