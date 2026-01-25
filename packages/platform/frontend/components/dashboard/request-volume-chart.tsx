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
} from 'recharts';
import { ChartCard } from './chart-card';
import { Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface DailyStats {
  date: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  p95ResponseTime?: number;
}

interface RequestVolumeChartProps {
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

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0]?.payload as DailyStats | undefined;
  const date = dataPoint?.date ? format(parseISO(dataPoint.date), 'MMM d, yyyy') : '';
  const total = dataPoint?.totalRequests ?? 0;
  const success = dataPoint?.successCount ?? 0;
  const errors = dataPoint?.errorCount ?? 0;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-xl shadow-black/10">
      <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-8">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-sm font-semibold tabular-nums">{total.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">Success</span>
          </div>
          <span className="text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
            {success.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-sm text-muted-foreground">Errors</span>
          </div>
          <span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-400">
            {errors.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RequestVolumeChart({ data, className }: RequestVolumeChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateFormatted: format(parseISO(d.date), 'MMM d'),
    }));
  }, [data]);

  const totalRequests = useMemo(() => {
    return data.reduce((sum, d) => sum + d.totalRequests, 0);
  }, [data]);

  return (
    <ChartCard
      title="Request Volume"
      description={`${totalRequests.toLocaleString()} requests in the last 7 days`}
      icon={Activity}
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
                <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
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
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                width={50}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: 'hsl(var(--muted-foreground))',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
              />
              <Area
                type="monotone"
                dataKey="totalRequests"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#gradientTotal)"
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="successCount"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradientSuccess)"
                animationDuration={1200}
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
