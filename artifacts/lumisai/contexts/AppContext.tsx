import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  colorScheme: 'dark' | 'light' | 'system';
  enableWebSearch: boolean;
  onboardingDone: boolean;
}

interface AppContextType {
  conversations: Conversation[];
  settings: AppSettings;
  isLoaded: boolean;
  createConversation: (id: string) => void;
  updateConversation: (id: string, messages: Message[], title?: string) => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
  getConversation: (id: string) => Conversation | undefined;
  updateSettings: (patch: Partial<AppSettings>) => void;
  generateId: () => string;
}

const AppContext = createContext<AppContextType | null>(null);

const CONVERSATIONS_KEY = 'lumisai:conversations';
const SETTINGS_KEY = 'lumisai:settings';

let _counter = 0;
function generateId(): string {
  _counter++;
  return `msg-${Date.now()}-${_counter}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_SETTINGS: AppSettings = {
  colorScheme: 'dark',
  enableWebSearch: true,
  onboardingDone: false,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted data once on mount
  useEffect(() => {
    (async () => {
      try {
        const [convRaw, settingsRaw] = await Promise.all([
          AsyncStorage.getItem(CONVERSATIONS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (convRaw) setConversations(JSON.parse(convRaw));
        if (settingsRaw) {
          const saved: AppSettings = JSON.parse(settingsRaw);
          setSettings(saved);
          applyColorScheme(saved.colorScheme);
        } else {
          applyColorScheme('dark');
        }
      } catch {
        // ignore storage errors
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  function applyColorScheme(scheme: AppSettings['colorScheme']) {
    if (scheme === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(scheme);
    }
  }

  const persistConversations = useCallback((convs: Conversation[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs)).catch(() => {});
    }, 400);
  }, []);

  const persistSettings = useCallback((s: AppSettings) => {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  const createConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        if (prev.find((c) => c.id === id)) return prev;
        const next = [
          {
            id,
            title: 'Yeni Sohbet',
            preview: '',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          ...prev,
        ];
        persistConversations(next);
        return next;
      });
    },
    [persistConversations],
  );

  const updateConversation = useCallback(
    (id: string, messages: Message[], title?: string) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        const lastMsg = messages[messages.length - 1];
        const preview = lastMsg ? lastMsg.content.slice(0, 80) : '';
        const autoTitle =
          title ??
          (messages.find((m) => m.role === 'user')?.content.slice(0, 40) ?? 'Sohbet');

        if (idx === -1) {
          const next = [
            {
              id,
              title: autoTitle,
              preview,
              messages,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...prev,
          ];
          persistConversations(next);
          return next;
        }

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          messages,
          preview,
          title: title ?? updated[idx].title,
          updatedAt: Date.now(),
        };
        // Move to front
        const [entry] = updated.splice(idx, 1);
        const next = [entry, ...updated];
        persistConversations(next);
        return next;
      });
    },
    [persistConversations],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persistConversations(next);
        return next;
      });
    },
    [persistConversations],
  );

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    AsyncStorage.removeItem(CONVERSATIONS_KEY).catch(() => {});
  }, []);

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations],
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        persistSettings(next);
        if (patch.colorScheme) applyColorScheme(patch.colorScheme);
        return next;
      });
    },
    [persistSettings],
  );

  return (
    <AppContext.Provider
      value={{
        conversations,
        settings,
        isLoaded,
        createConversation,
        updateConversation,
        deleteConversation,
        clearAllConversations,
        getConversation,
        updateSettings,
        generateId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
