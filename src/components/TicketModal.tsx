import { useEffect, useState } from "react";
import { raiseTicket, summarizeConversation } from "../lib/api";
import type { ChatMessage } from "../lib/types";

interface TicketModalProps {
  query: string;
  conversation: ChatMessage[];
  onClose: () => void;
}

export default function TicketModal({ query, conversation, onClose }: TicketModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [summarizing, setSummarizing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummarizing(true);
    summarizeConversation(conversation, query)
      .then((res) => {
        if (!cancelled) setDescription(res.summary || query);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setDescription(query);
      })
      .finally(() => {
        if (!cancelled) setSummarizing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversation, query]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await raiseTicket({ query, conversation, name, email, description });
      setTicketId(res.ticketId);
    } catch (err) {
      console.error(err);
      setError("Something went wrong creating your ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {ticketId ? (
          <>
            <div className="ticket-success-icon">✓</div>
            <h2>Ticket created</h2>
            <p className="modal-sub">
              Your ticket has been logged. Our support team will follow up. Please keep this reference:
            </p>
            <div className="ticket-id">{ticketId}</div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Raise a support ticket</h2>
            <p className="modal-sub">
              We couldn't find an answer. We've summarized your conversation below — review and submit.
            </p>

            <label className="field">
              <span>Your name (optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Your email (optional)</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span>Issue summary {summarizing && <em className="muted">— generating…</em>}</span>
              {summarizing ? (
                <div className="summary-skeleton">
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
              )}
            </label>

            {error && <p className="error-text">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting || summarizing || !description.trim()}
                onClick={handleSubmit}
              >
                {submitting ? "Creating…" : "Submit Ticket"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
