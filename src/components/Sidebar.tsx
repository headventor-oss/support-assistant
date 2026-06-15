import { NavLink, useNavigate } from "react-router-dom";
import { AdminIcon, AnalysisIcon, ChatIcon, PlusIcon } from "./icons";
import { useConversations } from "../lib/ConversationsContext";

interface SidebarProps {
  open: boolean;
  onNewChat: () => void;
  onNavigate: () => void;
}

export default function Sidebar({ open, onNewChat, onNavigate }: SidebarProps) {
  const { conversations, currentId, openConversation, deleteConversation } = useConversations();
  const navigate = useNavigate();

  function handleOpen(id: string) {
    openConversation(id);
    navigate("/");
    onNavigate();
  }

  return (
    <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">CB</span>
        <span className="brand-name">CodersBrain</span>
      </div>

      <button type="button" className="new-chat-btn" onClick={onNewChat}>
        <PlusIcon className="icon-sm" />
        New chat
      </button>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          <ChatIcon className="icon-sm" />
          Support Chat
        </NavLink>
        <NavLink
          to="/analysis"
          onClick={onNavigate}
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          <AnalysisIcon className="icon-sm" />
          Analysis
        </NavLink>
        <NavLink
          to="/admin"
          onClick={onNavigate}
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          <AdminIcon className="icon-sm" />
          Admin
        </NavLink>
      </nav>

      <div className="sidebar-history">
        <p className="sidebar-section-label">Recent chats</p>
        {conversations.length === 0 ? (
          <p className="sidebar-empty">No conversations yet</p>
        ) : (
          <div className="conv-list">
            {conversations.map((c) => (
              <div key={c.id} className={`conv-item${c.id === currentId ? " active" : ""}`}>
                <button type="button" className="conv-item-btn" title={c.title} onClick={() => handleOpen(c.id)}>
                  <ChatIcon className="icon-xs" />
                  <span className="conv-title">{c.title}</span>
                </button>
                <button
                  type="button"
                  className="conv-del"
                  aria-label="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <p className="sidebar-footer-title">Support Assistant</p>
        <p className="sidebar-footer-sub">Powered by CodersBrain</p>
      </div>
    </aside>
  );
}
