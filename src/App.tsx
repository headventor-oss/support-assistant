import { Suspense, lazy, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import { MenuIcon, MoonIcon, SunIcon } from "./components/icons";
import FusoLogo from "./components/FusoLogo";
import { useConversations } from "./lib/ConversationsContext";
import { useTheme } from "./lib/ThemeContext";

const AdminPage = lazy(() => import("./pages/AdminPage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { startNewChat } = useConversations();
  const { theme, toggle } = useTheme();
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
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <MenuIcon className="icon-sm" />
            </button>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <SunIcon className="icon-sm" /> : <MoonIcon className="icon-sm" />}
            </button>
            <FusoLogo className="fuso-logo" />
          </div>
        </header>

        <div className="app-body">
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
    </div>
  );
}

export default App;
