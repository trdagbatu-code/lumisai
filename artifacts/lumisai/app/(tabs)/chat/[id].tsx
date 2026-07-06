import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { fetch } from 'expo/fetch';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp, type Message } from '@/contexts/AppContext';
import { MessageBubble } from '@/components/MessageBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ChatInput } from '@/components/ChatInput';
import { getApiUrl } from '@/lib/api';

let _msgCounter = 0;
function genId(): string {
  _msgCounter++;
  return `msg-${Date.now()}-${_msgCounter}-${Math.random().toString(36).slice(2, 9)}`;
}

const SUGGESTIONS = [
  'Bugün hava nasıl olacak?',
  'Türkiye hakkında ilginç bilgiler ver',
  'Basit bir brownie tarifi yaz',
  'Python ile nasıl başlarım?',
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getConversation, updateConversation, settings, isLoaded } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(settings.enableWebSearch);
  const [title, setTitle] = useState('Yeni Sohbet');
  const inputRef = useRef<TextInput>(null);
  const initializedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);

  // Load existing conversation once — wait until AppContext has finished loading from AsyncStorage
  useEffect(() => {
    if (!isLoaded || initializedRef.current) return;
    const conv = getConversation(id ?? '');
    if (conv && conv.messages.length > 0) {
      setMessages(conv.messages);
      setTitle(conv.title);
      messagesRef.current = conv.messages;
    }
    initializedRef.current = true;
  }, [id, isLoaded]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const text = input.trim();
    setInput('');

    // Capture messages BEFORE updating state (stale closure fix)
    const currentMessages = [...messagesRef.current];

    const userMsg: Message = {
      id: genId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const nextMessages = [...currentMessages, userMsg];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;

    // Auto-title from first user message
    if (currentMessages.length === 0) {
      const autoTitle = text.slice(0, 40) + (text.length > 40 ? '...' : '');
      setTitle(autoTitle);
    }

    setIsStreaming(true);
    setShowTyping(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let fullContent = '';
    let assistantAdded = false;
    let assistantId = genId();

    try {
      const baseUrl = getApiUrl();
      const chatHistory = currentMessages
        .map((m) => ({ role: m.role, content: m.content }))
        .concat({ role: 'user' as const, content: text });

      const response = await fetch(`${baseUrl}api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          messages: chatHistory,
          enableWebSearch: webSearchEnabled,
        }),
      });

      if (!response.ok) throw new Error('API yanıt vermedi');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream okunamadı');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as {
              type: string;
              content?: string;
              query?: string;
              message?: string;
            };

            if (parsed.type === 'searching') {
              setShowTyping(false);
              setIsSearching(true);
              setSearchQuery(parsed.query ?? '');
            } else if (parsed.type === 'done_searching') {
              setIsSearching(false);
              setShowTyping(true);
            } else if (parsed.type === 'content' && parsed.content) {
              fullContent += parsed.content;
              setIsSearching(false);

              if (!assistantAdded) {
                setShowTyping(false);
                const aMsg: Message = {
                  id: assistantId,
                  role: 'assistant',
                  content: fullContent,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, aMsg]);
                messagesRef.current = [...messagesRef.current, aMsg];
                assistantAdded = true;
              } else {
                // Keep messagesRef in sync so finally-block persistence is accurate
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  messagesRef.current = updated;
                  return updated;
                });
              }
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message ?? 'Hata');
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch {
      setShowTyping(false);
      setIsSearching(false);
      const errMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: 'Bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
      messagesRef.current = [...messagesRef.current, errMsg];
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      setIsSearching(false);

      // Save to storage after streaming completes
      const finalMessages = messagesRef.current;
      const autoTitle =
        finalMessages.find((m) => m.role === 'user')?.content.slice(0, 40) ?? 'Sohbet';
      updateConversation(id ?? genId(), finalMessages, title !== 'Yeni Sohbet' ? title : autoTitle);

      // Keep keyboard open
      inputRef.current?.focus();
    }
  }, [input, isStreaming, webSearchEnabled, id, title, updateConversation]);

  const handleSuggestion = (text: string) => {
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const reversedMessages = [...messages].reverse();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomPad = insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Custom header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 6,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setWebSearchEnabled((v) => !v);
          }}
          hitSlop={12}
          style={({ pressed }) => [styles.searchToggle, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons
            name="globe-outline"
            size={20}
            color={webSearchEnabled ? colors.accent : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* Empty state — rendered outside FlatList so `inverted` stays stable */}
        {messages.length === 0 && !showTyping && !isSearching ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emptyChat}>
              <View
                style={[
                  styles.emptyChatIcon,
                  { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '33' },
                ]}
              >
                <Ionicons name="sparkles" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyChatTitle, { color: colors.foreground }]}>
                Merhaba! Size nasıl yardımcı olabilirim?
              </Text>
              <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
                Herhangi bir soruyu sorabilirsiniz
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => handleSuggestion(s)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Messages — always inverted so scroll anchor stays stable */
          <FlatList
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted
            ListHeaderComponent={
              showTyping || isSearching ? (
                <TypingIndicator isSearching={isSearching} searchQuery={searchQuery} />
              ) : null
            }
            contentContainerStyle={styles.msgList}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        <View style={{ paddingBottom: bottomPad }}>
          <ChatInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSend={handleSend}
            disabled={isStreaming}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={() => {
              Haptics.selectionAsync();
              setWebSearchEnabled((v) => !v);
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  searchToggle: { padding: 8 },
  msgList: { paddingVertical: 12 },
  emptyContainer: { flex: 1 },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
    gap: 12,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptyChatSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  suggestionChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
