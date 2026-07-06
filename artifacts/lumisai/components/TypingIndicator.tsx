import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  isSearching?: boolean;
  searchQuery?: string;
}

function Dot({ delay }: { delay: number }) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function TypingIndicator({ isSearching, searchQuery }: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: colors.aiBubble, borderColor: colors.border },
        ]}
      >
        {isSearching ? (
          <View style={styles.searchingRow}>
            <Ionicons name="globe-outline" size={14} color={colors.accent} />
            <Text style={[styles.searchingText, { color: colors.accent }]}>
              {searchQuery ? `Arıyor: ${searchQuery}` : 'Web araması yapılıyor...'}
            </Text>
          </View>
        ) : (
          <View style={styles.dotsRow}>
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    maxWidth: 200,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5C7EFF',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
