import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { GroupsStackParamList, Currency, SplitType, ExpenseCategory } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectExpenseById, editExpense }  from '../../store/slices/expensesSlice';
import { selectGroupById }                 from '../../store/slices/groupsSlice';
import { selectUser }                      from '../../store/slices/authSlice';
import { CURRENCIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, getCurrencySymbol } from '../../constants/currencies';
import { MOCK_CONTACTS }  from '../../constants/mockContacts';
import { calculateSplits, validateSplits } from '../../utils/splitCalculator';
import { Avatar } from '../../components/common/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav   = NativeStackNavigationProp<GroupsStackParamList, 'EditExpense'>;
type Route = RouteProp<GroupsStackParamList, 'EditExpense'>;

const getName  = (id: string, uid?: string, uname?: string) =>
  id === uid ? (uname ?? 'You') : MOCK_CONTACTS.find(c => c.id === id)?.name ?? 'Unknown';
const getColor = (id: string, uid?: string, ucolor?: string) =>
  id === uid ? (ucolor ?? Colors.primary) : MOCK_CONTACTS.find(c => c.id === id)?.avatarColor ?? Colors.textMuted;

const SPLIT_TABS: { key: SplitType; label: string }[] = [
  { key: 'equal', label: '⚖️ Equal' }, { key: 'exact', label: '✏️ Exact' },
  { key: 'percentage', label: '💯 %' }, { key: 'shares', label: '🔢 Shares' },
];

export const EditExpenseScreen = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { expenseId, groupId } = route.params;

  const dispatch = useAppDispatch();
  const expense  = useAppSelector(selectExpenseById(expenseId));
  const group    = useAppSelector(selectGroupById(groupId));
  const user     = useAppSelector(selectUser);

  if (!expense || !group) return null;

  // Pre-populate with existing values
  const [amount,      setAmount]      = useState(expense.amount.toString());
  const [currency,    setCurrency]    = useState<Currency>(expense.currency);
  const [description, setDescription] = useState(expense.description);
  const [date,        setDate]        = useState(expense.date);
  const [category,    setCategory]    = useState<ExpenseCategory>(expense.category);
  const [paidById,    setPaidById]    = useState(expense.paidById);
  const [splitType,   setSplitType]   = useState<SplitType>(expense.splitType);
  const [saving,      setSaving]      = useState(false);

  // Pre-fill split fields from existing splits
  const [exactValues, setExactValues] = useState<Record<string, string>>(
    Object.fromEntries(expense.splits.map(s => [s.memberId, s.amount.toString()])),
  );
  const [pctValues, setPctValues] = useState<Record<string, string>>(
    Object.fromEntries(expense.splits.map(s => [s.memberId, (s.percentage ?? 0).toString()])),
  );
  const [shareValues, setShareValues] = useState<Record<string, string>>(
    Object.fromEntries(expense.splits.map(s => [s.memberId, (s.shares ?? 1).toString()])),
  );

  const memberIds  = group.memberIds;
  const totalFloat = parseFloat(amount) || 0;

  const computedSplits = (() => {
    if (totalFloat <= 0) return [];
    try {
      return calculateSplits(splitType, totalFloat, memberIds, {
        exactAmounts: Object.fromEntries(Object.entries(exactValues).map(([k, v]) => [k, parseFloat(v) || 0])),
        percentages:  Object.fromEntries(Object.entries(pctValues).map(([k, v])   => [k, parseFloat(v) || 0])),
        shareUnits:   Object.fromEntries(Object.entries(shareValues).map(([k, v]) => [k, parseFloat(v) || 1])),
      });
    } catch { return []; }
  })();

  const splitError = totalFloat > 0
    ? validateSplits(computedSplits, totalFloat, splitType)
    : null;

  const handleSave = async () => {
    if (!user) return;
    if (!description.trim()) { Alert.alert('Required', 'Please add a description.'); return; }
    if (totalFloat <= 0)     { Alert.alert('Required', 'Enter a valid amount.'); return; }
    if (splitError)          { Alert.alert('Split Error', splitError); return; }

    setSaving(true);

    // Build human-readable change description for audit log
    const changes: string[] = [];
    if (description !== expense.description) changes.push('description changed');
    if (totalFloat  !== expense.amount)      changes.push(`amount changed from ${expense.amount} to ${totalFloat}`);
    if (category    !== expense.category)    changes.push(`category changed to ${category}`);
    if (paidById    !== expense.paidById)    changes.push('payer changed');
    if (splitType   !== expense.splitType)   changes.push(`split type changed to ${splitType}`);

    await dispatch(editExpense({
      id:                expenseId,
      changes:           { description: description.trim(), amount: totalFloat, currency, category, date, paidById, splitType, splits: computedSplits },
      changedBy:         user.id,
      changeDescription: changes.length > 0 ? changes.join('; ') : 'Minor edit',
    }));

    setSaving(false);
    navigation.goBack();
  };

  const getSplitValue = (id: string) => {
    if (splitType === 'exact')      return exactValues[id] ?? '';
    if (splitType === 'percentage') return pctValues[id]   ?? '';
    if (splitType === 'shares')     return shareValues[id] ?? '';
    return '';
  };
  const setSplitValue = (id: string, val: string) => {
    if (splitType === 'exact')      setExactValues(p => ({ ...p, [id]: val }));
    if (splitType === 'percentage') setPctValues(p   => ({ ...p, [id]: val }));
    if (splitType === 'shares')     setShareValues(p => ({ ...p, [id]: val }));
  };

  const sym = getCurrencySymbol(currency);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Expense</Text>
        <TouchableOpacity
          style={[s.saveBtn, (saving || !!splitError) && s.saveBtnOff]}
          onPress={handleSave} disabled={saving || !!splitError}>
          <Text style={s.saveBtnText}>{saving ? '…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Currency */}
        <View style={s.field}>
          <Text style={s.label}>Currency</Text>
          <View style={s.row}>
            {CURRENCIES.map(c => (
              <TouchableOpacity key={c.code}
                style={[s.currBtn, currency === c.code && s.currBtnOn]}
                onPress={() => setCurrency(c.code)}>
                <Text style={[s.currSym, currency === c.code && { color: Colors.primary }]}>{c.symbol}</Text>
                <Text style={[{ fontSize: Typography.xs, color: Colors.textMuted }, currency === c.code && { color: Colors.primary }]}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount */}
        <View style={s.field}>
          <Text style={s.label}>Amount *</Text>
          <TextInput style={s.amtInput} value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} />
        </View>

        {/* Description */}
        <View style={s.field}>
          <Text style={s.label}>Description *</Text>
          <TextInput style={s.input} value={description} onChangeText={setDescription}
            placeholderTextColor={Colors.textMuted} maxLength={60} />
        </View>

        {/* Date */}
        <View style={s.field}>
          <Text style={s.label}>Date</Text>
          <TextInput style={s.input} value={date} onChangeText={setDate}
            keyboardType="numbers-and-punctuation" placeholderTextColor={Colors.textMuted} />
        </View>

        {/* Category */}
        <View style={s.field}>
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.chipRow}>
              {EXPENSE_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[s.chip, category === cat && s.chipOn]}
                  onPress={() => setCategory(cat)}>
                  <Text style={s.chipIcon}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[s.chipText, category === cat && s.chipTextOn]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Paid By */}
        <View style={s.field}>
          <Text style={s.label}>Paid By</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.chipRow}>
              {memberIds.map(id => (
                <TouchableOpacity key={id} style={[s.chip, paidById === id && s.chipOn]}
                  onPress={() => setPaidById(id)}>
                  <Avatar name={getName(id, user?.id, user?.name)}
                    color={getColor(id, user?.id, user?.avatarColor)} size={20} />
                  <Text style={[s.chipText, paidById === id && s.chipTextOn]}>
                    {getName(id, user?.id, user?.name)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Split Type */}
        <View style={s.field}>
          <Text style={s.label}>Split Type</Text>
          <View style={s.row}>
            {SPLIT_TABS.map(t => (
              <TouchableOpacity key={t.key}
                style={[s.splitBtn, splitType === t.key && s.splitBtnOn]}
                onPress={() => setSplitType(t.key)}>
                <Text style={[s.splitBtnText, splitType === t.key && s.splitBtnTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Split rows */}
        {totalFloat > 0 && (
          <View style={s.field}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.label}>Per Member</Text>
              {splitError
                ? <Text style={{ fontSize: Typography.xs, color: Colors.danger }}>{splitError}</Text>
                : <Text style={{ fontSize: Typography.xs, color: Colors.success }}>✓ Valid</Text>}
            </View>
            {memberIds.map(id => {
              const mShare = computedSplits.find(sp => sp.memberId === id);
              return (
                <View key={id} style={s.splitRow}>
                  <Avatar name={getName(id, user?.id, user?.name)}
                    color={getColor(id, user?.id, user?.avatarColor)} size={28} />
                  <Text style={s.splitName} numberOfLines={1}>{getName(id, user?.id, user?.name)}</Text>
                  {splitType === 'equal' ? (
                    <Text style={s.splitAmt}>{sym}{(mShare?.amount ?? 0).toFixed(2)}</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TextInput style={s.splitInput}
                        value={getSplitValue(id)} onChangeText={v => setSplitValue(id, v)}
                        keyboardType="decimal-pad" placeholder="0"
                        placeholderTextColor={Colors.textMuted} />
                      <Text style={{ fontSize: Typography.xs, color: Colors.textMuted }}>
                        {splitType === 'percentage' ? '%' : splitType === 'shares' ? 'sh' : sym}
                      </Text>
                      {mShare && (
                        <Text style={{ fontSize: Typography.xs, color: Colors.textSecondary }}>
                          ={sym}{mShare.amount.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back:        { color: Colors.primary, fontSize: Typography.base, fontWeight: '500' },
  headerTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  saveBtn:     { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  saveBtnOff:  { opacity: 0.35 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },
  content:     { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 80 },
  field:       { gap: Spacing.sm },
  label:       { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },
  row:         { flexDirection: 'row', gap: Spacing.sm },
  currBtn:     { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  currBtnOn:   { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '28' },
  currSym:     { fontSize: Typography.lg, fontWeight: '800', color: Colors.textSecondary },
  amtInput:    { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.md },
  input:       { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary },
  chipRow:     { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.base },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  chipOn:      { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '22' },
  chipIcon:    { fontSize: 14 },
  chipText:    { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '500' },
  chipTextOn:  { color: Colors.primary, fontWeight: '700' },
  splitBtn:    { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  splitBtnOn:  { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '28' },
  splitBtnText:    { fontSize: Typography.xs, color: Colors.textMuted },
  splitBtnTextOn:  { color: Colors.primary, fontWeight: '700' },
  splitRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  splitName:   { flex: 1, fontSize: Typography.sm, fontWeight: '500', color: Colors.textPrimary },
  splitAmt:    { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, minWidth: 70, textAlign: 'right' },
  splitInput:  { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, fontSize: Typography.sm, color: Colors.textPrimary, minWidth: 55, textAlign: 'right', borderWidth: 1, borderColor: Colors.border },
});
