import React, { useCallback } from 'react';
import {
  Alert,
  Clipboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Message } from '@/contexts/AppContext';

interface Props {
  message: Message;
}

function formatTime(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === 'user';

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Mesaj', undefined, [
      {
        text: 'Kopyala',
        onPress: () => {
          if (Platform.OS === 'web') {
            navigator.clipboard?.writeText(message.content).catch(() => {});
          } else {
            Clipboard.setString(message.content);
          }
        },
      },
      { text: 'Kapat', style: 'cancel' },
    ]);
  }, [message.content]);

  return (
    <Pressable onLongPress={handleLongPress}>
      <View
        style={[
          styles.row,
          isUser ? styles.rowUser : styles.rowAI,
        ]}
      >
        {!isUser && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' },
            ]}
          >
            <Ionicons name="sparkles" size={14} color={colors.primary} />
          </View>
        )}

        <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAI]}>
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.bubbleUser, { backgroundColor: colors.userBubble }]
                : [styles.bubbleAI, { backgroundColor: colors.aiBubble, borderColor: colors.border }],
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isUser ? colors.userBubbleForeground : colors.aiBubbleForeground },
              ]}
              selectable
            >
              {message.content}
            </Text>
          </View>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAI: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexShrink: 0,
  },
  bubbleWrapper: {
    maxWidth: '78%',
    gap: 3,
  },
  bubbleWrapperUser: {
    alignItems: 'flex-end',
  },
  bubbleWrapperAI: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    borderRadius: 20,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginHorizontal: 4,
  },
});
