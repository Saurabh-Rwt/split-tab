import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { GroupsStackParamList, Expense, Settlement } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectGroupById, archiveGroup, unarchiveGroup } from '../../store/slices/groupsSlice';
import { selectExpensesByGroup, deleteExpense }          from '../../store/slices/expensesSlice';
import { selectSettlementsByGroup }                      from '../../store/slices/settlementsSlice';
import { selectRates, convertAmount }                    from '../../store/slices/currencySlice';
import { selectUser }                                    from '../../store/slices/authSlice';
import { computeNetBalances }                            from '../../utils/settlementAlgorithm';
import { getCurrencySymbol, CATEGORY_ICONS }             from '../../constants/currencies';
import { MOCK_CONTACTS }                                 from '../../constants/mockContacts';
import { Avatar }                                        from '../../components/common/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav   = NativeStackNavigationProp<GroupsStackParamList, 'GroupDetail'>;
type Route = RouteProp<GroupsStackParamList, 'GroupDetail'>;

const getMemberName = (id: string, userId?: string, userName?: string) => {
  if (id === userId) return userName ?? 'You';
  return MOCK_CONTACTS.find(c => c.id === id)?.name ?? 'Unknown';
};

const getMemberColor = (id: string, userId?: string, userColor?: string) => {
  if (id === userId) return userColor ?? Colors.primary;
  return MOCK_CONTACTS.find(c => c.id === id)?.avatarColor ?? Colors.textMuted;
};

// Union type for the activity feed
type FeedItem =
  | { type: 'expense';    data: Expense;    sortDate: string }
  | { type: 'settlement'; data: Settlement; sortDate: string };

export const GroupDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { groupId } = route.params;

  const dispatch    = useAppDispatch();
  const group       = useAppSelector(selectGroupById(groupId));
  const expenses    = useAppSelector(selectExpensesByGroup(groupId));
  const settlements = useAppSelector(selectSettlementsByGroup(groupId));
  const user        = useAppSelector(selectUser);
  const rates       = useAppSelector(selectRates);

  const displayCurrency = user?.displayCurrency ?? 'INR';
  const symbol          = getCurrencySymbol(displayCurrency);
  const ratesMap        = rates?.rates ?? {};

  // Total spend
  const totalSpend = useMemo(
    () =>
      expenses.reduce(
        (sum, e) => sum + convertAmount(e.amount, e.currency, displayCurrency, ratesMap),
        0,
      ),
    [expenses, ratesMap],
  );

  // My net balance in this group
  const myBalance = useMemo(() => {
    const balances = computeNetBalances(
      group?.memberIds ?? [],
      expenses.map(e => ({
        amount:   convertAmount(e.amount, e.currency, displayCurrency, ratesMap),
        paidById: e.paidById,
        splits:   e.splits.map(s => ({
          memberId: s.memberId,
          amount:   convertAmount(s.amount, e.currency, displayCurrency, ratesMap),
        })),
      })),
      settlements.map(s => ({
        fromId: s.fromId,
        toId:   s.toId,
        amount: convertAmount(s.amount, s.currency, displayCurrency, ratesMap),
      })),
      displayCurrency,
    );
    return balances.find(b => b.memberId === user?.id);
  }, [expenses, settlements, ratesMap]);

  // Chronological activity feed
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...expenses.map(e    => ({ type: 'expense'    as const, data: e, sortDate: e.date })),
      ...settlements.map(s => ({ type: 'settlement' as const, data: s, sortDate: s.date })),
    ];
    return items.sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime(),
    );
  }, [expenses, settlements]);

  // Handlers
  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert('Delete Expense', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(deleteExpense(expenseId)),
      },
    ]);
  };

  const handleMore = () => {
    if (!group) return;
    Alert.alert(group.name, 'Options', [
      {
        text: group.isArchived ? 'Unarchive' : 'Archive',
        onPress: () =>
          group.isArchived
            ? dispatch(unarchiveGroup(group.id))
            : dispatch(archiveGroup(group.id)),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: Colors.textPrimary, padding: Spacing.base }}>
          Group not found.
        </Text>
      </SafeAreaView>
    );
  }

  const myNet      = myBalance?.netAmount ?? 0;
  const isPositive = myNet >  0.009;
  const isNegative = myNet < -0.009;

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>{group.icon}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        </View>
        <TouchableOpacity onPress={handleMore} style={styles.moreBtn}>
          <Text style={styles.moreText}>•••</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{symbol}{totalSpend.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[
              styles.statValue,
              isPositive ? { color: Colors.success }
                : isNegative ? { color: Colors.danger }
                : {},
            ]}>
              {isPositive ? `+${symbol}` : isNegative ? `-${symbol}` : symbol}
              {Math.abs(myNet).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>
              {isPositive ? 'You are owed' : isNegative ? 'You owe' : 'Settled up'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{group.memberIds.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
        </View>

        {/* ── Member avatars strip ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.membersStrip}>
            {group.memberIds.map(id => (
              <Avatar
                key={id}
                name={getMemberName(id, user?.id, user?.name)}
                color={getMemberColor(id, user?.id, user?.avatarColor)}
                size={36}
              />
            ))}
          </View>
        </ScrollView>

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AddExpense', { groupId })}>
            <Text style={styles.actionEmoji}>＋</Text>
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => navigation.navigate('Balance', { groupId })}>
            <Text style={styles.actionEmoji}>⚖️</Text>
            <Text style={styles.actionText}>Balances</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => navigation.navigate('Settlement', { groupId })}>
            <Text style={styles.actionEmoji}>💸</Text>
            <Text style={styles.actionText}>Settle Up</Text>
          </TouchableOpacity>
        </View>

        {/* ── Activity Feed ── */}
        <Text style={styles.feedTitle}>Activity</Text>

        {feed.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Text style={{ fontSize: 40 }}>🧾</Text>
            <Text style={styles.emptyFeedText}>No activity yet</Text>
            <Text style={styles.emptyFeedSub}>Add the first expense to get started</Text>
          </View>
        ) : (
          feed.map(item => {
            if (item.type === 'expense') {
              const e          = item.data;
              const paidName   = getMemberName(e.paidById, user?.id, user?.name);
              const converted  = convertAmount(e.amount, e.currency, displayCurrency, ratesMap);
              const myShare    = e.splits.find(s => s.memberId === user?.id);
              const iLent      = e.paidById === user?.id;

              return (
                <TouchableOpacity
                  key={e.id}
                  style={styles.feedCard}
                  onPress={() => navigation.navigate('ExpenseDetail', { expenseId: e.id, groupId })}
                  onLongPress={() => handleDeleteExpense(e.id)}
                  activeOpacity={0.75}>
                  <View style={styles.feedLeft}>
                    <View style={styles.feedIconBox}>
                      <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[e.category]}</Text>
                    </View>
                    <View style={styles.feedInfo}>
                      <Text style={styles.feedItemTitle} numberOfLines={1}>
                        {e.description}
                      </Text>
                      <Text style={styles.feedItemMeta}>
                        {paidName} paid · {dayjs(e.date).format('MMM D')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.feedRight}>
                    <Text style={styles.feedAmount}>
                      {symbol}{converted.toFixed(2)}
                    </Text>
                    {myShare && (
                      <Text style={[
                        styles.feedShare,
                        { color: iLent ? Colors.success : Colors.danger },
                      ]}>
                        {iLent
                          ? `+${symbol}${convertAmount(e.amount - myShare.amount, e.currency, displayCurrency, ratesMap).toFixed(2)}`
                          : `-${symbol}${convertAmount(myShare.amount, e.currency, displayCurrency, ratesMap).toFixed(2)}`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }

            // Settlement item
            const s        = item.data;
            const fromName = getMemberName(s.fromId, user?.id, user?.name);
            const toName   = getMemberName(s.toId,   user?.id, user?.name);
            const converted= convertAmount(s.amount, s.currency, displayCurrency, ratesMap);

            return (
              <View key={s.id} style={[styles.feedCard, styles.settlementCard]}>
                <View style={styles.feedLeft}>
                  <View style={[styles.feedIconBox, { backgroundColor: Colors.success + '22' }]}>
                    <Text style={{ fontSize: 20 }}>✅</Text>
                  </View>
                  <View style={styles.feedInfo}>
                    <Text style={styles.feedItemTitle}>
                      {fromName} paid {toName}
                    </Text>
                    <Text style={styles.feedItemMeta}>
                      {dayjs(s.date).format('MMM D')} · Settlement
                    </Text>
                  </View>
                </View>
                <Text style={[styles.feedAmount, { color: Colors.success }]}>
                  {symbol}{converted.toFixed(2)}
                </Text>
              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn:      { padding: Spacing.xs, minWidth: 36 },
  backText:     { color: Colors.primary, fontSize: Typography.lg, fontWeight: Typography.bold },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center' },
  headerIcon:   { fontSize: 22 },
  headerTitle:  { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary, maxWidth: 160 },
  moreBtn:      { padding: Spacing.xs, minWidth: 36, alignItems: 'flex-end' },
  moreText:     { color: Colors.textSecondary, fontSize: Typography.base, letterSpacing: 2 },

  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 80 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: Typography.md, fontWeight: Typography.extrabold, color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },

  membersStrip: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  actionBtnSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionEmoji: { fontSize: 18 },
  actionText:  { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textPrimary },

  feedTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.sm,
  },

  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settlementCard: { borderColor: Colors.success + '44' },
  feedLeft:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  feedIconBox:    { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  feedInfo:       { flex: 1 },
  feedItemTitle:  { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  feedItemMeta:   { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  feedRight:      { alignItems: 'flex-end', gap: 2 },
  feedAmount:     { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  feedShare:      { fontSize: Typography.xs, fontWeight: Typography.semibold },

  emptyFeed:    { alignItems: 'center', paddingVertical: 48, gap: Spacing.sm },
  emptyFeedText:{ fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textSecondary },
  emptyFeedSub: { fontSize: Typography.sm, color: Colors.textMuted },
});