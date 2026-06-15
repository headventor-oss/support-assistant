import { useEffect, useMemo, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import TicketModal from "./TicketModal";
import { SendIcon } from "./icons";
import { sendChatMessage } from "../lib/api";
import { useConversations, type StoredMessage } from "../lib/ConversationsContext";

const SUGGESTIONS = [
  "My SAP user account is locked, how do I unlock it?",
  "Purchase order is stuck in 'Awaiting release'",
  "How do I reverse an accounting document?",
  "Sales order won't save — incompletion log appears",
];

export default function ChatWindow() {
  const { current, currentId, saveTurn } = useConversations();
  const messages = useMemo<StoredMessage[]>(() => current?.messages ?? [], [current]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasConversation = messages.length > 0;
  const lastUserQuery = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInput("");
  }, [currentId]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const base = messages;
    const withUser: StoredMessage[] = [...base, { role: "user", content: trimmed }];
    const id = saveTurn({ messages: withUser, id: currentId ?? undefined });
    setInput("");
    setLoading(true);

    const history = base.map(({ role, content }) => ({ role, content }));

    try {
      const response = await sendChatMessage(trimmed, history);
      saveTurn({
        messages: [...withUser, { role: "assistant", content: response.answer, found: response.found }],
        id,
      });
    } catch (err) {
      console.error(err);
      saveTurn({
        messages: [
          ...withUser,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again or raise a support ticket.",
            found: false,
          },
        ],
        id,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="chat">
      <div className="chat-scroll">
        {!hasConversation ? (
          <div className="welcome">
            <div className="welcome-avatar">CB</div>
            <h1 className="welcome-title">How can I help you today?</h1>
            <p className="welcome-sub">
              Ask about SAP issues, error messages or how-tos. I'll search the knowledge base for you.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="suggestion-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                showTicketButton={m.role === "assistant" && m.found === false}
                onRaiseTicket={() => setTicketOpen(true)}
              />
            ))}
            {loading && (
              <div className="msg msg-assistant">
                <div className="msg-avatar">CB</div>
                <div className="msg-body">
                  <div className="msg-name">Support Assistant</div>
                  <div className="typing">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="composer-wrap">
        <div className="composer">
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the support assistant…"
            disabled={loading}
          />
          <button
            type="button"
            className="composer-send"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <SendIcon className="icon-sm" />
          </button>
        </div>
        <p className="composer-hint">
          The assistant answers from your uploaded knowledge base. Verify important details.
        </p>
      </div>

      {ticketOpen && (
        <TicketModal
          query={lastUserQuery}
          conversation={messages.map(({ role, content }) => ({ role, content }))}
          onClose={() => setTicketOpen(false)}
        />
      )}
    </div>
  );
}
