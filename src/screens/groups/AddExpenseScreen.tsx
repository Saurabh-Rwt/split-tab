import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import uuid from 'react-native-uuid';
import dayjs from 'dayjs';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import {
  GroupsStackParamList, Currency, SplitType,
  ExpenseCategory, Expense, LocationTag,
} from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { addExpense }      from '../../store/slices/expensesSlice';
import { selectGroupById } from '../../store/slices/groupsSlice';
import { selectUser }      from '../../store/slices/authSlice';
import { selectRates }     from '../../store/slices/currencySlice';
import { CURRENCIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, getCurrencySymbol } from '../../constants/currencies';
import { MOCK_CONTACTS }   from '../../constants/mockContacts';
import { calculateSplits, validateSplits } from '../../utils/splitCalculator';
import { NominatimApi, createDebouncedLocationSearch } from '../../services/nominatimApi';
import { Avatar } from '../../components/common/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav   = NativeStackNavigationProp<GroupsStackParamList, 'AddExpense'>;
type Route = RouteProp<GroupsStackParamList, 'AddExpense'>;

const getMemberName  = (id: string, uid?: string, uname?: string) =>
  id === uid ? (uname ?? 'You') : MOCK_CONTACTS.find(c => c.id === id)?.name ?? 'Unknown';
const getMemberColor = (id: string, uid?: string, ucolor?: string) =>
  id === uid ? (ucolor ?? Colors.primary) : MOCK_CONTACTS.find(c => c.id === id)?.avatarColor ?? Colors.textMuted;

const SPLIT_TABS: { key: SplitType; label: string; icon: string }[] = [
  { key: 'equal',      label: 'Equal',  icon: '⚖️' },
  { key: 'exact',      label: 'Exact',  icon: '✏️' },
  { key: 'percentage', label: '%',       icon: '💯' },
  { key: 'shares',     label: 'Shares', icon: '🔢' },
];

export const AddExpenseScreen = () => {
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const { groupId } = route.params;

  const dispatch = useAppDispatch();
  const group    = useAppSelector(selectGroupById(groupId));
  const user     = useAppSelector(selectUser);
  const rates    = useAppSelector(selectRates);

  const [amount,      setAmount]      = useState('');
  const [currency,    setCurrency]    = useState<Currency>(user?.displayCurrency ?? 'INR');
  const [description, setDescription] = useState('');
  const [date,        setDate]        = useState(dayjs().format('YYYY-MM-DD'));
  const [category,    setCategory]    = useState<ExpenseCategory>('Food');
  const [paidById,    setPaidById]    = useState(user?.id ?? '');
  const [splitType,   setSplitType]   = useState<SplitType>('equal');
  const [receiptUri,  setReceiptUri]  = useState<string | undefined>();
  const [location,    setLocation]    = useState<LocationTag | undefined>();
  const [saving,      setSaving]      = useState(false);

  const [exactValues, setExactValues] = useState<Record<string, string>>({});
  const [pctValues,   setPctValues]   = useState<Record<string, string>>({});
  const [shareValues, setShareValues] = useState<Record<string, string>>({});

  const [locQuery,    setLocQuery]    = useState('');
  const [locResults,  setLocResults]  = useState<LocationTag[]>([]);
  const [locCache,    setLocCache]    = useState<LocationTag[]>([]);
  const [showLocList, setShowLocList] = useState(false);

  const debouncedSearch = useRef(
    createDebouncedLocationSearch(results => {
      setLocResults(results);
      setShowLocList(true);
    }),
  ).current;

  useEffect(() => { NominatimApi.getCached().then(setLocCache); }, []);

  const handleLocChange = (q: string) => {
    setLocQuery(q);
    if (!q.trim()) { setLocResults([]); setShowLocList(false); return; }
    debouncedSearch(q);
  };

  const selectLocation = async (loc: LocationTag) => {
    setLocation(loc);
    setLocQuery(loc.name.split(',')[0]);
    setShowLocList(false);
    await NominatimApi.saveToCache(loc);
    setLocCache(await NominatimApi.getCached());
  };

  // Live split preview
  const memberIds   = group?.memberIds ?? [];
  const totalFloat  = parseFloat(amount) || 0;

  const computedSplits = (() => {
    if (totalFloat <= 0 || memberIds.length === 0) return [];
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

  const pickReceipt = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (res: any) => {
        if (res.assets?.[0]?.uri) setReceiptUri(res.assets[0].uri);
      });
    } catch {
      Alert.alert('Info', 'Install react-native-image-picker to enable receipts.');
    }
  };

  const handleSave = async () => {
    if (!user || !group) return;
    if (!description.trim()) { Alert.alert('Required', 'Please add a description.'); return; }
    if (totalFloat <= 0)     { Alert.alert('Required', 'Please enter a valid amount.'); return; }
    if (splitError)          { Alert.alert('Split Error', splitError); return; }

    setSaving(true);

    const expense: Expense = {
      id:             uuid.v4() as string,
      groupId,
      description:    description.trim(),
      amount:         totalFloat,
      currency,
      category,
      date,
      paidById,
      splitType,
      splits:         computedSplits,
      receiptUri,
      location,
      historicalRate: rates?.rates ? { ...rates.rates, USD: 1 } : {},
      auditLog:       [],
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };

    await dispatch(addExpense(expense));
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
          <Text style={s.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Expense</Text>
        <TouchableOpacity
          style={[s.saveBtn, (saving || !!splitError || totalFloat <= 0) && s.saveBtnOff]}
          onPress={handleSave}
          disabled={saving || !!splitError || totalFloat <= 0}>
          <Text style={s.saveBtnText}>{saving ? '…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Currency */}
        <View style={s.field}>
          <Text style={s.label}>Currency</Text>
          <View style={s.currRow}>
            {CURRENCIES.map(c => (
              <TouchableOpacity key={c.code}
                style={[s.currBtn, currency === c.code && s.currBtnOn]}
                onPress={() => setCurrency(c.code)}>
                <Text style={[s.currSym, currency === c.code && { color: Colors.primary }]}>{c.symbol}</Text>
                <Text style={[s.currCode, currency === c.code && { color: Colors.primary }]}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount */}
        <View style={s.field}>
          <Text style={s.label}>Amount *</Text>
          <TextInput style={s.amtInput} value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder={`${sym}0.00`}
            placeholderTextColor={Colors.textMuted} autoFocus />
        </View>

        {/* Description */}
        <View style={s.field}>
          <Text style={s.label}>Description *</Text>
          <TextInput style={s.input} value={description} onChangeText={setDescription}
            placeholder="What was this for?" placeholderTextColor={Colors.textMuted} maxLength={60} />
        </View>

        {/* Date */}
        <View style={s.field}>
          <Text style={s.label}>Date</Text>
          <TextInput style={s.input} value={date} onChangeText={setDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation" />
        </View>

        {/* Category */}
        <View style={s.field}>
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.chipRow}>
              {EXPENSE_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat}
                  style={[s.chip, category === cat && s.chipOn]}
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
                <TouchableOpacity key={id}
                  style={[s.chip, paidById === id && s.chipOn]}
                  onPress={() => setPaidById(id)}>
                  <Avatar name={getMemberName(id, user?.id, user?.name)}
                    color={getMemberColor(id, user?.id, user?.avatarColor)} size={20} />
                  <Text style={[s.chipText, paidById === id && s.chipTextOn]}>
                    {getMemberName(id, user?.id, user?.name)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Split Type */}
        <View style={s.field}>
          <Text style={s.label}>Split Type</Text>
          <View style={s.splitTypeRow}>
            {SPLIT_TABS.map(t => (
              <TouchableOpacity key={t.key}
                style={[s.splitBtn, splitType === t.key && s.splitBtnOn]}
                onPress={() => setSplitType(t.key)}>
                <Text style={s.splitBtnIcon}>{t.icon}</Text>
                <Text style={[s.splitBtnText, splitType === t.key && s.splitBtnTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Split rows */}
        {totalFloat > 0 && (
          <View style={s.field}>
            <View style={s.splitHeader}>
              <Text style={s.label}>Per Member</Text>
              {splitError
                ? <Text style={s.splitErr}>{splitError}</Text>
                : <Text style={s.splitOk}>✓ Valid</Text>}
            </View>
            {memberIds.map(id => {
              const mShare = computedSplits.find(sp => sp.memberId === id);
              return (
                <View key={id} style={s.splitRow}>
                  <Avatar name={getMemberName(id, user?.id, user?.name)}
                    color={getMemberColor(id, user?.id, user?.avatarColor)} size={28} />
                  <Text style={s.splitName} numberOfLines={1}>
                    {getMemberName(id, user?.id, user?.name)}
                  </Text>
                  {splitType === 'equal' ? (
                    <Text style={s.splitAmt}>{sym}{(mShare?.amount ?? 0).toFixed(2)}</Text>
                  ) : (
                    <View style={s.splitInputWrap}>
                      <TextInput style={s.splitInput}
                        value={getSplitValue(id)} onChangeText={v => setSplitValue(id, v)}
                        keyboardType="decimal-pad" placeholder="0"
                        placeholderTextColor={Colors.textMuted} />
                      <Text style={s.splitSuffix}>
                        {splitType === 'percentage' ? '%' : splitType === 'shares' ? 'sh' : sym}
                      </Text>
                      {mShare && (
                        <Text style={s.splitPreview}>={sym}{mShare.amount.toFixed(2)}</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Location */}
        <View style={s.field}>
          <Text style={s.label}>Location (optional)</Text>
          <TextInput style={s.input} value={locQuery} onChangeText={handleLocChange}
            placeholder="Search a place…" placeholderTextColor={Colors.textMuted}
            onFocus={() => { if (!locQuery && locCache.length > 0) setShowLocList(true); }} />
          {location && (
            <View style={s.locTag}>
              <Text style={s.locTagText} numberOfLines={1}>
                📍 {location.name.split(',').slice(0, 2).join(',')}
              </Text>
              <TouchableOpacity onPress={() => { setLocation(undefined); setLocQuery(''); }}>
                <Text style={s.locRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {showLocList && (locResults.length > 0 || locCache.length > 0) && (
            <View style={s.locDropdown}>
              {(locResults.length > 0 ? locResults : locCache).map((loc, i) => (
                <TouchableOpacity key={i} style={s.locItem} onPress={() => selectLocation(loc)}>
                  <Text>{locResults.length > 0 ? '🔍' : '🕐'}</Text>
                  <Text style={s.locItemText} numberOfLines={2}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Receipt */}
        <View style={s.field}>
          <Text style={s.label}>Receipt (optional)</Text>
          {receiptUri ? (
            <View>
              <Image source={{ uri: receiptUri }} style={s.receiptImg} resizeMode="cover" />
              <TouchableOpacity onPress={() => setReceiptUri(undefined)}>
                <Text style={s.receiptRemove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.receiptBtn} onPress={pickReceipt}>
              <Text style={s.receiptBtnText}>📷  Attach Photo</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backText:    { color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.medium },
  headerTitle: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  saveBtn:     { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  saveBtnOff:  { opacity: 0.35 },
  saveBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.sm },
  content:     { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 80 },
  field:       { gap: Spacing.sm },
  label:       { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },

  currRow:   { flexDirection: 'row', gap: Spacing.sm },
  currBtn:   { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  currBtnOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '28' },
  currSym:   { fontSize: Typography.lg, fontWeight: Typography.extrabold, color: Colors.textSecondary },
  currCode:  { fontSize: Typography.xs, color: Colors.textMuted },

  amtInput:  { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.md },
  input:     { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary },

  chipRow:    { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.base },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  chipOn:     { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '22' },
  chipIcon:   { fontSize: 14 },
  chipText:   { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  chipTextOn: { color: Colors.primary, fontWeight: Typography.bold },

  splitTypeRow:    { flexDirection: 'row', gap: Spacing.sm },
  splitBtn:        { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  splitBtnOn:      { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '28' },
  splitBtnIcon:    { fontSize: 16 },
  splitBtnText:    { fontSize: Typography.xs, color: Colors.textMuted },
  splitBtnTextOn:  { color: Colors.primary, fontWeight: Typography.bold },

  splitHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  splitErr:       { fontSize: Typography.xs, color: Colors.danger, fontWeight: Typography.medium },
  splitOk:        { fontSize: Typography.xs, color: Colors.success, fontWeight: Typography.medium },
  splitRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  splitName:      { flex: 1, fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
  splitAmt:       { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textSecondary, minWidth: 70, textAlign: 'right' },
  splitInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  splitInput:     { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, fontSize: Typography.sm, color: Colors.textPrimary, minWidth: 55, textAlign: 'right', borderWidth: 1, borderColor: Colors.border },
  splitSuffix:    { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.bold },
  splitPreview:   { fontSize: Typography.xs, color: Colors.textSecondary },

  locTag:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary + '22', borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.primary + '55' },
  locTagText:  { fontSize: Typography.xs, color: Colors.primary, flex: 1 },
  locRemove:   { color: Colors.textMuted, fontSize: Typography.base, paddingLeft: Spacing.sm },
  locDropdown: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  locItem:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  locItemText: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },

  receiptBtn:    { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.lg, alignItems: 'center' },
  receiptBtnText:{ color: Colors.textSecondary, fontSize: Typography.sm },
  receiptImg:    { width: '100%', height: 160, borderRadius: Radius.md },
  receiptRemove: { color: Colors.danger, fontSize: Typography.sm, fontWeight: Typography.medium, marginTop: Spacing.sm },
});
