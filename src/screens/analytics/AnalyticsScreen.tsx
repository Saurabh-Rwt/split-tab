import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import Svg, {
  Rect, Circle, Path, Text as SvgText,
  G, Line,
} from 'react-native-svg';
import dayjs from 'dayjs';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { useAppSelector } from '../../store';
import { selectAllExpenses }          from '../../store/slices/expensesSlice';
import { selectUser }                 from '../../store/slices/authSlice';
import { selectRates, convertAmount } from '../../store/slices/currencySlice';
import { getCurrencySymbol, CATEGORY_COLORS, EXPENSE_CATEGORIES } from '../../constants/currencies';
import { OfflineBadge } from '../../components/common/OfflineBadge';
import { ExpenseCategory } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH  = SCREEN_WIDTH - Spacing.base * 2;

//  Bar Chart

interface BarChartProps {
  data:   { label: string; value: number }[];
  symbol: string;
}

const BarChart = ({ data, symbol }: BarChartProps) => {
  const H          = 200;
  const PADDING    = { top: 20, bottom: 40, left: 48, right: 16 };
  const chartH     = H - PADDING.top - PADDING.bottom;
  const chartW     = CHART_WIDTH - PADDING.left - PADDING.right;
  const maxVal     = Math.max(...data.map(d => d.value), 1);
  const barWidth   = chartW / data.length;
  const barPad     = barWidth * 0.25;

  return (
    <Svg width={CHART_WIDTH} height={H}>
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = PADDING.top + chartH * (1 - pct);
        return (
          <G key={i}>
            <Line
              x1={PADDING.left} y1={y}
              x2={PADDING.left + chartW} y2={y}
              stroke={Colors.border} strokeWidth={1}
            />
            <SvgText
              x={PADDING.left - 6} y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill={Colors.textMuted}>
              {symbol}{Math.round(maxVal * pct)}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH  = (d.value / maxVal) * chartH;
        const x     = PADDING.left + i * barWidth + barPad;
        const y     = PADDING.top + chartH - barH;
        const w     = barWidth - barPad * 2;
        const isMax = d.value === maxVal && d.value > 0;

        return (
          <G key={i}>
            {/* Bar */}
            <Rect
              x={x} y={y}
              width={w} height={barH}
              rx={4}
              fill={isMax ? Colors.primary : Colors.primary + '66'}
            />
            {/* Value label on top of tallest bar */}
            {isMax && d.value > 0 && (
              <SvgText
                x={x + w / 2} y={y - 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="700"
                fill={Colors.primary}>
                {symbol}{Math.round(d.value)}
              </SvgText>
            )}
            {/* Month label */}
            <SvgText
              x={x + w / 2}
              y={PADDING.top + chartH + 16}
              textAnchor="middle"
              fontSize={10}
              fill={Colors.textSecondary}>
              {d.label}
            </SvgText>
          </G>
        );
      })}

      {/* Y-axis line */}
      <Line
        x1={PADDING.left} y1={PADDING.top}
        x2={PADDING.left} y2={PADDING.top + chartH}
        stroke={Colors.border} strokeWidth={1}
      />
    </Svg>
  );
};

//  Doughnut Chart
interface DonutSlice { category: ExpenseCategory; value: number; pct: number }

interface DonutChartProps {
  slices: DonutSlice[];
  total:  number;
  symbol: string;
}

const DonutChart = ({ slices, total, symbol }: DonutChartProps) => {
  const SIZE    = 180;
  const CX      = SIZE / 2;
  const CY      = SIZE / 2;
  const R_OUTER = 70;
  const R_INNER = 42;

  // Build SVG arc paths
  const paths = useMemo(() => {
    if (slices.length === 0 || total === 0) return [];

    const result: { path: string; color: string; category: ExpenseCategory }[] = [];
    let startAngle = -Math.PI / 2;

    for (const slice of slices) {
      if (slice.pct <= 0) continue;
      const angle    = (slice.pct / 100) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const largeArc = angle > Math.PI ? 1 : 0;

      const x1 = CX + R_OUTER * Math.cos(startAngle);
      const y1 = CY + R_OUTER * Math.sin(startAngle);
      const x2 = CX + R_OUTER * Math.cos(endAngle);
      const y2 = CY + R_OUTER * Math.sin(endAngle);
      const x3 = CX + R_INNER * Math.cos(endAngle);
      const y3 = CY + R_INNER * Math.sin(endAngle);
      const x4 = CX + R_INNER * Math.cos(startAngle);
      const y4 = CY + R_INNER * Math.sin(startAngle);

      const path = [
        `M ${x1} ${y1}`,
        `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ');

      result.push({
        path,
        color:    CATEGORY_COLORS[slice.category],
        category: slice.category,
      });

      startAngle = endAngle;
    }

    return result;
  }, [slices]);

  return (
    <Svg width={SIZE} height={SIZE}>
      {total === 0 ? (
        <Circle
          cx={CX} cy={CY}
          r={(R_OUTER + R_INNER) / 2}
          fill="none"
          stroke={Colors.border}
          strokeWidth={R_OUTER - R_INNER}
        />
      ) : (
        paths.map((p, i) => (
          <Path key={i} d={p.path} fill={p.color} />
        ))
      )}
      <SvgText
        x={CX} y={CY - 6}
        textAnchor="middle"
        fontSize={11}
        fill={Colors.textMuted}>
        This month
      </SvgText>
      <SvgText
        x={CX} y={CY + 10}
        textAnchor="middle"
        fontSize={14}
        fontWeight="700"
        fill={Colors.textPrimary}>
        {symbol}{Math.round(total)}
      </SvgText>
    </Svg>
  );
};

//  Analytics Screen
export const AnalyticsScreen = () => {
  const allExpenses = useAppSelector(selectAllExpenses);
  const user        = useAppSelector(selectUser);
  const rates       = useAppSelector(selectRates);

  const dc       = user?.displayCurrency ?? 'INR';
  const sym      = getCurrencySymbol(dc);
  const ratesMap = rates?.rates ?? {};

  // Last 6 months labels + data
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const m = dayjs().subtract(5 - i, 'month');
      return { label: m.format('MMM'), key: m.format('YYYY-MM'), value: 0 };
    });

    for (const expense of allExpenses) {
      const monthKey = dayjs(expense.date).format('YYYY-MM');
      const bucket   = months.find(m => m.key === monthKey);
      if (bucket) {
        bucket.value += convertAmount(expense.amount, expense.currency, dc, ratesMap);
      }
    }

    return months;
  }, [allExpenses, ratesMap, dc]);

  // Current month category breakdown
  const thisMonthKey = dayjs().format('YYYY-MM');

  const categoryData = useMemo<DonutSlice[]>(() => {
    const totals: Record<string, number> = {};

    for (const expense of allExpenses) {
      if (dayjs(expense.date).format('YYYY-MM') !== thisMonthKey) continue;
      const amt = convertAmount(expense.amount, expense.currency, dc, ratesMap);
      totals[expense.category] = (totals[expense.category] ?? 0) + amt;
    }

    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    if (total === 0) return [];

    return EXPENSE_CATEGORIES
      .filter(cat => (totals[cat] ?? 0) > 0)
      .map(cat => ({
        category: cat,
        value:    totals[cat] ?? 0,
        pct:      ((totals[cat] ?? 0) / total) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [allExpenses, ratesMap, dc, thisMonthKey]);

  const donutTotal = categoryData.reduce((s, d) => s + d.value, 0);

  //Summary stats
  const totalPaid = useMemo(() =>
    allExpenses
      .filter(e => e.paidById === user?.id)
      .reduce((s, e) => s + convertAmount(e.amount, e.currency, dc, ratesMap), 0),
    [allExpenses, ratesMap],
  );

  const totalOwed = useMemo(() =>
    allExpenses
      .filter(e => e.paidById !== user?.id)
      .reduce((s, e) => {
        const myShare = e.splits.find(sp => sp.memberId === user?.id);
        if (!myShare) return s;
        return s + convertAmount(myShare.amount, e.currency, dc, ratesMap);
      }, 0),
    [allExpenses, ratesMap],
  );

  const topCategory = categoryData[0]?.category ?? null;

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Analytics</Text>
        <Text style={s.headerSub}>All groups · {dc}</Text>
      </View>

      <OfflineBadge />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Summary Cards ── */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{sym}{totalPaid.toFixed(0)}</Text>
            <Text style={s.statLabel}>Total Paid</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: Colors.danger }]}>
              {sym}{totalOwed.toFixed(0)}
            </Text>
            <Text style={s.statLabel}>Total Owed</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{topCategory ?? '—'}</Text>
            <Text style={s.statLabel}>Top Category</Text>
          </View>
        </View>

        {/* ── Bar Chart ── */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Monthly Spend</Text>
          <Text style={s.chartSub}>Last 6 months</Text>
          <View style={s.chartWrap}>
            <BarChart data={monthlyData} symbol={sym} />
          </View>
        </View>

        {/* ── Doughnut Chart ── */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>This Month</Text>
          <Text style={s.chartSub}>Spend by category</Text>

          <View style={s.donutRow}>
            {/* Doughnut */}
            <DonutChart slices={categoryData} total={donutTotal} symbol={sym} />

            {/* Legend */}
            <View style={s.legend}>
              {categoryData.length === 0 ? (
                <Text style={s.emptyLegend}>No expenses{'\n'}this month</Text>
              ) : (
                categoryData.map(d => (
                  <View key={d.category} style={s.legendRow}>
                    <View style={[s.legendDot, { backgroundColor: CATEGORY_COLORS[d.category] }]} />
                    <View style={s.legendInfo}>
                      <Text style={s.legendCat}>{d.category}</Text>
                      <Text style={s.legendAmt}>{sym}{d.value.toFixed(0)}</Text>
                    </View>
                    <Text style={s.legendPct}>{d.pct.toFixed(0)}%</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* ── All-time breakdown table ── */}
        {allExpenses.length > 0 && (
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>All Time by Category</Text>
            {EXPENSE_CATEGORIES.map(cat => {
              const total = allExpenses
                .filter(e => e.category === cat)
                .reduce((s, e) => s + convertAmount(e.amount, e.currency, dc, ratesMap), 0);
              if (total === 0) return null;
              const pct = (total / (totalPaid || 1)) * 100;

              return (
                <View key={cat} style={s.tableRow}>
                  <View style={[s.tableDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                  <Text style={s.tableCat}>{cat}</Text>
                  <View style={s.tableBarWrap}>
                    <View style={[s.tableBar, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: CATEGORY_COLORS[cat] + '88' }]} />
                  </View>
                  <Text style={s.tableAmt}>{sym}{total.toFixed(0)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {allExpenses.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48 }}>📊</Text>
            <Text style={s.emptyTitle}>No data yet</Text>
            <Text style={s.emptySub}>Add expenses to see your analytics</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.base,
    paddingTop:  Spacing.base,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },

  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: Typography.md, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },

  chartCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.base, borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.sm,
  },
  chartTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  chartSub:   { fontSize: Typography.xs, color: Colors.textMuted, marginTop: -4 },
  chartWrap:  { marginTop: Spacing.xs },

  donutRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  legend:      { flex: 1, gap: Spacing.sm },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendInfo:  { flex: 1 },
  legendCat:   { fontSize: Typography.xs, fontWeight: '600', color: Colors.textPrimary },
  legendAmt:   { fontSize: Typography.xs, color: Colors.textMuted },
  legendPct:   { fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary, minWidth: 30, textAlign: 'right' },
  emptyLegend: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  tableRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  tableDot:    { width: 8, height: 8, borderRadius: 4 },
  tableCat:    { fontSize: Typography.sm, color: Colors.textSecondary, width: 90 },
  tableBarWrap:{ flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  tableBar:    { height: 6, borderRadius: 3 },
  tableAmt:    { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, minWidth: 60, textAlign: 'right' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textSecondary },
  emptySub:   { fontSize: Typography.sm, color: Colors.textMuted },
});