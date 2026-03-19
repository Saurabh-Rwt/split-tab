import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { GroupsStackParamList, Group } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectAllGroups, archiveGroup, unarchiveGroup } from '../../store/slices/groupsSlice';
import { selectAllExpenses }    from '../../store/slices/expensesSlice';
import { selectAllSettlements } from '../../store/slices/settlementsSlice';
import { selectRates }          from '../../store/slices/currencySlice';
import { selectUser }           from '../../store/slices/authSlice';
import { convertAmount }        from '../../store/slices/currencySlice';
import { computeNetBalances }   from '../../utils/settlementAlgorithm';
import { getCurrencySymbol }    from '../../constants/currencies';
import { OfflineBadge }         from '../../components/common/OfflineBadge';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<GroupsStackParamList, 'GroupList'>;

export const GroupListScreen = () => {
  const navigation  = useNavigation<Nav>();
  const dispatch    = useAppDispatch();

  const groups      = useAppSelector(selectAllGroups);
  const allExpenses = useAppSelector(selectAllExpenses);
  const allSettlements = useAppSelector(selectAllSettlements);
  const user        = useAppSelector(selectUser);
  const rates       = useAppSelector(selectRates);

  const [showArchived, setShowArchived] = useState(false);

  const displayCurrency = user?.displayCurrency ?? 'INR';
  const symbol          = getCurrencySymbol(displayCurrency);
  const ratesMap        = rates?.rates ?? {};

  // Filter groups by archive status
  const visibleGroups = useMemo(
    () => groups.filter(g => g.isArchived === showArchived),
    [groups, showArchived],
  );

  // Per-group stats
  const getGroupStats = (group: Group) => {
    const expenses    = allExpenses.filter(e => e.groupId === group.id);
    const settlements = allSettlements.filter(s => s.groupId === group.id);

    // Total spend converted to display currency
    const totalSpend = expenses.reduce((sum, e) => {
      const converted = convertAmount(e.amount, e.currency, displayCurrency, ratesMap);
      return sum + converted;
    }, 0);

    // Compute net balances for all members
    const balances = computeNetBalances(
      group.memberIds,
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

    const myBalance = balances.find(b => b.memberId === user?.id);

    // Last activity timestamp
    const allDates = [
      ...expenses.map(e => e.createdAt),
      ...settlements.map(s => s.createdAt),
    ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return {
      totalSpend,
      myNet:        myBalance?.netAmount ?? 0,
      lastActivity: allDates[0] ?? group.updatedAt,
    };
  };

  // Long press → archive / unarchive
  const handleLongPress = (group: Group) => {
    Alert.alert(
      group.name,
      group.isArchived ? 'Unarchive this group?' : 'Archive this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: group.isArchived ? 'Unarchive' : 'Archive',
          onPress: () =>
            group.isArchived
              ? dispatch(unarchiveGroup(group.id))
              : dispatch(archiveGroup(group.id)),
        },
      ],
    );
  };

  // Render one group card
  const renderGroup = ({ item }: { item: Group }) => {
    const { totalSpend, myNet, lastActivity } = getGroupStats(item);
    const isPositive = myNet >  0.009;
    const isNegative = myNet < -0.009;

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.75}>

        {/* Left — icon + info */}
        <View style={styles.cardLeft}>
          <View style={styles.iconBubble}>
            <Text style={styles.iconText}>{item.icon}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.metaText}>
              {item.memberIds.length} members · {dayjs(lastActivity).fromNow()}
            </Text>
          </View>
        </View>

        {/* Right — spend + balance */}
        <View style={styles.cardRight}>
          <Text style={styles.totalSpend}>{symbol}{totalSpend.toFixed(0)} total</Text>
          {!isPositive && !isNegative ? (
            <Text style={styles.settled}>✓ Settled</Text>
          ) : (
            <Text style={[
              styles.netBalance,
              { color: isPositive ? Colors.success : Colors.danger },
            ]}>
              {isPositive ? `owed ${symbol}` : `owe ${symbol}`}
              {Math.abs(myNet).toFixed(2)}
            </Text>
          )}
        </View>

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Groups</Text>
          <Text style={styles.headerSub}>
            {groups.filter(g => !g.isArchived).length} active
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('CreateGroup')}>
          <Text style={styles.newBtnText}>＋ New</Text>
        </TouchableOpacity>
      </View>

      {/* Offline indicator */}
      <OfflineBadge />

      {/* Active / Archived toggle */}
      <View style={styles.toggleRow}>
        {['Active', 'Archived'].map((label, i) => {
          const active = showArchived ? i === 1 : i === 0;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.toggleBtn, active && styles.toggleActive]}
              onPress={() => setShowArchived(i === 1)}>
              <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={visibleGroups}
        keyExtractor={g => g.id}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>{showArchived ? '📦' : '👥'}</Text>
            <Text style={styles.emptyTitle}>
              {showArchived ? 'No archived groups' : 'No groups yet'}
            </Text>
            {!showArchived && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreateGroup')}>
                <Text style={styles.emptyBtnText}>Create your first group</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop:  Spacing.base,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  newBtn:      { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  newBtnText:  { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.sm },

  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn:        { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.full },
  toggleActive:     { backgroundColor: Colors.primary },
  toggleText:       { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textMuted },
  toggleTextActive: { color: '#fff', fontWeight: Typography.bold },

  listContent: { paddingHorizontal: Spacing.base, paddingBottom: 100 },

  groupCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  iconBubble:  { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  iconText:    { fontSize: 22 },
  cardInfo:    { flex: 1 },
  groupName:   { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  metaText:    { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  cardRight:   { alignItems: 'flex-end', gap: 4, minWidth: 90 },
  totalSpend:  { fontSize: Typography.xs, color: Colors.textMuted },
  settled:     { fontSize: Typography.xs, color: Colors.success, fontWeight: Typography.medium },
  netBalance:  { fontSize: Typography.xs, fontWeight: Typography.bold },

  empty:       { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyTitle:  { fontSize: Typography.md, color: Colors.textSecondary },
  emptyBtn:    { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  emptyBtnText:{ color: '#fff', fontWeight: Typography.bold },
});