import React, { useState } from "react";
import {
  MessageSquare,
  Search,
  Send,
  User,
  CheckCheck,
  Clock,
  Briefcase,
  Paperclip,
  Smile,
  MoreVertical,
  Circle,
} from "lucide-react";
import "../styles/companyDashboard.css";
import "../styles/message.css";

const initialThreads = [
  {
    id: "thread-1",
    candidateName: "Fatima Noor",
    role: "UI/UX Designer Candidate",
    avatar: "FN",
    online: true,
    unread: 1,
    lastMessageTime: "10:30 AM",
    messages: [
      {
        id: "m-1",
        sender: "candidate",
        text: "Hi! I submitted my application for the UI/UX Designer opening.",
        time: "10:15 AM",
      },
      {
        id: "m-2",
        sender: "company",
        text: "Hello Fatima! We reviewed your portfolio and were really impressed with your case studies.",
        time: "10:22 AM",
      },
      {
        id: "m-3",
        sender: "candidate",
        text: "Thank you! I wanted to inquire about the remote policy and next steps for the assessment.",
        time: "10:30 AM",
      },
    ],
  },
  {
    id: "thread-2",
    candidateName: "Ali Raza",
    role: "Frontend Developer Candidate",
    avatar: "AR",
    online: false,
    unread: 0,
    lastMessageTime: "Yesterday",
    messages: [
      {
        id: "m-4",
        sender: "company",
        text: "Hi Ali, we have invited you to take the React technical assessment.",
        time: "Yesterday, 3:00 PM",
      },
      {
        id: "m-5",
        sender: "candidate",
        text: "Thank you for the opportunity! I have completed the test and accepted the interview calendar invite.",
        time: "Yesterday, 4:45 PM",
      },
    ],
  },
  {
    id: "thread-3",
    candidateName: "Sara Khan",
    role: "Backend Developer Candidate",
    avatar: "SK",
    online: true,
    unread: 0,
    lastMessageTime: "2 days ago",
    messages: [
      {
        id: "m-6",
        sender: "candidate",
        text: "Hello, could we possibly shift our interview scheduled for Thursday by 30 minutes?",
        time: "2 days ago, 11:20 AM",
      },
      {
        id: "m-7",
        sender: "company",
        text: "Sure Sara, 11:30 AM works well for our engineering panel.",
        time: "2 days ago, 1:15 PM",
      },
    ],
  },
  {
    id: "thread-4",
    candidateName: "Usman Ali",
    role: "Full Stack Engineer",
    avatar: "UA",
    online: false,
    unread: 0,
    lastMessageTime: "Oct 24",
    messages: [
      {
        id: "m-8",
        sender: "candidate",
        text: "I have shared my updated GitHub repository with the requested microservices challenge.",
        time: "Oct 24, 6:10 PM",
      },
    ],
  },
];

export default function CompanyMessagesPage() {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState("thread-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const filteredThreads = threads.filter(
    (t) =>
      t.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newMessage = {
      id: `m-${Date.now()}`,
      sender: "company",
      text: replyText.trim(),
      time: "Just now",
    };

    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === selectedThreadId) {
          return {
            ...thread,
            unread: 0,
            lastMessageTime: "Just now",
            messages: [...thread.messages, newMessage],
          };
        }
        return thread;
      })
    );

    setReplyText("");
  };

  return (
    <div className="comp-page-container">
      {/* Page Header */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Candidate & Recruiter Messages</h1>
          <p>Direct communication hub for applicant queries, interviews, and updates</p>
        </div>
      </div>

      {/* Messages Layout Split Panel */}
      <div className="comp-messages-layout">
        {/* Left: Threads Sidebar */}
        <div className="comp-messages-sidebar">
          <div className="comp-messages-search-wrap">
            <Search size={16} className="comp-messages-search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="comp-messages-search-input"
            />
          </div>

          <div className="comp-threads-list">
            {filteredThreads.map((thread) => {
              const isSelected = thread.id === activeThread?.id;
              const lastMsg = thread.messages[thread.messages.length - 1];

              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    // Mark as read
                    setThreads((prev) =>
                      prev.map((t) => (t.id === thread.id ? { ...t, unread: 0 } : t))
                    );
                  }}
                  className={`comp-thread-item ${isSelected ? "selected" : ""}`}
                >
                  <div className="comp-thread-avatar-wrap">
                    <div className="comp-thread-avatar">{thread.avatar}</div>
                    {thread.online && <span className="comp-online-dot" />}
                  </div>

                  <div className="comp-thread-info">
                    <div className="comp-thread-top">
                      <span className="comp-thread-name">{thread.candidateName}</span>
                      <span className="comp-thread-time">{thread.lastMessageTime}</span>
                    </div>
                    <span className="comp-thread-role">{thread.role}</span>
                    <p className="comp-thread-snippet">
                      {lastMsg ? lastMsg.text : "No messages yet"}
                    </p>
                  </div>

                  {thread.unread > 0 && (
                    <span className="comp-thread-unread-badge">{thread.unread}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Area */}
        <div className="comp-messages-main">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="comp-chat-header">
                <div className="comp-chat-candidate-info">
                  <div className="comp-thread-avatar-wrap">
                    <div className="comp-thread-avatar">{activeThread.avatar}</div>
                    {activeThread.online && <span className="comp-online-dot" />}
                  </div>
                  <div>
                    <h3 className="comp-chat-candidate-name">{activeThread.candidateName}</h3>
                    <span className="comp-chat-candidate-role">
                      <Briefcase size={12} style={{ display: "inline", marginRight: 4 }} />
                      {activeThread.role} • {activeThread.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>

                <div className="comp-chat-header-actions">
                  <span className="comp-chat-channel-badge">Active Application</span>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="comp-chat-body">
                {activeThread.messages.map((msg) => {
                  const isCompany = msg.sender === "company";
                  return (
                    <div
                      key={msg.id}
                      className={`comp-chat-bubble-wrap ${isCompany ? "outgoing" : "incoming"}`}
                    >
                      <div className={`comp-chat-bubble ${isCompany ? "company" : "candidate"}`}>
                        <p className="comp-chat-text">{msg.text}</p>
                        <span className="comp-chat-time">
                          {msg.time}
                          {isCompany && <CheckCheck size={14} style={{ marginLeft: 4 }} />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="comp-chat-input-bar">
                <input
                  type="text"
                  placeholder={`Reply to ${activeThread.candidateName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="comp-chat-input"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="comp-chat-send-btn"
                  title="Send Message"
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="comp-chat-empty">
              <MessageSquare size={48} style={{ color: "#cbd5e1", marginBottom: 12 }} />
              <h4>Select a Conversation</h4>
              <p>Choose an applicant conversation from the left to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
