import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  DollarSign,
  CircleDollarSign,
  ArrowUpRight,
  Percent,
  Sparkles,
} from 'lucide-react';
import { SaleItem, ExchangeRateConfig } from '../types';
import { formatUSD, formatKHR } from '../services/storage';

interface SalesTrendProfitChartProps {
  sales: SaleItem[];
  exchangeRate: ExchangeRateConfig;
}

type CurrencyMode = 'USD' | 'KHR' | 'DUAL';
type ChartType = 'area' | 'bar';

interface DayData {
  dateStr: string;
  displayDate: string;
  fullDateKh: string;
  salesUSD: number;
  salesKHR: number;
  costUSD: number;
  costKHR: number;
  profitUSD: number;
  profitKHR: number;
  orderCount: number;
  marginPercent: number;
}

export const SalesTrendProfitChart: React.FC<SalesTrendProfitChartProps> = ({
  sales,
  exchangeRate,
}) => {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('USD');
  const [chartType, setChartType] = useState<ChartType>('area');

  const buyRate = exchangeRate.buyRate || 4043;
  const sellRate = exchangeRate.sellRate || 4057;

  // Build continuous 30-day timeline ending today
  const { chartData, summary30Days } = useMemo(() => {
    const data: DayData[] = [];
    const now = new Date();

    let totalSalesUSD = 0;
    let totalSalesKHR = 0;
    let totalCostUSD = 0;
    let totalCostKHR = 0;
    let totalProfitUSD = 0;
    let totalProfitKHR = 0;
    let totalOrders = 0;
    let peakDay = { date: '', amountUSD: 0, amountKHR: 0 };

    // 30 days from 29 days ago up to today (0)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const displayDate = `${dd}/${mm}`;

      // Khmer month names for tooltip
      const khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
      ];
      const fullDateKh = `ថ្ងៃទី ${dd} ${khmerMonths[d.getMonth()]} ${yyyy}`;

      // Filter sales matching this day
      const daySales = sales.filter((s) => s.saleDate.slice(0, 10) === dateStr);

      const daySalesUSD = daySales.reduce((sum, s) => sum + s.totalSaleUSD, 0);
      const daySalesKHR = daySales.reduce((sum, s) => sum + s.totalSaleKHR, 0);
      const dayCostUSD = daySales.reduce((sum, s) => sum + s.totalCostUSD, 0);
      const dayCostKHR = daySales.reduce((sum, s) => sum + s.totalCostKHR, 0);
      const dayProfitUSD = daySales.reduce((sum, s) => sum + s.profitUSD, 0);
      const dayProfitKHR = daySales.reduce((sum, s) => sum + s.profitKHR, 0);
      const orderCount = daySales.length;
      const marginPercent =
        daySalesUSD > 0 ? Number(((dayProfitUSD / daySalesUSD) * 100).toFixed(1)) : 0;

      // Accumulate 30-day totals
      totalSalesUSD += daySalesUSD;
      totalSalesKHR += daySalesKHR;
      totalCostUSD += dayCostUSD;
      totalCostKHR += dayCostKHR;
      totalProfitUSD += dayProfitUSD;
      totalProfitKHR += dayProfitKHR;
      totalOrders += orderCount;

      if (daySalesUSD > peakDay.amountUSD) {
        peakDay = { date: displayDate, amountUSD: daySalesUSD, amountKHR: daySalesKHR };
      }

      data.push({
        dateStr,
        displayDate,
        fullDateKh,
        salesUSD: Number(daySalesUSD.toFixed(2)),
        salesKHR: Math.round(daySalesKHR),
        costUSD: Number(dayCostUSD.toFixed(2)),
        costKHR: Math.round(dayCostKHR),
        profitUSD: Number(dayProfitUSD.toFixed(2)),
        profitKHR: Math.round(dayProfitKHR),
        orderCount,
        marginPercent,
      });
    }

    const overallMargin =
      totalSalesUSD > 0 ? Number(((totalProfitUSD / totalSalesUSD) * 100).toFixed(1)) : 0;
    const avgDailySalesUSD = totalSalesUSD / 30;
    const avgDailySalesKHR = totalSalesKHR / 30;

    return {
      chartData: data,
      summary30Days: {
        totalSalesUSD,
        totalSalesKHR,
        totalCostUSD,
        totalCostKHR,
        totalProfitUSD,
        totalProfitKHR,
        totalOrders,
        overallMargin,
        avgDailySalesUSD,
        avgDailySalesKHR,
        peakDay,
      },
    };
  }, [sales]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data: DayData = payload[0].payload;

    return (
      <div className="rounded-xl border border-[#2D333E] bg-[#12151B] p-3 shadow-2xl text-xs space-y-2 min-w-[210px]">
        <div className="border-b border-[#2D333E] pb-1.5 flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            {data.fullDateKh}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {data.orderCount} ប្រតិបត្តិការ
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Sales Revenue */}
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              ចំណូលលក់ (Sales):
            </span>
            <div className="text-right">
              <span className="font-bold text-emerald-400 font-mono">
                {formatUSD(data.salesUSD)}
              </span>
              <span className="text-[10px] text-emerald-300/80 block font-mono">
                {formatKHR(data.salesKHR)}
              </span>
            </div>
          </div>

          {/* Cost of Goods Sold */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              ថ្លៃដើម (COGS):
            </span>
            <div className="text-right">
              <span className="font-medium text-slate-300 font-mono">
                {formatUSD(data.costUSD)}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                {formatKHR(data.costKHR)}
              </span>
            </div>
          </div>

          {/* Net Profit */}
          <div className="border-t border-[#2D333E]/70 pt-1.5 flex items-center justify-between bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20">
            <span className="text-blue-300 flex items-center gap-1.5 font-bold">
              <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
              ប្រាក់ចំណេញសុទ្ធ:
            </span>
            <div className="text-right">
              <span className="font-black text-blue-400 font-mono">
                +{formatUSD(data.profitUSD)}
              </span>
              <span className="text-[10px] font-bold text-blue-300 block font-mono">
                +{formatKHR(data.profitKHR)}
              </span>
            </div>
          </div>

          {/* Margin */}
          <div className="flex items-center justify-between pt-0.5 text-[11px]">
            <span className="text-slate-400">អត្រាចំណេញ (Margin):</span>
            <span className="font-bold text-emerald-400 font-mono">
              {data.marginPercent}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-[#2D333E] bg-[#161920] p-4 sm:p-5 shadow-lg space-y-4">
      {/* HEADER SECTION: Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2D333E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>និន្នាការលក់ និងការវិភាគប្រាក់ចំណេញ ៣០ ថ្ងៃចុងក្រោយ</span>
              <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono text-blue-300">
                Last 30 Days
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            តាមដានកំណើនចំណូលលក់ ថ្លៃដើម និងប្រាក់ចំណេញសុទ្ធជារៀងរាល់ថ្ងៃជាប្រាក់ដុល្លារ ($) និងប្រាក់រៀល (៛)
          </p>
        </div>

        {/* CONTROLS: Currency & Chart Type Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Switcher */}
          <div className="flex items-center rounded-xl bg-[#0F1115] border border-[#2D333E] p-1 text-xs">
            <button
              type="button"
              onClick={() => setCurrencyMode('USD')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                currencyMode === 'USD'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>USD ($)</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode('KHR')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                currencyMode === 'KHR'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CircleDollarSign className="h-3.5 w-3.5" />
              <span>KHR (៛)</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode('DUAL')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                currencyMode === 'DUAL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>$ / ៛ ទ្វេ</span>
            </button>
          </div>

          {/* Chart Type Switcher */}
          <div className="flex items-center rounded-xl bg-[#0F1115] border border-[#2D333E] p-1 text-xs">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chartType === 'area'
                  ? 'bg-[#1C212B] text-blue-400 border border-blue-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>និន្នាការ (Area)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chartType === 'bar'
                  ? 'bg-[#1C212B] text-emerald-400 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>ជួរឈរ (Bar)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 30-DAY STATS MINI-CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. 30-Day Sales */}
        <div className="rounded-xl border border-[#2D333E] bg-[#12151B] p-3">
          <span className="text-[11px] font-semibold text-emerald-400 block">
            ចំណូលលក់ ៣០ ថ្ងៃ
          </span>
          <div className="mt-1 text-lg sm:text-xl font-black text-emerald-400 font-mono">
            {formatUSD(summary30Days.totalSalesUSD)}
          </div>
          <div className="text-[11px] font-semibold text-emerald-300 font-mono">
            {formatKHR(summary30Days.totalSalesKHR)}
          </div>
        </div>

        {/* 2. 30-Day Net Profit */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3">
          <span className="text-[11px] font-bold text-blue-300 block flex items-center justify-between">
            <span>ចំណេញសុទ្ធ ៣០ ថ្ងៃ</span>
            <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.2 rounded font-mono">
              {summary30Days.overallMargin}%
            </span>
          </span>
          <div className="mt-1 text-lg sm:text-xl font-black text-blue-400 font-mono">
            +{formatUSD(summary30Days.totalProfitUSD)}
          </div>
          <div className="text-[11px] font-black text-blue-300 font-mono">
            +{formatKHR(summary30Days.totalProfitKHR)}
          </div>
        </div>

        {/* 3. Daily Average */}
        <div className="rounded-xl border border-[#2D333E] bg-[#12151B] p-3">
          <span className="text-[11px] font-semibold text-slate-400 block">
            មធ្យមភាគលក់ / ថ្ងៃ
          </span>
          <div className="mt-1 text-base sm:text-lg font-bold text-white font-mono">
            {formatUSD(summary30Days.avgDailySalesUSD)}
          </div>
          <div className="text-[11px] font-medium text-slate-400 font-mono">
            {formatKHR(summary30Days.avgDailySalesKHR)}
          </div>
        </div>

        {/* 4. Peak Day */}
        <div className="rounded-xl border border-[#2D333E] bg-[#12151B] p-3">
          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>ថ្ងៃលក់ដាច់បំផុត</span>
          </span>
          <div className="mt-1 text-base sm:text-lg font-bold text-amber-300 font-mono">
            {summary30Days.peakDay.date || '---'}
          </div>
          <div className="text-[11px] font-semibold text-amber-400 font-mono">
            {formatUSD(summary30Days.peakDay.amountUSD)}
          </div>
        </div>
      </div>

      {/* CHART CANVAS */}
      <div className="w-full h-[320px] sm:h-[360px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {/* Sales Gradient (Emerald) */}
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                {/* Profit Gradient (Blue) */}
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                {/* Cost Gradient (Amber) */}
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#2D333E" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#2D333E' }}
              />

              {currencyMode === 'DUAL' ? (
                <>
                  <YAxis
                    yAxisId="left"
                    stroke="#10B981"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#2D333E' }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#3B82F6"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#2D333E' }}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k៛`}
                  />
                </>
              ) : (
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#2D333E' }}
                  tickFormatter={(val) =>
                    currencyMode === 'USD' ? `$${val}` : `${Math.round(val / 1000)}k៛`
                  }
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: '11px' }}
                iconType="circle"
              />

              {/* Area for Sales Revenue */}
              <Area
                type="monotone"
                name={currencyMode === 'KHR' ? 'ចំណូលលក់ (៛)' : 'ចំណូលលក់ ($)'}
                dataKey={currencyMode === 'KHR' ? 'salesKHR' : 'salesUSD'}
                yAxisId={currencyMode === 'DUAL' ? 'left' : undefined}
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSales)"
              />

              {/* Area for Net Profit */}
              <Area
                type="monotone"
                name={
                  currencyMode === 'KHR'
                    ? 'ប្រាក់ចំណេញសុទ្ធ (៛)'
                    : currencyMode === 'DUAL'
                    ? 'ប្រាក់ចំណេញ (៛)'
                    : 'ប្រាក់ចំណេញសុទ្ធ ($)'
                }
                dataKey={
                  currencyMode === 'KHR' || currencyMode === 'DUAL' ? 'profitKHR' : 'profitUSD'
                }
                yAxisId={currencyMode === 'DUAL' ? 'right' : undefined}
                stroke="#3B82F6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorProfit)"
              />

              {/* Area for Cost of Goods */}
              <Area
                type="monotone"
                name={currencyMode === 'KHR' ? 'ថ្លៃដើមទំនិញ (៛)' : 'ថ្លៃដើមទំនិញ ($)'}
                dataKey={currencyMode === 'KHR' ? 'costKHR' : 'costUSD'}
                yAxisId={currencyMode === 'DUAL' ? 'left' : undefined}
                stroke="#F59E0B"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorCost)"
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D333E" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#2D333E' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#2D333E' }}
                tickFormatter={(val) =>
                  currencyMode === 'USD' ? `$${val}` : `${Math.round(val / 1000)}k៛`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: '11px' }}
              />
              <Bar
                name={currencyMode === 'KHR' ? 'ចំណូលលក់ (៛)' : 'ចំណូលលក់ ($)'}
                dataKey={currencyMode === 'KHR' ? 'salesKHR' : 'salesUSD'}
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name={currencyMode === 'KHR' ? 'ថ្លៃដើម (៛)' : 'ថ្លៃដើម ($)'}
                dataKey={currencyMode === 'KHR' ? 'costKHR' : 'costUSD'}
                fill="#F59E0B"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name={currencyMode === 'KHR' ? 'ចំណេញសុទ្ធ (៛)' : 'ចំណេញសុទ្ធ ($)'}
                dataKey={currencyMode === 'KHR' ? 'profitKHR' : 'profitUSD'}
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* FOOTER HELPER INFO */}
      <div className="border-t border-[#2D333E] pt-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-emerald-400 font-medium">
            * គណនាតាមអត្រាធនាគារ អេស៊ីលីដា៖
          </span>
          <span className="text-[11px] text-slate-300 font-mono">
            ទិញ (Buy) = {buyRate.toLocaleString('km-KH')}៛
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-300 font-mono">
            លក់ (Sell) = {sellRate.toLocaleString('km-KH')}៛
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          បង្ហាញសរុប {chartData.length} ថ្ងៃបន្តបន្ទាប់ (Continuous 30-Day Rolling Window)
        </div>
      </div>
    </div>
  );
};
