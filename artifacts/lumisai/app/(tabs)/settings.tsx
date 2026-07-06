import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  toggle,
  onToggle,
  chevron,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  chevron?: boolean;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !onToggle}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.divider, opacity: pressed && onPress ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: (destructive ? colors.destructive : colors.primary) + '18' }]}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.destructive : colors.primary}
        />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
        ) : null}
        {toggle !== undefined && onToggle ? (
          <Switch
            value={toggle}
            onValueChange={(v) => {
              Haptics.selectionAsync();
              onToggle(v);
            }}
            trackColor={{ false: colors.border, true: colors.primary + 'AA' }}
            thumbColor={toggle ? colors.primary : colors.mutedForeground}
          />
        ) : null}
        {chevron ? (
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground + '88'} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, clearAllConversations, conversations } = useApp();
  const isDark = settings.colorScheme === 'dark';

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const handleClearHistory = () => {
    Alert.alert(
      'Tüm Geçmişi Sil',
      `${conversations.length} sohbet kalıcı olarak silinecek. Devam et?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearAllConversations();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 6, backgroundColor: colors.headerBg, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ayarlar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]}
      >
        {/* Appearance */}
        <Section title="GÖRÜNÜM">
          <Row
            icon="moon-outline"
            label="Karanlık Mod"
            toggle={isDark}
            onToggle={(v) => updateSettings({ colorScheme: v ? 'dark' : 'light' })}
          />
        </Section>

        {/* AI */}
        <Section title="YAPAY ZEKA">
          <Row
            icon="globe-outline"
            label="Web Araması"
            toggle={settings.enableWebSearch}
            onToggle={(v) => updateSettings({ enableWebSearch: v })}
          />
          <Row
            icon="hardware-chip-outline"
            label="Model"
            value="Llama 3.3 70B"
          />
        </Section>

        {/* History */}
        <Section title="GEÇMİŞ">
          <Row
            icon="chatbubbles-outline"
            label="Toplam Sohbet"
            value={`${conversations.length}`}
          />
          <Row
            icon="trash-outline"
            label="Tüm Geçmişi Sil"
            onPress={handleClearHistory}
            destructive
          />
        </Section>

        {/* About */}
        <Section title="HAKKINDA">
          <Row icon="information-circle-outline" label="Uygulama" value="LumisAI" />
          <Row icon="code-slash-outline" label="Sürüm" value="1.0.0" />
          <Row
            icon="shield-checkmark-outline"
            label="Gizlilik"
            value="Yerel depolama"
          />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  scroll: { paddingTop: 20, gap: 6 },
  section: { marginBottom: 6, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
