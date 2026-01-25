'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from './chart-card';
import { CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { DailyStats } from './request-volume-chart';

interface SuccessRateChartProps {
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
    payload: {
      date: string;
      successCount: number;
      totalRequests: number;
    };
  }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0]?.payload;
  const date = dataPoint?.date ? format(parseISO(dataPoint.date), 'MMM d, yyyy') : '';
  const rate = payload[0]?.value ?? 0;
  const { successCount = 0, totalRequests = 0 } = dataPoint ?? {};

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-xl shadow-black/10">
      <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-8">
          <span className="text-sm text-muted-foreground">Success Rate</span>
          <span className={`text-sm font-semibold tabular-nums ${
            rate >= 99 ? 'text-emerald-600 dark:text-emerald-400' :
            rate >= 95 ? 'text-amber-600 dark:text-amber-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {rate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <span className="text-sm text-muted-foreground">Successful</span>
          <span className="text-sm font-medium tabular-nums">
            {successCount.toLocaleString()} / {totalRequests.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SuccessRateChart({ data, className }: SuccessRateChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateFormatted: format(parseISO(d.date), 'MMM d'),
      successRate: d.totalRequests > 0
        ? (d.successCount / d.totalRequests) * 100
        : 100,
    }));
  }, [data]);

  const averageRate = useMemo(() => {
    const totalSuccess = data.reduce((sum, d) => sum + d.successCount, 0);
    const totalRequests = data.reduce((sum, d) => sum + d.totalRequests, 0);
    return totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 100;
  }, [data]);

  const rateColor = averageRate >= 99 ? 'text-emerald-600 dark:text-emerald-400' :
    averageRate >= 95 ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  return (
    <ChartCard
      title="Success Rate"
      description={
        <span>
          Average: <span className={`font-semibold ${rateColor}`}>{averageRate.toFixed(1)}%</span>
        </span>
      }
      icon={CheckCircle2}
      className={className}
    >
      <div className="h-[280px] w-full">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="successRateGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#10b981" />
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
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin - 5)),
                  100
                ]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
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
              {/* Target line at 99% */}
              <ReferenceLine
                y={99}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: 'Target 99%',
                  position: 'insideTopRight',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="successRate"
                stroke="url(#successRateGradient)"
                strokeWidth={2.5}
                dot={{
                  fill: 'hsl(var(--background))',
                  stroke: '#10b981',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  fill: '#10b981',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                  r: 6,
                }}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded bg-muted/50" />
        )}
      </div>
    </ChartCard>
  );
}
