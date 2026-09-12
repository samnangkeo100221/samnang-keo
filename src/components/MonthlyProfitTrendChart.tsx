import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SaleItem } from '../types';
import { formatUSD, formatKHR } from '../services/storage';

interface MonthlyProfitTrendChartProps {
  sales: SaleItem[];
}

interface MonthData {
  monthStr: string;
  displayMonth: string;
  profitUSD: number;
  profitKHR: number;
}

export const MonthlyProfitTrendChart: React.FC<MonthlyProfitTrendChartProps> = ({ sales }) => {
  const chartData = useMemo(() => {
    const dataMap: Record<string, MonthData> = {};

    sales.forEach((s) => {
      const date = new Date(s.saleDate);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const monthStr = `${yyyy}-${mm}`;

      if (!dataMap[monthStr]) {
        // Khmer short months
        const khmerMonths = [
          'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
          'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
        ];
        const displayMonth = `${khmerMonths[date.getMonth()]} ${yyyy}`;
        
        dataMap[monthStr] = {
          monthStr,
          displayMonth,
          profitUSD: 0,
          profitKHR: 0,
        };
      }

      dataMap[monthStr].profitUSD += s.profitUSD;
      dataMap[monthStr].profitKHR += s.profitKHR;
    });

    // Convert map to array and sort by month string ascending
    const sortedData = Object.values(dataMap).sort((a, b) => a.monthStr.localeCompare(b.monthStr));
    
    // Keep last 12 months if there are many
    return sortedData.slice(-12).map(d => ({
      ...d,
      profitUSD: Number(d.profitUSD.toFixed(2)),
      profitKHR: Math.round(d.profitKHR)
    }));
  }, [sales]);

  if (chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1C212B] border border-[#2D333E] rounded-xl p-3 shadow-2xl">
          <p className="text-white font-bold text-xs mb-2 border-b border-[#2D333E] pb-1.5">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-[11px] font-mono">
                <span style={{ color: entry.color }} className="font-semibold">
                  {entry.name}:
                </span>
                <span className="text-white font-bold">
                  {entry.dataKey === 'profitUSD'
                    ? formatUSD(entry.value)
                    : formatKHR(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#161920] border border-[#2D333E] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          របាយការណ៍ប្រាក់ចំណេញប្រចាំខែ (Monthly Profit)
        </h3>
      </div>
      
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D333E" vertical={false} />
            <XAxis
              dataKey="displayMonth"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#2D333E' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#3B82F6"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#2D333E' }}
              tickFormatter={(val) => `$${val}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10B981"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#2D333E' }}
              tickFormatter={(val) => `${Math.round(val / 1000)}k៛`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2D333E', opacity: 0.4 }} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 12, fontSize: '11px' }}
            />
            <Bar
              yAxisId="left"
              name="ចំណេញសុទ្ធ ($)"
              dataKey="profitUSD"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              name="ចំណេញសុទ្ធ (៛)"
              dataKey="profitKHR"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
