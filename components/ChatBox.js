import { useState, useRef, useEffect } from "react";
import Mustache from "mustache";
import chatConfig from "../config/chatConfig";

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dots, setDots] = useState(".");
  const endRef = useRef(null);

  // Scroll la fiecare mesaj nou
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Animația la "Scrie..."
  useEffect(() => {
    if (!isTyping) return;
    const interval = setInterval(() => {
      setDots(dots => (dots.length < 3 ? dots + "." : "."));
    }, 400);
    return () => clearInterval(interval);
  }, [isTyping]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg = {
      role: "user",
      content: text,
      isProducts: false
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true); // <-- Pornește indicatorul

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg] })
    });

    const data = await res.json();
    if (data.message) {
      const assistantMsg = {
        ...data.message,
        isProducts: data.isProducts === true,
        explanation: data.explanation || null
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }
    setIsTyping(false); // <-- Oprește indicatorul
  };

  const { inputPlaceholder, sendButtonText, labels, productCard } = chatConfig.ui;

  const renderMessage = (m, idx) => {
    // Răspuns cu produse + explanation
    if (m.role === "assistant" && m.isProducts === true) {
      let parsed = null;
      try {
        parsed = JSON.parse(m.content.trim());
      } catch {
        parsed = null;
      }

      return (
        <div key={`prod-list-${idx}`}>
          {m.explanation && (
            <div className="assistant-explanation">
              {m.explanation}
            </div>
          )}
          {Array.isArray(parsed) && parsed.map((prod, i) => {
            const view = { ...prod, ...productCard.styles };
            const html = Mustache.render(productCard.template, view);
            return (
              <div
                key={`card-${idx}-${i}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          })}
        </div>
      );
    }

    // Restul mesajelor (text simple)
    return (
      <div key={idx} className={`message ${m.role}`}>
        <strong>
          {m.role === "user" ? labels.user : labels.assistant}:
        </strong>{" "}
        <span dangerouslySetInnerHTML={{ __html: m.content }} />
      </div>
    );
  };

  return (
    <div className="container">
      <div className="header">{chatConfig.ui.appTitle}</div>
      <div className="chat-window">
        {messages.map((m, idx) => renderMessage(m, idx))}
        {isTyping && (
          <div className="message assistant typing-indicator">
            <strong>{labels.assistant}:</strong>{" "}
            <span>
              <span className="typing-dots-3">
                <span className="dot dot1"></span>
                <span className="dot dot2"></span>
                <span className="dot dot3"></span>
              </span>
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form className="input-area" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder={inputPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">{sendButtonText}</button>
      </form>
    </div>
  );
}

