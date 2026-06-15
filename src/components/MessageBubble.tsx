import { TicketIcon } from "./icons";
import type { ChatMessage } from "../lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  showTicketButton?: boolean;
  onRaiseTicket?: () => void;
}

export default function MessageBubble({ message, showTicketButton, onRaiseTicket }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="msg msg-user">
        <div className="msg-user-bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar">CB</div>
      <div className="msg-body">
        <div className="msg-name">Support Assistant</div>
        <div className="msg-text">{message.content}</div>
        {showTicketButton && (
          <button type="button" className="ticket-cta" onClick={onRaiseTicket}>
            <TicketIcon className="icon-sm" />
            Raise a support ticket
          </button>
        )}
      </div>
    </div>
  );
}
