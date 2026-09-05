import { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import ChatArea from "./components/ChatArea.jsx";
import InputBar from "./components/InputBar.jsx";
import EmptyState from "./components/EmptyState.jsx";
import InterviewPrep from "./components/InterviewPrep.jsx";
import LiveInterview from "./components/LiveInterview.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import OnboardingWizard from "./components/OnboardingWizard.jsx";
import Roadmap from "./components/Roadmap.jsx";
import TestCenter from "./components/TestCenter.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import * as api from "./api/client.js";

function SplashScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-base-950 bg-aurora">
      <div className="w-12 h-12 rounded-2xl bg-brand-gradient shadow-glow flex items-center justify-center animate-floatSlow">
        <span className="text-white text-xl font-bold">✦</span>
      </div>
    </div>
  );
}

function GenerateRoadmapPrompt({ onGenerate, generating, error }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-brand-gradient shadow-glow mx-auto mb-5 flex items-center justify-center">
          <span className="text-white text-2xl">🗺️</span>
        </div>
        <h2 className="font-display font-bold text-lg mb-2">
          Your roadmap isn't generated yet
        </h2>
        <p className="text-sm text-ink-500 mb-5 leading-relaxed">
          We have your prep details saved — generate your personalized
          roadmap whenever you're ready.
        </p>
        {error && (
          <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3 mb-4 text-left">
            {error}
          </div>
        )}
        <button
          onClick={onGenerate}
          disabled={generating}
          className="rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 transition-opacity px-5 py-2.5 text-sm font-semibold text-white"
        >
          {generating ? "Generating…" : "Generate my roadmap →"}
        </button>
      </div>
    </div>
  );
}

function MainApp() {
  const { user, setUser, logout } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [view, setView] = useState("roadmap"); // "roadmap" | "test" | "interview" | "live" | "chat"
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768
  );
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [models, setModels] = useState([{ id: "openai/gpt-4o-mini", name: "GPT-4o mini" }]);
  const [streamingText, setStreamingText] = useState(null);
  const [streamingModel, setStreamingModel] = useState(null);
  const [error, setError] = useState(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [roadmapError, setRoadmapError] = useState(null);
  const [testPreselectCompany, setTestPreselectCompany] = useState(null);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  useEffect(() => {
    api.fetchModels().then(setModels).catch(() => {});
    api.fetchConversations().then(setConversations).catch((e) => setError(e.message));
  }, []);

  const closeSidebarOnMobile = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const loadConversation = useCallback(
    async (id) => {
      setError(null);
      try {
        const convo = await api.fetchConversation(id);
        setActiveId(id);
        setMessages(convo.messages);
        setModel(convo.model);
        setView("chat");
        closeSidebarOnMobile();
      } catch (e) {
        setError(e.message);
      }
    },
    [closeSidebarOnMobile]
  );

  const refreshList = useCallback(async () => {
    const list = await api.fetchConversations();
    setConversations(list);
    return list;
  }, []);

  const handleNewChat = useCallback(async () => {
    setError(null);
    try {
      const convo = await api.createConversation(model);
      await refreshList();
      setActiveId(convo.id);
      setMessages([]);
      setView("chat");
      closeSidebarOnMobile();
    } catch (e) {
      setError(e.message);
    }
  }, [model, refreshList, closeSidebarOnMobile]);

  const handleDelete = useCallback(
    async (id) => {
      await api.deleteConversation(id).catch((e) => setError(e.message));
      await refreshList();
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    },
    [activeId, refreshList]
  );

  const handleRename = useCallback(
    async (id, title) => {
      await api.renameConversation(id, title).catch((e) => setError(e.message));
      refreshList();
    },
    [refreshList]
  );

  const handleSend = useCallback(
    async (content) => {
      setError(null);
      let conversationId = activeId;

      if (!conversationId) {
        try {
          const convo = await api.createConversation(model);
          conversationId = convo.id;
          setActiveId(conversationId);
          await refreshList();
        } catch (e) {
          setError(e.message);
          return;
        }
      }

      setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content }]);
      setStreamingText("");
      setStreamingModel(model);

      try {
        await api.sendMessageStream(
          { conversationId, content, model },
          {
            onToken: (text) => setStreamingText((prev) => (prev ?? "") + text),
            onDone: (message) => {
              setMessages((prev) => [...prev, message]);
              setStreamingText(null);
              setStreamingModel(null);
              refreshList();
            },
            onError: (msg) => {
              setError(msg);
              setStreamingText(null);
              setStreamingModel(null);
            },
          }
        );
      } catch (e) {
        setError(e.message);
        setStreamingText(null);
        setStreamingModel(null);
      }
    },
    [activeId, model, refreshList]
  );

  const handleGenerateRoadmap = useCallback(async () => {
    setGeneratingRoadmap(true);
    setRoadmapError(null);
    try {
      const { roadmap } = await api.generateRoadmap();
      setUser((u) => ({ ...u, roadmap }));
    } catch (e) {
      setRoadmapError(e.message);
    } finally {
      setGeneratingRoadmap(false);
    }
  }, [setUser]);

  const goTest = useCallback((company) => {
    setTestPreselectCompany(company || null);
    setView("test");
  }, []);

  if (editingProfile) {
    return (
      <OnboardingWizard
        initialProfile={user.profile}
        onCancel={() => setEditingProfile(false)}
        onDone={() => {
          setEditingProfile(false);
          setView("roadmap");
        }}
      />
    );
  }

  const titleByView = {
    roadmap: "Your Roadmap",
    interview: "Question Bank",
    live: "Live Interview",
    test: "Test Center",
  };

  return (
    <div className="h-screen w-screen flex bg-base-950 selection:bg-accent/30 selection:text-white">
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={loadConversation}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        onRename={handleRename}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={
            titleByView[view] || activeConversation?.title || "Interview Prep"
          }
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          models={models}
          model={model}
          onModelChange={setModel}
          showModelSelector={view === "chat"}
          view={view}
          onViewChange={setView}
        />

        {error && (
          <div className="bg-signal-rose/10 border-b border-signal-rose/30 text-signal-rose text-sm px-4 py-2">
            {error}
          </div>
        )}

        {view === "roadmap" ? (
          user.roadmap ? (
            <Roadmap
              roadmap={user.roadmap}
              onRoadmapChange={(roadmap) => setUser((u) => ({ ...u, roadmap }))}
              onGoTest={goTest}
              onEditProfile={() => setEditingProfile(true)}
            />
          ) : (
            <GenerateRoadmapPrompt
              onGenerate={handleGenerateRoadmap}
              generating={generatingRoadmap}
              error={roadmapError}
            />
          )
        ) : view === "test" ? (
          <TestCenter
            user={user}
            preselectedCompany={testPreselectCompany}
            onConsumePreselect={() => setTestPreselectCompany(null)}
          />
        ) : view === "interview" ? (
          <InterviewPrep
            models={models}
            model={model}
            onModelChange={setModel}
            onGoLive={() => setView("live")}
          />
        ) : view === "live" ? (
          <LiveInterview models={models} model={model} onModelChange={setModel} />
        ) : activeId ? (
          <>
            <ChatArea
              messages={messages}
              streamingText={streamingText}
              streamingModel={streamingModel}
            />
            <InputBar onSend={handleSend} disabled={streamingText !== null} />
          </>
        ) : (
          <>
            <EmptyState onNewChat={handleNewChat} />
            <InputBar
              onSend={handleSend}
              disabled={streamingText !== null}
              placeholder="Message to start a new chat..."
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { user, checkingSession } = useAuth();

  if (checkingSession) return <SplashScreen />;
  if (!user) return <AuthScreen />;
  if (!user.profile) {
    // OnboardingWizard updates the shared auth user via context as soon as
    // it saves the profile + roadmap, so App re-renders into MainApp
    // automatically — no reload needed.
    return <OnboardingWizard onDone={() => {}} />;
  }
  return <MainApp />;
}
