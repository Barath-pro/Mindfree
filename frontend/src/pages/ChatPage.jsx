import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient, resolveAssetUrl } from "../api/client.js";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../hooks/useSocket.js";

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function ChatPage() {
  const { token, user, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [banner, setBanner] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingDraft, setEditingDraft] = useState("");
  const [safetyStatus, setSafetyStatus] = useState({ warningCount: 0, tempBlockedUntil: null });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef(null);

  const syncChatPreview = (message) => {
    setChats((current) =>
      current
        .map((chat) =>
          chat.chat_id === message.chat_id
            ? { ...chat, lastMessageAt: message.timestamp, lastMessage: message }
            : chat
        )
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    );
  };

  const upsertMessage = (message) => {
    if (!message) {
      return;
    }

    syncChatPreview(message);
    setMessages((current) => {
      const existingIndex = current.findIndex((item) => item.message_id === message.message_id);

      if (existingIndex === -1) {
        if (activeChat?.chat_id !== message.chat_id) {
          return current;
        }

        return [...current, message];
      }

      const next = [...current];
      next[existingIndex] = message;
      return next;
    });
  };

  const removeMessage = ({ chat_id: chatId, message_id: messageId }) => {
    setMessages((current) => current.filter((item) => item.message_id !== messageId));
    setChats((current) =>
      current.map((chat) =>
        chat.chat_id === chatId && chat.lastMessage?.message_id === messageId
          ? { ...chat, lastMessage: null }
          : chat
      )
    );
  };

  const { socket, connected } = useSocket(token, {
    onMessage: (message) => upsertMessage(message),
    onMessageUpdate: (message) => upsertMessage(message),
    onMessageDelete: (payload) => removeMessage(payload),
    onWarning: ({ moderation }) => {
      if (moderation?.warningIssued) {
        setBanner("Message delivered with a safety warning.");
      }
    }
  });

  const contactLabel = user?.role === "patient" ? "Psychologists" : "Patients";

  const activeCounterpart = useMemo(() => {
    if (!activeChat) {
      return null;
    }

    return activeChat.counterpart || activeChat.participants.find((participant) => participant.id !== user.id);
  }, [activeChat, user]);

  const selectChat = async (chat) => {
    setActiveChat(chat);
    const { data } = await apiClient.get(`/chats/${chat.chat_id}/messages`);
    setMessages(data.messages);
  };

  const refreshSafetyStatus = async () => {
    try {
      const { data } = await apiClient.get("/chats/safety/me");
      setSafetyStatus({
        warningCount: data.warningCount,
        tempBlockedUntil: data.tempBlockedUntil
      });
    } catch (_error) {
      // We keep the current UI state if the refresh fails.
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);

      try {
        const [{ data: contactsResponse }, { data: chatsResponse }, { data: safetyResponse }] = await Promise.all([
          apiClient.get("/chats/contacts"),
          apiClient.get("/chats"),
          apiClient.get("/chats/safety/me")
        ]);

        setContacts(contactsResponse.contacts);
        setChats(chatsResponse.chats);
        setSafetyStatus({
          warningCount: safetyResponse.warningCount,
          tempBlockedUntil: safetyResponse.tempBlockedUntil
        });

        if (chatsResponse.chats.length > 0) {
          await selectChat(chatsResponse.chats[0]);
        }
      } catch (error) {
        setBanner(error.response?.data?.message || "Unable to load conversations right now.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    if (socket && activeChat?.chat_id) {
      socket.emit("join-chat", { chatId: activeChat.chat_id });
    }
  }, [socket, activeChat]);

  const startChat = async (contact) => {
    const { data } = await apiClient.post("/chats", { participantId: contact.id });

    setChats((current) => {
      const existing = current.find((chat) => chat.chat_id === data.chat.chat_id);
      return existing ? current : [data.chat, ...current];
    });

    await selectChat(data.chat);
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!draft.trim() || !activeChat || !socket) {
      return;
    }

    setSending(true);
    setBanner("");
    setVoiceStatus("");

    socket.emit("send-message", { chatId: activeChat.chat_id, content: draft.trim() }, (response) => {
      setSending(false);

      if (!response.success) {
        const text = response.blocked ? "Message blocked by the safety check." : response.message || "Unable to send message.";
        refreshSafetyStatus();
        setBanner(text);
        return;
      }

      if (response.moderation.warningIssued) {
        refreshSafetyStatus();
        setBanner("Message delivered with a safety warning.");
      }
    });

    setDraft("");
  };

  const handleClearChat = async () => {
    if (!activeChat || !window.confirm("Are you sure you want to clear this entire conversation?")) {
      return;
    }
    
    try {
      setBanner("Clearing chat...");
      await apiClient.delete(`/chats/${activeChat.chat_id}/messages`);
      setMessages([]);
      setBanner("");
    } catch (error) {
      setBanner("Failed to clear chat memory.");
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleRemoveChat = async (chatIdToRemove) => {
    if (!window.confirm("Are you sure you want to completely remove this chat?")) return;
    
    try {
      await apiClient.delete(`/chats/${chatIdToRemove}`);
      setChats(current => current.filter(c => c.chat_id !== chatIdToRemove));
      if (activeChat?.chat_id === chatIdToRemove) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (error) {
      setBanner("Failed to remove chat.");
    }
  };

  const handleDraftKeyDown = (event) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!sending && connected) {
        sendMessage(event);
      }
    }
  };

  const beginEditing = (message) => {
    setEditingMessageId(message.message_id);
    setEditingDraft(message.content);
    setBanner("");
  };

  const cancelEditing = () => {
    setEditingMessageId("");
    setEditingDraft("");
  };

  const saveEditedMessage = async (message) => {
    if (!editingDraft.trim()) {
      return;
    }

    try {
      const { data } = await apiClient.patch(`/chats/${message.chat_id}/messages/${message.message_id}`, {
        content: editingDraft.trim()
      });

      if (!data.success) {
        const text = data.blocked ? "Edited message blocked by the safety check." : data.message || "Unable to update message.";
        setBanner(text);
        return;
      }

      upsertMessage(data.message);
      cancelEditing();
    } catch (error) {
      setBanner(error.response?.data?.message || "Unable to update message.");
    }
  };

  const deleteMessage = async (message) => {
    try {
      await apiClient.delete(`/chats/${message.chat_id}/messages/${message.message_id}`);
      removeMessage({ chat_id: message.chat_id, message_id: message.message_id });
    } catch (error) {
      setBanner(error.response?.data?.message || "Unable to delete message.");
    }
  };

  if (loading) {
    return <div className="screen-loader">Loading conversations...</div>;
  }

  return (
    <div className={`chat-app ${sidebarOpen ? "sidebar-mobile-open" : ""}`}>
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="sidebar__top">
          <div>
            <p className="eyebrow">Mindfree</p>
            <h2>{user.role === "patient" ? "Care chat" : "Clinical console"}</h2>
          </div>
          <button className="text-button" type="button" onClick={logout}>
            Sign out
          </button>
        </div>

        <div className="status-card">
          <strong>{user.fullName}</strong>
          <span>{user.role}</span>
          <span>{connected ? "Realtime connected" : "Connecting..."}</span>
          <span>Warnings: {safetyStatus.warningCount}</span>
          {safetyStatus.tempBlockedUntil ? (
            <span>Blocked until: {new Date(safetyStatus.tempBlockedUntil).toLocaleString()}</span>
          ) : null}
        </div>

        <section className="sidebar__section">
          <div className="section-header">
            <h3>Recent chats</h3>
          </div>
          <div className="chat-list">
            {chats.map((chat) => (
              <div
                key={chat.chat_id}
                className={`chat-list__item ${activeChat?.chat_id === chat.chat_id ? "is-active" : ""}`}
                onClick={() => selectChat(chat)}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <strong>{chat.counterpart?.fullName || "Conversation"}</strong>
                <button 
                  className="text-button" 
                  style={{ padding: "4px 8px", fontSize: "12px", background: "rgba(180, 83, 9, 0.1)", color: "var(--alert)", borderRadius: "6px" }}
                  onClick={(e) => { e.stopPropagation(); handleRemoveChat(chat.chat_id); }}
                  title="Remove chat"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="sidebar__section">
          <div className="section-header">
            <h3>{contactLabel}</h3>
          </div>
          <div className="contact-list">
            {contacts.map((contact) => (
              <button key={contact.id} className="contact-pill" type="button" onClick={() => startChat(contact)}>
                {contact.fullName}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="chat-panel">
        {activeChat ? (
          <>
            <header className="chat-panel__header">
              <div className="chat-panel__header-group">
                <button className="text-button mobile-only-button" type="button" onClick={toggleSidebar}>
                  {sidebarOpen ? "Close menu" : "Menu"}
                </button>
                <div>
                  <p className="eyebrow">1:1 conversation</p>
                  <h1>{activeCounterpart?.fullName}</h1>
                  <p>{activeCounterpart?.role}</p>
                </div>
              </div>
              <div className="chat-panel__header-actions">
                <button className="secondary-button" type="button" onClick={handleClearChat}>
                  Clear Chat
                </button>
              </div>
              {banner ? <div className="banner">{banner}</div> : null}
            </header>

            <section className="message-stream">
              {messages.map((message) => {
                const mine = message.sender_id === user.id;
                const isEditing = editingMessageId === message.message_id;
                const canEdit = mine && message.messageType === "text";
                const canDelete = mine;

                return (
                  <article key={message.message_id} className={`message-card ${mine ? "is-mine" : ""}`}>
                    <div className="message-card__meta">
                      <span>{mine ? "You" : message.sender?.fullName || activeCounterpart?.fullName}</span>
                      <span>
                        {formatTime(message.timestamp)}
                        {message.editedAt ? " edited" : ""}
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="message-editor">
                        <textarea
                          rows={3}
                          value={editingDraft}
                          onChange={(event) => setEditingDraft(event.target.value)}
                        />
                        <div className="message-editor__actions">
                          <button className="text-button" type="button" onClick={cancelEditing}>
                            Cancel
                          </button>
                          <button className="primary-button" type="button" onClick={() => saveEditedMessage(message)}>
                            Save
                          </button>
                        </div>
                      </div>
                    ) : message.messageType === "voice" ? (
                      <p className="message-card__label">Voice message</p>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    {message.audioUrl ? (
                      <audio controls src={resolveAssetUrl(message.audioUrl)}>
                        <track kind="captions" />
                      </audio>
                    ) : null}
                    {canEdit || canDelete ? (
                      <div className="message-card__actions">
                        {canEdit ? (
                          <button className="text-button" type="button" onClick={() => beginEditing(message)}>
                            Edit
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button className="text-button" type="button" onClick={() => deleteMessage(message)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>

            <form className="composer" onSubmit={sendMessage}>
              <textarea
                ref={textareaRef}
                placeholder="Share what you need support with..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                rows={3}
              />
              <div className="composer__actions">
                <VoiceRecorder
                  disabled={!activeChat}
                  onSendVoice={async (blob) => {
                    const formData = new FormData();
                    formData.append("audio", blob, "voice-input.webm");
                    try {
                      setSending(true);
                      setBanner("");
                      setVoiceStatus("Uploading voice message...");
                      
                      const response = await apiClient.post(`/chats/${activeChat.chat_id}/voice`, formData);
                      
                      setVoiceStatus("");
                      
                      if (!response.data.success) {
                        const text = response.data.blocked ? "Message blocked by the safety check." : response.data.message || "Unable to send voice message.";
                        refreshSafetyStatus();
                        setBanner(text);
                        return;
                      }

                      upsertMessage(response.data.message);

                      if (response.data.moderation?.warningIssued) {
                        refreshSafetyStatus();
                        setBanner("Message delivered with a safety warning.");
                      }

                    } catch (error) {
                      setBanner(error.response?.data?.message || "Unable to send voice message.");
                      setVoiceStatus("");
                      throw error;
                    } finally {
                      setSending(false);
                    }
                  }}
                  onError={setBanner}
                  onStatusChange={setVoiceStatus}
                />
                <button className="primary-button" type="submit" disabled={sending || !connected}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
              {voiceStatus ? <p className="helper-text composer__status">{voiceStatus}</p> : null}
            </form>
          </>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">Start here</p>
            <h1>Choose someone from the sidebar to open a secure chat.</h1>
          </div>
        )}
      </main>
    </div>
  );
}
