import { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import ChatArea from "./components/ChatArea.jsx";
import InputBar from "./components/InputBar.jsx";
import EmptyState from "./components/EmptyState.jsx";
import InterviewPrep from "./components/InterviewPrep.jsx";
import * as api from "./api/client.js";

export default function App() {
  const [view, setView] = useState("chat"); // "chat" | "interview"
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [models, setModels] = useState([{ id: "openai/gpt-4o-mini", name: "GPT-4o mini" }]);
  const [streamingText, setStreamingText] = useState(null); // null = not streaming
  const [streamingModel, setStreamingModel] = useState(null);
  const [error, setError] = useState(null);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Initial load: models + conversation list
  useEffect(() => {
    api.fetchModels().then(setModels).catch(() => {});
    api.fetchConversations().then(setConversations).catch((e) => setError(e.message));
  }, []);

  const loadConversation = useCallback(async (id) => {
    setError(null);
    try {
      const convo = await api.fetchConversation(id);
      setActiveId(id);
      setMessages(convo.messages);
      setModel(convo.model);
    } catch (e) {
      setError(e.message);
    }
  }, []);

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
    } catch (e) {
      setError(e.message);
    }
  }, [model, refreshList]);

  const handleDelete = useCallback(
    async (id) => {
      await api.deleteConversation(id).catch((e) => setError(e.message));
      const list = await refreshList();
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

      // Lazily create a conversation if the user typed before clicking "New chat".
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

      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, role: "user", content },
      ]);
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

  return (
    <div className="h-screen w-screen flex bg-base-950">
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={loadConversation}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        onRename={handleRename}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={
            view === "interview"
              ? "Interview Prep"
              : activeConversation?.title || "Chat Startup"
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

        {view === "interview" ? (
          <InterviewPrep models={models} model={model} onModelChange={setModel} />
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
