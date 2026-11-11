import React from 'react';

export interface BarDatum {
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
  secondaryColor?: string;
}

export interface PieDatum {
  label: string;
  value: number;
  color: string;
}

export interface TimePoint {
  date: string;
  value: number;
}

// 1. CLEAN SVG BAR CHART (Horizontal progress bars)
export const SimpleBarChart: React.FC<{
  data: BarDatum[];
  isDarkMode?: boolean;
  maxBars?: number;
  valueFormatter?: (val: number) => string;
}> = ({ data, isDarkMode = true, maxBars = 10, valueFormatter = (v) => v.toLocaleString() }) => {
  const displayData = data.slice(0, maxBars);
  const maxValue = Math.max(...displayData.map((d) => Math.max(d.value, d.secondaryValue || 0)), 1);

  if (displayData.length === 0) {
    return (
      <div className={`py-6 text-center text-xs ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
        -
      </div>
    );
  }

  return (
    <div className="space-y-2.5 w-full">
      {displayData.map((item, idx) => {
        const pct = Math.min(100, Math.max(2, (item.value / maxValue) * 100));
        const secPct = item.secondaryValue !== undefined ? Math.min(100, Math.max(0, (item.secondaryValue / maxValue) * 100)) : null;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold truncate max-w-[220px] ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {item.label}
              </span>
              <span className="font-mono text-[11px] font-bold text-zinc-400 shrink-0 ml-2">
                {valueFormatter(item.value)}
                {item.secondaryValue !== undefined && ` / ${valueFormatter(item.secondaryValue)}`}
              </span>
            </div>
            <div className={`h-2.5 w-full rounded-full overflow-hidden flex ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100'}`}>
              <div
                style={{ width: `${pct}%` }}
                className={`h-full rounded-full transition-all duration-300 ${item.color || 'bg-blue-600'}`}
              />
              {secPct !== null && secPct > 0 && (
                <div
                  style={{ width: `${secPct}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${item.secondaryColor || 'bg-amber-500'}`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 2. CLEAN SVG DONUT CHART WITH INSET / COMPACT LEGEND
export const DonutChart: React.FC<{
  data: PieDatum[];
  isDarkMode?: boolean;
  size?: number;
  strokeWidth?: number;
  totalLabel?: string;
  valueFormatter?: (val: number) => string;
}> = ({ data, isDarkMode = true, size = 140, strokeWidth = 20, totalLabel, valueFormatter = (v) => v.toLocaleString() }) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  if (total === 0) {
    return (
      <div className="py-6 text-center text-xs text-zinc-500">
        -
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={isDarkMode ? '#27272a' : '#e4e4e7'}
            strokeWidth={strokeWidth}
          />
          {data.map((item, idx) => {
            if (item.value <= 0) return null;
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = `-${(currentAngle + 90) / 360 * circumference}`;
            currentAngle += (item.value / total) * 360;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-sm font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            {valueFormatter(total)}
          </span>
          {totalLabel && (
            <span className="text-[9px] uppercase font-bold text-zinc-500 mt-0.5">
              {totalLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 w-full space-y-1.5">
        {data.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={idx} className={`flex items-center justify-between text-xs py-1 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
              <div className="flex items-center space-x-2 truncate pr-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className={`font-semibold truncate ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {item.label}
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="font-mono text-zinc-400 font-bold text-[11px]">
                  {valueFormatter(item.value)}
                </span>
                <span className="font-mono text-zinc-500 text-[10px] w-10 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. CLEAN SVG SPARKLINE / AREA CHART FOR TIME SERIES
export const TimeSeriesAreaChart: React.FC<{
  points: TimePoint[];
  height?: number;
  isDarkMode?: boolean;
  valueFormatter?: (val: number) => string;
  primaryColor?: string;
}> = ({ points, height = 160, isDarkMode = true, valueFormatter = (v) => v.toLocaleString(), primaryColor = '#3b82f6' }) => {
  if (points.length < 2) {
    return (
      <div className="py-8 text-center text-xs text-zinc-600">
        -
      </div>
    );
  }

  const values = points.map(p => p.value);
  const minVal = 0;
  const maxVal = Math.max(...values, 1);
  const paddingX = 20;
  const paddingY = 20;
  const chartWidth = 500;
  const chartHeight = height;

  const getX = (i: number) => paddingX + (i / (points.length - 1)) * (chartWidth - 2 * paddingX);
  const getY = (val: number) => chartHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (chartHeight - 2 * paddingY);

  const pathCoords = points.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' L ');
  const areaPath = `M ${getX(0)},${chartHeight - paddingY} L ${pathCoords} L ${getX(points.length - 1)},${chartHeight - paddingY} Z`;
  const linePath = `M ${pathCoords}`;

  return (
    <div className="w-full space-y-2">
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = chartHeight - paddingY - pct * (chartHeight - 2 * paddingY);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke={isDarkMode ? '#27272a' : '#e4e4e7'}
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX}
                  y={y - 4}
                  fill={isDarkMode ? '#71717a' : '#a1a1aa'}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {valueFormatter(minVal + pct * (maxVal - minVal))}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#areaGradient)" />
          <path d={linePath} fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />

          {/* Dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(p.value)}
              r="3"
              fill={primaryColor}
              stroke={isDarkMode ? '#09090b' : '#ffffff'}
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-2">
        <span>{points[0]?.date}</span>
        <span>{points[Math.floor(points.length / 2)]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
};
