import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { GroupsStackParamList } from '../../types';
import { useAppSelector } from '../../store';
import { selectGroupById }          from '../../store/slices/groupsSlice';
import { selectExpensesByGroup }     from '../../store/slices/expensesSlice';
import { selectSettlementsByGroup }  from '../../store/slices/settlementsSlice';
import { selectUser }                from '../../store/slices/authSlice';
import { selectRates, convertAmount } from '../../store/slices/currencySlice';
import { computeNetBalances, simplifyDebts } from '../../utils/settlementAlgorithm';
import { getCurrencySymbol } from '../../constants/currencies';
import { MOCK_CONTACTS }     from '../../constants/mockContacts';
import { Avatar } from '../../components/common/Avatar';
import { Card }   from '../../components/common/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav   = NativeStackNavigationProp<GroupsStackParamList, 'Balance'>;
type Route = RouteProp<GroupsStackParamList, 'Balance'>;

const getName  = (id: string, uid?: string, uname?: string) =>
  id === uid ? (uname ?? 'You') : MOCK_CONTACTS.find(c => c.id === id)?.name ?? 'Unknown';
const getColor = (id: string, uid?: string, ucolor?: string) =>
  id === uid ? (ucolor ?? Colors.primary) : MOCK_CONTACTS.find(c => c.id === id)?.avatarColor ?? Colors.textMuted;

export const BalanceScreen = () => {
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const { groupId } = route.params;

  const group       = useAppSelector(selectGroupById(groupId));
  const expenses    = useAppSelector(selectExpensesByGroup(groupId));
  const settlements = useAppSelector(selectSettlementsByGroup(groupId));
  const user        = useAppSelector(selectUser);
  const rates       = useAppSelector(selectRates);

  const dc      = user?.displayCurrency ?? 'INR';
  const sym     = getCurrencySymbol(dc);
  const ratesMap = rates?.rates ?? {};

  // Compute net balances
  const balances = useMemo(() => computeNetBalances(
    group?.memberIds ?? [],
    expenses.map(e => ({
      amount:   convertAmount(e.amount, e.currency, dc, ratesMap),
      paidById: e.paidById,
      splits:   e.splits.map(s => ({
        memberId: s.memberId,
        amount:   convertAmount(s.amount, e.currency, dc, ratesMap),
      })),
    })),
    settlements.map(s => ({
      fromId: s.fromId,
      toId:   s.toId,
      amount: convertAmount(s.amount, s.currency, dc, ratesMap),
    })),
    dc,
  ), [expenses, settlements, ratesMap]);

  // Debt simplification suggestions
  const suggestions = useMemo(
    () => simplifyDebts(balances, dc),
    [balances],
  );

  // Max absolute value — used to scale balance bars
  const maxAbs = useMemo(
    () => Math.max(...balances.map(b => Math.abs(b.netAmount)), 1),
    [balances],
  );

  if (!group) return null;

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Balances</Text>
        <TouchableOpacity
          style={s.settleBtn}
          onPress={() => navigation.navigate('Settlement', { groupId })}>
          <Text style={s.settleBtnText}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Net Balances ── */}
        <Text style={s.sectionTitle}>Net Balances</Text>

        {balances.map(b => {
          const name     = getName(b.memberId, user?.id, user?.name);
          const color    = getColor(b.memberId, user?.id, user?.avatarColor);
          const isPos    = b.netAmount >  0.009;
          const isNeg    = b.netAmount < -0.009;
          const barWidth = Math.abs(b.netAmount) / maxAbs;

          return (
            <View key={b.memberId} style={s.balanceCard}>
              <Avatar name={name} color={color} size={40} />

              <View style={s.balanceInfo}>
                <Text style={s.balanceName}>{name}</Text>
                {/* Visual bar */}
                <View style={s.barTrack}>
                  <View style={[
                    s.barFill,
                    { width: `${barWidth * 100}%` as any },
                    { backgroundColor: isPos ? Colors.success : isNeg ? Colors.danger : Colors.textMuted },
                  ]} />
                </View>
              </View>

              <View style={s.balanceRight}>
                <Text style={[
                  s.balanceAmt,
                  isPos ? { color: Colors.success }
                    : isNeg ? { color: Colors.danger }
                    : { color: Colors.textMuted },
                ]}>
                  {isPos ? `+${sym}` : isNeg ? `-${sym}` : sym}
                  {Math.abs(b.netAmount).toFixed(2)}
                </Text>
                <Text style={s.balanceLabel}>
                  {isPos ? 'gets back' : isNeg ? 'owes' : 'settled'}
                </Text>
              </View>
            </View>
          );
        })}

        {/* ── Suggested Payments ── */}
        <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>
          Suggested Payments
        </Text>

        {suggestions.length === 0 ? (
          <Card style={s.allClearCard}>
            <Text style={{ fontSize: 36 }}>🎉</Text>
            <Text style={s.allClearTitle}>All settled up!</Text>
            <Text style={s.allClearSub}>No payments needed in this group.</Text>
          </Card>
        ) : (
          suggestions.map((sug, i) => {
            const fromName  = getName(sug.fromId, user?.id, user?.name);
            const fromColor = getColor(sug.fromId, user?.id, user?.avatarColor);
            const toName    = getName(sug.toId, user?.id, user?.name);
            const toColor   = getColor(sug.toId, user?.id, user?.avatarColor);

            return (
              <View key={i} style={s.sugCard}>
                {/* Avatars + arrow */}
                <View style={s.sugAvatarRow}>
                  <Avatar name={fromName} color={fromColor} size={36} />
                  <View style={s.sugArrow}>
                    <Text style={s.sugArrowLine}>────→</Text>
                    <Text style={s.sugArrowAmt}>{sym}{sug.amount.toFixed(2)}</Text>
                  </View>
                  <Avatar name={toName} color={toColor} size={36} />
                </View>

                {/* Text + record button */}
                <View style={s.sugBottom}>
                  <Text style={s.sugText}>
                    <Text style={s.sugBold}>{fromName}</Text>
                    {' pays '}
                    <Text style={s.sugBold}>{toName}</Text>
                  </Text>
                  <TouchableOpacity
                    style={s.recordBtn}
                    onPress={() => navigation.navigate('Settlement', {
                      groupId,
                      fromId: sug.fromId,
                      toId:   sug.toId,
                    })}>
                    <Text style={s.recordBtnText}>Record →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back:         { color: Colors.primary, fontSize: Typography.lg, fontWeight: '700' },
  headerTitle:  { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  settleBtn:    { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  settleBtnText:{ color: '#fff', fontWeight: '700', fontSize: Typography.sm },

  content:      { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 60 },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs },

  balanceCard:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  balanceInfo:  { flex: 1, gap: Spacing.xs },
  balanceName:  { fontSize: Typography.base, fontWeight: '500', color: Colors.textPrimary },
  barTrack:     { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  barFill:      { height: 4, borderRadius: 2 },
  balanceRight: { alignItems: 'flex-end', minWidth: 80 },
  balanceAmt:   { fontSize: Typography.base, fontWeight: '800' },
  balanceLabel: { fontSize: Typography.xs, color: Colors.textMuted },

  allClearCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  allClearTitle:{ fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary },
  allClearSub:  { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },

  sugCard:      { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  sugAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sugArrow:     { flex: 1, alignItems: 'center' },
  sugArrowLine: { color: Colors.textMuted, fontSize: Typography.sm, letterSpacing: 1 },
  sugArrowAmt:  { fontSize: Typography.xs, fontWeight: '700', color: Colors.primary },
  sugBottom:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sugText:      { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1 },
  sugBold:      { fontWeight: '700', color: Colors.textPrimary },
  recordBtn:    { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  recordBtnText:{ color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
});
