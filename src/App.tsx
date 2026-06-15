import { Suspense, lazy, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import { MenuIcon } from "./components/icons";
import { useConversations } from "./lib/ConversationsContext";

const AdminPage = lazy(() => import("./pages/AdminPage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { startNewChat } = useConversations();
  const navigate = useNavigate();

  function handleNewChat() {
    startNewChat();
    setSidebarOpen(false);
    navigate("/");
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNewChat={handleNewChat} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

      <div className="app-content">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <MenuIcon className="icon-sm" />
        </button>

        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route
            path="/analysis"
            element={
              <Suspense fallback={<div className="page-loading">Loading…</div>}>
                <AnalysisPage />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<div className="page-loading">Loading…</div>}>
                <AdminPage />
              </Suspense>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
