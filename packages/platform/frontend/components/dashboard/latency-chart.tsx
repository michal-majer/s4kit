'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from './chart-card';
import { Timer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { DailyStats } from './request-volume-chart';

interface LatencyChartProps {
  data: DailyStats[];
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: { date: string };
  }>;
  label?: string;
}

function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0]?.payload;
  const date = dataPoint?.date ? format(parseISO(dataPoint.date), 'MMM d, yyyy') : '';
  const avg = payload.find(p => p.dataKey === 'avgResponseTime')?.value ?? 0;
  const p95 = payload.find(p => p.dataKey === 'p95ResponseTime')?.value ?? 0;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-xl shadow-black/10">
      <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span className="text-sm text-muted-foreground">Average</span>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatMs(avg)}</span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
            <span className="text-sm text-muted-foreground">P95</span>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatMs(p95)}</span>
        </div>
      </div>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    dataKey: string;
  }>;
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;

  const labels: Record<string, string> = {
    avgResponseTime: 'Average',
    p95ResponseTime: 'P95',
  };

  return (
    <div className="flex items-center justify-center gap-6 pt-2">
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">
            {labels[entry.dataKey] || entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LatencyChart({ data, className }: LatencyChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateFormatted: format(parseISO(d.date), 'MMM d'),
      p95ResponseTime: d.p95ResponseTime ?? d.avgResponseTime * 1.5,
    }));
  }, [data]);

  const avgLatency = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.avgResponseTime, 0);
    return total / data.length;
  }, [data]);

  return (
    <ChartCard
      title="Response Latency"
      description={`Average: ${formatMs(avgLatency)}`}
      icon={Timer}
      className={className}
    >
      <div className="h-[280px] w-full">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradientAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientP95" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="dateFormatted"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => formatMs(value)}
                width={55}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: 'hsl(var(--muted-foreground))',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
              />
              <Legend content={<CustomLegend />} />
              {/* P95 first so it renders behind */}
              <Area
                type="monotone"
                dataKey="p95ResponseTime"
                stroke="hsl(var(--chart-4))"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="url(#gradientP95)"
                animationDuration={1200}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="avgResponseTime"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fill="url(#gradientAvg)"
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded bg-muted/50" />
        )}
      </div>
    </ChartCard>
  );
}
