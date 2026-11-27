import { useId } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export const BentoTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0A0A0A] text-white border border-white/15 px-3 py-2 shadow-xl text-xs">
      {label && <div className="font-mono text-[10px] uppercase tracking-wider text-white/60 mb-1">{label}</div>}
      <div className="space-y-0.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 font-mono tabular-nums">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || '#10B981' }}
              aria-hidden="true"
            />
            <span className="text-white/80">{entry.name}:</span>
            <span className="font-semibold text-white">
              {entry.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BentoAreaChart = ({
  data = [],
  dataKey = 'value',
  secondaryKey,
  xKey = 'label',
  name = 'Activity',
  secondaryName = 'Sessions',
  suffix = '',
  height = 220,
  emptyLabel = 'No telemetry data available yet.',
}) => {
  const gradId = useId().replace(/:/g, '');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tickColor = isDark ? '#A1A1AA' : '#71717A';
  const gridColor = isDark ? '#FFFFFF' : '#E4E4E7';

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs font-mono text-ink-muted border border-dashed border-line rounded-xl"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }} className="overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`emeraldGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.14} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            {secondaryKey && (
              <linearGradient id={`slateGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid stroke={gridColor} strokeOpacity={0.12} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          />
          <Tooltip content={<BentoTooltip suffix={suffix} />} />
          {secondaryKey && (
            <Area
              type="monotone"
              dataKey={secondaryKey}
              name={secondaryName}
              stroke="#94A3B8"
              strokeWidth={1.25}
              fillOpacity={1}
              fill={`url(#slateGrad-${gradId})`}
            />
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke="#10B981"
            strokeWidth={1.5}
            fillOpacity={1}
            fill={`url(#emeraldGrad-${gradId})`}
            activeDot={{ r: 4, fill: '#10B981', stroke: isDark ? '#111615' : '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BentoDonutChart = ({
  data = [],
  height = 176,
  emptyLabel = 'No distribution data.',
}) => {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs font-mono text-ink-muted border border-dashed border-line rounded-xl"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div style={{ width: '100%', height }} className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="72%"
              outerRadius="88%"
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<BentoTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display font-bold text-2xl text-[#0A0A0A] dark:text-[#F4F4F5] tabular-nums tracking-[-0.03em] leading-none">
            {total}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mt-1">
            Total
          </span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/15"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="text-zinc-500 dark:text-zinc-400 truncate">{item.name}</span>
              </div>
              <div className="font-mono tabular-nums text-[#0A0A0A] dark:text-[#F4F4F5] font-medium shrink-0">
                {item.value}{' '}
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
