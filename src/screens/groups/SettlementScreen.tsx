import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import uuid from 'react-native-uuid';
import dayjs from 'dayjs';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { GroupsStackParamList, Currency, Settlement } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { addSettlement }                 from '../../store/slices/settlementsSlice';
import { selectSettlementsByGroup }      from '../../store/slices/settlementsSlice';
import { selectGroupById }               from '../../store/slices/groupsSlice';
import { selectUser }                    from '../../store/slices/authSlice';
import { selectRates, convertAmount }    from '../../store/slices/currencySlice';
import { CURRENCIES, getCurrencySymbol } from '../../constants/currencies';
import { MOCK_CONTACTS }  from '../../constants/mockContacts';
import { Avatar } from '../../components/common/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav   = NativeStackNavigationProp<GroupsStackParamList, 'Settlement'>;
type Route = RouteProp<GroupsStackParamList, 'Settlement'>;

const getName  = (id: string, uid?: string, uname?: string) =>
  id === uid ? (uname ?? 'You') : MOCK_CONTACTS.find(c => c.id === id)?.name ?? 'Unknown';
const getColor = (id: string, uid?: string, ucolor?: string) =>
  id === uid ? (ucolor ?? Colors.primary) : MOCK_CONTACTS.find(c => c.id === id)?.avatarColor ?? Colors.textMuted;

export const SettlementScreen = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { groupId, fromId: paramFromId, toId: paramToId } = route.params;

  const dispatch    = useAppDispatch();
  const group       = useAppSelector(selectGroupById(groupId));
  const settlements = useAppSelector(selectSettlementsByGroup(groupId));
  const user        = useAppSelector(selectUser);
  const rates       = useAppSelector(selectRates);

  const dc      = user?.displayCurrency ?? 'INR';
  const sym     = getCurrencySymbol(dc);
  const ratesMap = rates?.rates ?? {};

  // Form state
  const [fromId,   setFromId]   = useState(paramFromId ?? user?.id ?? '');
  const [toId,     setToId]     = useState(paramToId   ?? '');
  const [amount,   setAmount]   = useState('');
  const [currency, setCurrency] = useState<Currency>(dc);
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);

  // History filter
  const [filterFrom, setFilterFrom] = useState('');

  const filteredHistory = useMemo(
    () => settlements.filter(s => !filterFrom || s.fromId === filterFrom || s.toId === filterFrom),
    [settlements, filterFrom],
  );

  if (!group) return null;

  // Save settlement
  const handleRecord = async () => {
    if (!fromId || !toId)  { Alert.alert('Required', 'Select who paid whom.'); return; }
    if (fromId === toId)   { Alert.alert('Error', 'From and To must be different members.'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)  { Alert.alert('Required', 'Enter a valid amount.'); return; }

    setSaving(true);

    const settlement: Settlement = {
      id:        uuid.v4() as string,
      groupId,
      fromId,
      toId,
      amount:    amt,
      currency,
      date:      new Date().toISOString(),
      note:      note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await dispatch(addSettlement(settlement));
    setSaving(false);
    setAmount('');
    setNote('');
    Alert.alert('✓ Recorded', 'Settlement has been saved.');
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settle Up</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Record Form ── */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>Record a Payment</Text>

          {/* Who Paid */}
          <View style={s.field}>
            <Text style={s.label}>Who Paid?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                {group.memberIds.map(id => (
                  <TouchableOpacity key={id}
                    style={[s.chip, fromId === id && s.chipOn]}
                    onPress={() => setFromId(id)}>
                    <Avatar name={getName(id, user?.id, user?.name)}
                      color={getColor(id, user?.id, user?.avatarColor)} size={20} />
                    <Text style={[s.chipText, fromId === id && s.chipTextOn]}>
                      {getName(id, user?.id, user?.name)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Paid To */}
          <View style={s.field}>
            <Text style={s.label}>Paid To?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                {group.memberIds.filter(id => id !== fromId).map(id => (
                  <TouchableOpacity key={id}
                    style={[s.chip, toId === id && s.chipOn]}
                    onPress={() => setToId(id)}>
                    <Avatar name={getName(id, user?.id, user?.name)}
                      color={getColor(id, user?.id, user?.avatarColor)} size={20} />
                    <Text style={[s.chipText, toId === id && s.chipTextOn]}>
                      {getName(id, user?.id, user?.name)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Amount + Currency */}
          <View style={s.field}>
            <Text style={s.label}>Amount</Text>
            <View style={s.currRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity key={c.code}
                  style={[s.currBtn, currency === c.code && s.currBtnOn]}
                  onPress={() => setCurrency(c.code)}>
                  <Text style={[s.currSym, currency === c.code && { color: Colors.primary }]}>{c.symbol}</Text>
                  <Text style={[{ fontSize: Typography.xs, color: Colors.textMuted }, currency === c.code && { color: Colors.primary }]}>{c.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.amtInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Note */}
          <View style={s.field}>
            <Text style={s.label}>Note (optional)</Text>
            <TextInput
              style={s.input}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Cash payment"
              placeholderTextColor={Colors.textMuted}
              maxLength={80}
            />
          </View>

          <TouchableOpacity
            style={[s.recordBtn, saving && s.recordBtnOff]}
            onPress={handleRecord}
            disabled={saving}>
            <Text style={s.recordBtnText}>{saving ? 'Saving…' : '✓  Record Payment'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Settlement History ── */}
        <Text style={s.sectionTitle}>Settlement History</Text>

        {/* Filter by member */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
          <View style={s.filterRow}>
            <TouchableOpacity
              style={[s.filterChip, !filterFrom && s.filterChipOn]}
              onPress={() => setFilterFrom('')}>
              <Text style={[s.filterText, !filterFrom && s.filterTextOn]}>All</Text>
            </TouchableOpacity>
            {group.memberIds.map(id => {
              const active = filterFrom === id;
              return (
                <TouchableOpacity key={id}
                  style={[s.filterChip, active && s.filterChipOn]}
                  onPress={() => setFilterFrom(active ? '' : id)}>
                  <Text style={[s.filterText, active && s.filterTextOn]}>
                    {getName(id, user?.id, user?.name)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {filteredHistory.length === 0 ? (
          <Text style={s.emptyText}>No settlements recorded yet.</Text>
        ) : (
          filteredHistory.map(st => {
            const fromName  = getName(st.fromId, user?.id, user?.name);
            const fromColor = getColor(st.fromId, user?.id, user?.avatarColor);
            const toName    = getName(st.toId,   user?.id, user?.name);
            const toColor   = getColor(st.toId,  user?.id, user?.avatarColor);
            const dispAmt   = convertAmount(st.amount, st.currency, dc, ratesMap);

            return (
              <View key={st.id} style={s.histRow}>
                <View style={s.histAvatars}>
                  <Avatar name={fromName} color={fromColor} size={30} />
                  <Text style={s.histArrow}>→</Text>
                  <Avatar name={toName}   color={toColor}   size={30} />
                </View>
                <View style={s.histInfo}>
                  <Text style={s.histText}>
                    <Text style={s.histBold}>{fromName}</Text>
                    {' paid '}
                    <Text style={s.histBold}>{toName}</Text>
                  </Text>
                  {st.note && <Text style={s.histNote}>{st.note}</Text>}
                  <Text style={s.histDate}>{dayjs(st.createdAt).format('MMM D, YYYY')}</Text>
                </View>
                <Text style={s.histAmt}>{sym}{dispAmt.toFixed(2)}</Text>
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
  back:        { color: Colors.primary, fontSize: Typography.lg, fontWeight: '700' },
  headerTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },

  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 80 },

  formCard:  { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  formTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },

  field:   { gap: Spacing.xs },
  label:   { fontSize: Typography.xs, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.base },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  chipOn:  { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '22' },
  chipText:   { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '500' },
  chipTextOn: { color: Colors.primary, fontWeight: '700' },

  currRow:   { flexDirection: 'row', gap: Spacing.sm },
  currBtn:   { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  currBtnOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '28' },
  currSym:   { fontSize: Typography.lg, fontWeight: '800', color: Colors.textSecondary },
  amtInput:  { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.md },
  input:     { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary },

  recordBtn:    { backgroundColor: Colors.success, borderRadius: Radius.full, paddingVertical: Spacing.md, alignItems: 'center' },
  recordBtnOff: { opacity: 0.5 },
  recordBtnText:{ color: '#fff', fontWeight: '700', fontSize: Typography.base },

  sectionTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },

  filterRow:    { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.base },
  filterChip:   { paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  filterChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '22' },
  filterText:   { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: '500' },
  filterTextOn: { color: Colors.primary, fontWeight: '700' },

  emptyText: { fontSize: Typography.sm, color: Colors.textMuted, fontStyle: 'italic' },

  histRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  histAvatars:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  histArrow:  { color: Colors.textMuted, fontSize: Typography.sm },
  histInfo:   { flex: 1, gap: 2 },
  histText:   { fontSize: Typography.sm, color: Colors.textSecondary },
  histBold:   { fontWeight: '700', color: Colors.textPrimary },
  histNote:   { fontSize: Typography.xs, color: Colors.textMuted, fontStyle: 'italic' },
  histDate:   { fontSize: Typography.xs, color: Colors.textMuted },
  histAmt:    { fontSize: Typography.base, fontWeight: '800', color: Colors.success },
});
