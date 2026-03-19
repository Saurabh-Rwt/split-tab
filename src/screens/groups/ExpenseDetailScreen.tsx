import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Image, Linking, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { GroupsStackParamList } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectExpenseById, deleteExpense }                          from '../../store/slices/expensesSlice';
import { selectUser }                                                from '../../store/slices/authSlice';
import { selectRates, convertAmount, convertWithHistoricalRate }     from '../../store/slices/currencySlice';
import { getCurrencySymbol, CATEGORY_ICONS }                         from '../../constants/currencies';
import { MOCK_CONTACTS }  from '../../constants/mockContacts';
import { Avatar }         from '../../components/common/Avatar';
import { Card }           from '../../components/common/Card';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav   = NativeStackNavigationProp<GroupsStackParamList, 'ExpenseDetail'>;
type Route = RouteProp<GroupsStackParamList, 'ExpenseDetail'>;

const getName  = (id: string, uid?: string, uname?: string) =>
  id === uid ? (uname ?? 'You') : MOCK_CONTACTS.find(c => c.id === id)?.name ?? 'Unknown';
const getColor = (id: string, uid?: string, ucolor?: string) =>
  id === uid ? (ucolor ?? Colors.primary) : MOCK_CONTACTS.find(c => c.id === id)?.avatarColor ?? Colors.textMuted;

export const ExpenseDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { expenseId, groupId } = route.params;

  const dispatch = useAppDispatch();
  const expense  = useAppSelector(selectExpenseById(expenseId));
  const user     = useAppSelector(selectUser);
  const rates    = useAppSelector(selectRates);

  if (!expense) return (
    <SafeAreaView style={s.safe}>
      <Text style={{ color: Colors.textPrimary, padding: Spacing.base }}>Expense not found.</Text>
    </SafeAreaView>
  );

  const dc      = user?.displayCurrency ?? 'INR';
  const sym     = getCurrencySymbol(dc);
  const ratesMap= rates?.rates ?? {};

  const toDisplay = (amt: number) =>
    expense.historicalRate && Object.keys(expense.historicalRate).length > 0
      ? convertWithHistoricalRate(amt, expense.currency, dc, expense.historicalRate)
      : convertAmount(amt, expense.currency, dc, ratesMap);

  const total     = toDisplay(expense.amount);
  const paidName  = getName(expense.paidById, user?.id, user?.name);
  const paidColor = getColor(expense.paidById, user?.id, user?.avatarColor);

  const openMaps = () => {
    if (!expense.location) return;
    const { lat, lon, name } = expense.location;
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${encodeURIComponent(name)}@${lat},${lon}`
      : `geo:${lat},${lon}?q=${encodeURIComponent(name)}`;
    Linking.openURL(url);
  };

  const handleDelete = () => {
    Alert.alert('Delete Expense', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await dispatch(deleteExpense(expenseId));
        navigation.goBack();
      }},
    ]);
  };

  const splitLabel = { equal: 'Equal', exact: 'Exact', percentage: 'Percentage', shares: 'Shares' }[expense.splitType];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{expense.description}</Text>
        <View style={s.actions}>
          <TouchableOpacity style={s.editBtn}
            onPress={() => navigation.navigate('EditExpense', { expenseId, groupId })}>
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={{ fontSize: 18 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Card style={s.heroCard}>
          <Text style={{ fontSize: 40 }}>{CATEGORY_ICONS[expense.category]}</Text>
          <Text style={s.heroAmt}>{sym}{total.toFixed(2)}</Text>
          {expense.currency !== dc && (
            <Text style={s.heroOrig}>
              {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)} · historical rate
            </Text>
          )}
          <Text style={s.heroMeta}>{expense.category} · {dayjs(expense.date).format('MMM D, YYYY')}</Text>
          <View style={s.paidRow}>
            <Avatar name={paidName} color={paidColor} size={22} />
            <Text style={s.paidText}>Paid by <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{paidName}</Text></Text>
          </View>
        </Card>

        {/* Split Breakdown */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Split Breakdown</Text>
            <View style={s.badge}><Text style={s.badgeText}>{splitLabel}</Text></View>
          </View>
          {expense.splits.map(sp => (
            <View key={sp.memberId} style={s.splitRow}>
              <Avatar name={getName(sp.memberId, user?.id, user?.name)}
                color={getColor(sp.memberId, user?.id, user?.avatarColor)} size={30} />
              <Text style={s.splitName}>{getName(sp.memberId, user?.id, user?.name)}</Text>
              <Text style={s.splitPct}>{((sp.amount / expense.amount) * 100).toFixed(1)}%</Text>
              <Text style={s.splitAmt}>{sym}{toDisplay(sp.amount).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Receipt */}
        {expense.receiptUri && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Receipt</Text>
            <Image source={{ uri: expense.receiptUri }} style={s.receiptImg} resizeMode="cover" />
          </View>
        )}

        {/* Location */}
        {expense.location && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Location</Text>
            <TouchableOpacity style={s.locCard} onPress={openMaps} activeOpacity={0.7}>
              <Text style={s.locName} numberOfLines={2}>📍 {expense.location.name}</Text>
              <Text style={s.locCoords}>{expense.location.lat.toFixed(4)}, {expense.location.lon.toFixed(4)}</Text>
              <Text style={s.locOpen}>Tap to open in Maps →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Audit Log */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Edit History</Text>
          {expense.auditLog.length === 0
            ? <Text style={s.noAudit}>No edits have been made.</Text>
            : expense.auditLog.map(e => (
              <View key={e.id} style={s.auditRow}>
                <View style={s.auditDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.auditDesc}>{e.description}</Text>
                  <Text style={s.auditMeta}>
                    by {getName(e.changedBy, user?.id, user?.name)} · {dayjs(e.changedAt).format('MMM D, h:mm A')}
                  </Text>
                </View>
              </View>
            ))
          }
        </View>
        <Text style={s.ts}>Created {dayjs(expense.createdAt).format('MMM D, YYYY')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back:       { color: Colors.primary, fontSize: Typography.lg, fontWeight: '700' },
  title:      { flex: 1, fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: Spacing.sm },
  actions:    { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  editBtn:    { backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  editBtnText:{ color: Colors.textPrimary, fontSize: Typography.sm },
  content:    { padding: Spacing.base, gap: Spacing.xl, paddingBottom: 60 },
  heroCard:   { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  heroAmt:    { fontSize: Typography['3xl'], fontWeight: '800', color: Colors.textPrimary },
  heroOrig:   { fontSize: Typography.xs, color: Colors.textMuted },
  heroMeta:   { fontSize: Typography.sm, color: Colors.textSecondary },
  paidRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  paidText:   { fontSize: Typography.sm, color: Colors.textSecondary },
  section:    { gap: Spacing.sm },
  sectionHead:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:{ fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  badge:      { backgroundColor: Colors.primary + '22', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText:  { fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },
  splitRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  splitName:  { flex: 1, fontSize: Typography.base, fontWeight: '500', color: Colors.textPrimary },
  splitPct:   { fontSize: Typography.sm, color: Colors.textMuted },
  splitAmt:   { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, minWidth: 70, textAlign: 'right' },
  receiptImg: { width: '100%', height: 200, borderRadius: Radius.md },
  locCard:    { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '55', gap: 4 },
  locName:    { fontSize: Typography.base, fontWeight: '500', color: Colors.textPrimary },
  locCoords:  { fontSize: Typography.xs, color: Colors.textMuted },
  locOpen:    { fontSize: Typography.xs, color: Colors.primary, fontWeight: '500', marginTop: 4 },
  noAudit:    { fontSize: Typography.sm, color: Colors.textMuted, fontStyle: 'italic' },
  auditRow:   { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  auditDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 5 },
  auditDesc:  { fontSize: Typography.sm, fontWeight: '500', color: Colors.textPrimary },
  auditMeta:  { fontSize: Typography.xs, color: Colors.textMuted },
  ts:         { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', paddingBottom: 20 },
});
