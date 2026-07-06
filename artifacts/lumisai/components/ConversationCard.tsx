import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Conversation } from '@/contexts/AppContext';

interface Props {
  conversation: Conversation;
  onPress: () => void;
  onDelete: () => void;
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Şimdi';
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün`;
  return new Date(timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function ConversationCard({ conversation, onPress, onDelete }: Props) {
  const colors = useColors();

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sohbeti Sil', 'Bu sohbeti silmek istediğinden emin misin?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: onDelete },
    ]);
  }, [onDelete]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '33' },
        ]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {conversation.title}
        </Text>
        {conversation.preview ? (
          <Text
            style={[styles.preview, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {conversation.preview}
          </Text>
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {relativeTime(conversation.updatedAt)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground + '88'} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginHorizontal: 14,
    marginVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  preview: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
