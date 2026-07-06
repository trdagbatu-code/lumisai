import React, { forwardRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: () => void;
}

export const ChatInput = forwardRef<TextInput, Props>(
  (
    {
      value,
      onChangeText,
      onSend,
      disabled = false,
      webSearchEnabled = true,
      onToggleWebSearch,
    },
    ref,
  ) => {
    const colors = useColors();
    const [focused, setFocused] = useState(false);
    const canSend = value.trim().length > 0 && !disabled;

    const handleSend = () => {
      if (!canSend) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSend();
    };

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.headerBg,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.inputBg,
              borderColor: focused ? colors.primary + '66' : colors.border,
            },
          ]}
        >
          {/* Web search toggle */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onToggleWebSearch?.();
            }}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons
              name="globe-outline"
              size={20}
              color={webSearchEnabled ? colors.accent : colors.mutedForeground}
            />
          </Pressable>

          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder="Bir şey sor..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            multiline
            maxLength={4000}
            blurOnSubmit={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            enablesReturnKeyAutomatically
          />

          {/* Send button */}
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: canSend
                  ? colors.primary
                  : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            hitSlop={4}
          >
            {disabled ? (
              <Ionicons name="stop" size={16} color={colors.primaryForeground} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={canSend ? '#fff' : colors.mutedForeground} />
            )}
          </Pressable>
        </View>
      </View>
    );
  },
);

ChatInput.displayName = 'ChatInput';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 34 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    minHeight: 50,
  },
  iconBtn: {
    padding: 6,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
    maxHeight: 120,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
});
