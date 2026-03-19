import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { GroupsStackParamList, Group } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { createGroup } from '../../store/slices/groupsSlice';
import { selectUser }  from '../../store/slices/authSlice';
import { GROUP_ICONS } from '../../constants/currencies';
import { MOCK_CONTACTS } from '../../constants/mockContacts';
import { Avatar } from '../../components/common/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<GroupsStackParamList, 'CreateGroup'>;

export const CreateGroupScreen = () => {
  const navigation = useNavigation<Nav>();
  const dispatch   = useAppDispatch();
  const user       = useAppSelector(selectUser);

  const [name,        setName]        = useState('');
  const [icon,        setIcon]        = useState(GROUP_ICONS[0]);
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving,      setSaving]      = useState(false);

  const canSave = name.trim().length > 0;

  // Toggle a contact in/out of the group
  const toggleMember = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  // Save group
  const handleSave = async () => {
    if (!canSave || !user) return;
    setSaving(true);

    const group: Group = {
      id:          uuid.v4() as string,
      name:        name.trim(),
      icon,
      description: description.trim() || undefined,
      memberIds:   [user.id, ...selectedIds],
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      isArchived:  false,
    };

    await dispatch(createGroup(group));
    setSaving(false);
    navigation.replace('GroupDetail', { groupId: group.id });
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}>
          <Text style={styles.saveBtnText}>{saving ? '…' : 'Create'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Icon Picker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {GROUP_ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[styles.iconCell, icon === ic && styles.iconCellActive]}
                onPress={() => setIcon(ic)}>
                <Text style={styles.iconEmoji}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Group Name ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Group Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Goa Trip 2025"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            maxLength={40}
          />
        </View>

        {/* ── Description ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this group for?"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            maxLength={120}
          />
        </View>

        {/* ── Members ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Add Members  ({selectedIds.length + 1} selected)
          </Text>

          {/* Logged-in user — always included */}
          <View style={styles.youRow}>
            <Avatar
              name={user?.name ?? 'You'}
              color={user?.avatarColor ?? Colors.primary}
              size={40}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{user?.name ?? 'You'}</Text>
              <Text style={styles.contactEmail}>You · always included</Text>
            </View>
            <View style={styles.checkSelected}>
              <Text style={styles.checkTick}>✓</Text>
            </View>
          </View>

          {/* 6 mock contacts */}
          {MOCK_CONTACTS.map(contact => {
            const selected = selectedIds.includes(contact.id);
            return (
              <TouchableOpacity
                key={contact.id}
                style={[styles.contactRow, selected && styles.contactRowSelected]}
                onPress={() => toggleMember(contact.id)}
                activeOpacity={0.7}>
                <Avatar name={contact.name} color={contact.avatarColor} size={40} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactEmail}>{contact.email}</Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Text style={styles.checkTick}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Preview ── */}
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>
            {icon}  {name || 'Untitled'} · {selectedIds.length + 1} member
            {selectedIds.length !== 0 ? 's' : ''}
          </Text>
        </View>

      </ScrollView>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backText:        { color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.medium },
  headerTitle:     { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  saveBtn:         { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText:     { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.sm },

  content: { padding: Spacing.base, gap: Spacing.xl, paddingBottom: 60 },

  section:      { gap: Spacing.sm },
  sectionLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  iconGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconCell:     { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconCellActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '33' },
  iconEmoji:    { fontSize: 26 },

  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

  youRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  contactRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '22' },
  contactInfo:  { flex: 1 },
  contactName:  { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  contactEmail: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },

  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkSelected: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkTick: { color: '#fff', fontSize: 13, fontWeight: Typography.bold },

  previewBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  previewText: { fontSize: Typography.sm, color: Colors.textSecondary },
});