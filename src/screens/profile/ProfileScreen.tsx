import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { Currency, AvatarColor } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectUser, updateUserProfile, logoutUser } from '../../store/slices/authSlice';
import { selectAllExpenses }     from '../../store/slices/expensesSlice';
import { selectAllSettlements }  from '../../store/slices/settlementsSlice';
import { selectAllGroups }       from '../../store/slices/groupsSlice';
import { selectRates, convertAmount } from '../../store/slices/currencySlice';
import { CURRENCIES, getCurrencySymbol } from '../../constants/currencies';
import {
  simulateExpenseNotification,
  simulateSettlementNotification,
  setupNotificationChannel,
} from '../../services/NotificationService';
import { SafeAreaView } from 'react-native-safe-area-context';

const AVATAR_COLORS = Colors.avatarColors as unknown as AvatarColor[];

export const ProfileScreen = () => {
  const dispatch    = useAppDispatch();
  const user        = useAppSelector(selectUser);
  const allExpenses = useAppSelector(selectAllExpenses);
  const settlements = useAppSelector(selectAllSettlements);
  const groups      = useAppSelector(selectAllGroups);
  const rates       = useAppSelector(selectRates);

  const [name,        setName]        = useState(user?.name ?? '');
  const [currency,    setCurrency]    = useState<Currency>(user?.displayCurrency ?? 'INR');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(
    user?.avatarColor ?? AVATAR_COLORS[0],
  );
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const dc      = user?.displayCurrency ?? 'INR';
  const sym     = getCurrencySymbol(dc);
  const ratesMap= rates?.rates ?? {};

  // Lifetime stats
  const totalPaid = allExpenses
    .filter(e => e.paidById === user?.id)
    .reduce((s, e) => s + convertAmount(e.amount, e.currency, dc, ratesMap), 0);

  const totalSettled = settlements
    .filter(s => s.fromId === user?.id || s.toId === user?.id)
    .reduce((s, st) => s + convertAmount(st.amount, st.currency, dc, ratesMap), 0);

  const activeGroups = groups.filter(g => !g.isArchived).length;

  // Save profile changes
  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    setSaving(true);
    await dispatch(updateUserProfile({ name: name.trim(), avatarColor, displayCurrency: currency }));
    setSaving(false);
    setEditing(false);
  };

  // Notification test
  const handleSimulateExpense = async () => {
    await setupNotificationChannel();
    const firstExpense = allExpenses[0];
    if (!firstExpense) {
      Alert.alert('No expenses', 'Add an expense first to test this.');
      return;
    }
    await simulateExpenseNotification(
      firstExpense.groupId,
      firstExpense.id,
      firstExpense.description,
      `${sym}${firstExpense.amount}`,
    );
  };

  const handleSimulateSettlement = async () => {
    await setupNotificationChannel();
    const firstGroup = groups[0];
    if (!firstGroup) {
      Alert.alert('No groups', 'Create a group first to test this.');
      return;
    }
    await simulateSettlementNotification(
      firstGroup.id,
      'Arjun',
      `${sym}500`,
    );
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={[s.editBtn, editing && s.editBtnActive]}
          onPress={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}>
          <Text style={[s.editBtnText, editing && s.editBtnTextActive]}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar ── */}
        <View style={s.avatarSection}>
          <View style={[s.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={s.avatarInitial}>
              {(editing ? name : user?.name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          {!editing && (
            <>
              <Text style={s.userName}>{user?.name}</Text>
              <Text style={s.userEmail}>{user?.email}</Text>
            </>
          )}
        </View>

        {/* ── Edit Form ── */}
        {editing && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Display Name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              maxLength={30}
            />

            {/* Avatar color picker */}
            <Text style={[s.sectionTitle, { marginTop: Spacing.md }]}>Avatar Color</Text>
            <View style={s.colorGrid}>
              {AVATAR_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    s.colorSwatch,
                    { backgroundColor: color },
                    avatarColor === color && s.colorSwatchSelected,
                  ]}
                  onPress={() => setAvatarColor(color)}
                />
              ))}
            </View>

            {/* Currency picker */}
            <Text style={[s.sectionTitle, { marginTop: Spacing.md }]}>Display Currency</Text>
            <View style={s.currencyRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c.code}
                  style={[s.currBtn, currency === c.code && s.currBtnActive]}
                  onPress={() => setCurrency(c.code)}>
                  <Text style={[s.currSymbol, currency === c.code && { color: Colors.primary }]}>
                    {c.symbol}
                  </Text>
                  <Text style={[s.currCode, currency === c.code && { color: Colors.primary }]}>
                    {c.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel */}
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => {
                setEditing(false);
                setName(user?.name ?? '');
                setCurrency(user?.displayCurrency ?? 'INR');
                setAvatarColor(user?.avatarColor ?? AVATAR_COLORS[0]);
              }}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Lifetime Stats ── */}
        {!editing && (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Lifetime Stats</Text>
              <View style={s.statsGrid}>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{sym}{totalPaid.toFixed(0)}</Text>
                  <Text style={s.statLabel}>Total Paid</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{sym}{totalSettled.toFixed(0)}</Text>
                  <Text style={s.statLabel}>Total Settled</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{allExpenses.length}</Text>
                  <Text style={s.statLabel}>Expenses</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{activeGroups}</Text>
                  <Text style={s.statLabel}>Active Groups</Text>
                </View>
              </View>
            </View>

            {/* ── Display Currency (read-only) ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Display Currency</Text>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Currency</Text>
                <Text style={s.infoValue}>
                  {getCurrencySymbol(dc)} {dc}
                </Text>
              </View>
            </View>

            {/* ── Notification Test Buttons ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Test Notifications</Text>
              <Text style={s.sectionSub}>
                Tap to simulate receiving a notification. Tapping the notification
                will deep-link to the relevant screen.
              </Text>

              <TouchableOpacity
                style={s.notifBtn}
                onPress={handleSimulateExpense}>
                <Text style={s.notifBtnIcon}>💸</Text>
                <View style={s.notifBtnInfo}>
                  <Text style={s.notifBtnTitle}>Simulate New Expense</Text>
                  <Text style={s.notifBtnSub}>Deep-links to expense detail</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.notifBtn, { marginTop: Spacing.sm }]}
                onPress={handleSimulateSettlement}>
                <Text style={s.notifBtnIcon}>✅</Text>
                <View style={s.notifBtnInfo}>
                  <Text style={s.notifBtnTitle}>Simulate Settlement</Text>
                  <Text style={s.notifBtnSub}>Deep-links to settle up screen</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Logout ── */}
        {!editing && (
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={() =>
              Alert.alert('Log Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: () => dispatch(logoutUser()) },
              ])
            }>
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: Spacing.sm,
  },
  headerTitle:     { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  editBtn:         { borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  editBtnActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  editBtnText:     { color: Colors.textSecondary, fontWeight: '600', fontSize: Typography.sm },
  editBtnTextActive: { color: '#fff' },

  content: { padding: Spacing.base, gap: Spacing.xl, paddingBottom: 100 },

  avatarSection: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  avatarCircle:  { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: Typography.xl, fontWeight: '800', color: '#fff' },
  userName:      { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary },
  userEmail:     { fontSize: Typography.sm, color: Colors.textMuted },

  section:      { gap: Spacing.md },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionSub:   { fontSize: Typography.xs, color: Colors.textMuted, lineHeight: 18, marginTop: -Spacing.sm },

  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
  },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorSwatch:         { width: 44, height: 44, borderRadius: 22 },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },

  currencyRow: { flexDirection: 'row', gap: Spacing.sm },
  currBtn:     { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  currBtnActive:{ borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '28' },
  currSymbol:  { fontSize: Typography.lg, fontWeight: '800', color: Colors.textSecondary },
  currCode:    { fontSize: Typography.xs, color: Colors.textMuted },

  cancelBtn:     { alignItems: 'center', paddingVertical: Spacing.md },
  cancelBtnText: { color: Colors.textMuted, fontSize: Typography.base },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard:  { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  infoLabel: { fontSize: Typography.base, color: Colors.textSecondary },
  infoValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },

  notifBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  notifBtnIcon:  { fontSize: 28 },
  notifBtnInfo:  { flex: 1 },
  notifBtnTitle: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  notifBtnSub:   { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },

  logoutBtn: {
    backgroundColor: Colors.danger + '22', borderRadius: Radius.full,
    paddingVertical: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.danger + '55',
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: Typography.base },
});