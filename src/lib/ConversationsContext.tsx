import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChatMessage } from "./types";

export interface StoredMessage extends ChatMessage {
  found?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "cb_conversations";

function loadAll(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function persist(list: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to persist conversations", err);
  }
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: StoredMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const text = firstUser?.content.trim() || "New chat";
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

interface ConversationsCtx {
  conversations: Conversation[];
  currentId: string | null;
  current: Conversation | null;
  startNewChat: () => void;
  openConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  saveTurn: (params: { messages: StoredMessage[]; id?: string }) => string;
}

const Ctx = createContext<ConversationsCtx | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadAll());
  const [currentId, setCurrentId] = useState<string | null>(null);

  const startNewChat = useCallback(() => setCurrentId(null), []);
  const openConversation = useCallback((id: string) => setCurrentId(id), []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persist(next);
        return next;
      });
      setCurrentId((cur) => (cur === id ? null : cur));
    },
    []
  );

  const saveTurn = useCallback(
    ({ messages, id }: { messages: StoredMessage[]; id?: string }) => {
      const convId = id ?? currentId ?? genId();
      const now = Date.now();
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === convId);
        let next: Conversation[];
        if (existing) {
          next = prev.map((c) =>
            c.id === convId
              ? { ...c, messages, title: c.title || deriveTitle(messages), updatedAt: now }
              : c
          );
        } else {
          next = [{ id: convId, title: deriveTitle(messages), messages, createdAt: now, updatedAt: now }, ...prev];
        }
        next = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
        persist(next);
        return next;
      });
      if (convId !== currentId) setCurrentId(convId);
      return convId;
    },
    [currentId]
  );

  const current = useMemo(
    () => conversations.find((c) => c.id === currentId) ?? null,
    [conversations, currentId]
  );

  const value = useMemo<ConversationsCtx>(
    () => ({ conversations, currentId, current, startNewChat, openConversation, deleteConversation, saveTurn }),
    [conversations, currentId, current, startNewChat, openConversation, deleteConversation, saveTurn]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConversations(): ConversationsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
}
