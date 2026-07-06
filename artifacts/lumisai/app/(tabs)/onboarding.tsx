import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'sparkles-outline' as const,
    title: 'Akıllı Yanıtlar',
    desc: 'Güçlü AI ile her sorunuza net cevaplar alın',
  },
  {
    icon: 'globe-outline' as const,
    title: 'Web Araması',
    desc: 'Gerçek zamanlı bilgiye anında ulaşın',
  },
  {
    icon: 'time-outline' as const,
    title: 'Sohbet Geçmişi',
    desc: 'Tüm konuşmalarınız kayıt altında',
  },
];

function FeatureRow({ icon, title, desc, delay }: (typeof FEATURES)[0] & { delay: number }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '33' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateSettings } = useApp();
  const glow = useSharedValue(0.6);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 1800 }), withTiming(0.6, { duration: 1800 })),
      -1,
      false,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.9 + glow.value * 0.15 }],
  }));

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({ onboardingDone: true });
    router.replace('/home');
  };

  return (
    <LinearGradient
      colors={['#080910', '#0F1128', '#080910']}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Logo area */}
      <Animated.View entering={FadeIn.delay(100)} style={styles.logoArea}>
        <Animated.View style={[styles.glowRing, { borderColor: colors.primary + '44' }, glowStyle]} />
        <View style={[styles.logoCircle, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '55' }]}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.titleArea}>
        <Text style={[styles.appName, { color: colors.foreground }]}>LumisAI</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Yapay zekanın aydınlık yüzü
        </Text>
      </Animated.View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.title} {...f} delay={500 + i * 120} />
        ))}
      </View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(900).springify()} style={styles.ctaArea}>
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.startBtnText}>Başla</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Türkçe varsayılan dil · Web araması desteklenir
        </Text>
      </Animated.View>

      {Platform.OS === 'web' && <View style={{ height: 34 }} />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    height: 160,
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  titleArea: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  features: {
    width: '100%',
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  ctaArea: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 54,
    borderRadius: 27,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
