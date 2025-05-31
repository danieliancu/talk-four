import { useState, useRef, useEffect } from "react";
import Mustache from "mustache";
import chatConfig from "../config/chatConfig";

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

const sendMessage = async (e) => {
  e.preventDefault();
  const text = input.trim();
  if (!text) return;

  setLastQuery(text);
  const userMsg = {
    role: "user",
    content: text,
    isProducts: false // 👈 adaugă explicit
  };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [...messages, userMsg] })
  });

  const data = await res.json();
  if (data.message) {
    const assistantMsg = {
      ...data.message,
      isProducts: data.isProducts === true // 👈 setează explicit, altfel va lipsi
    };
    setMessages((prev) => [...prev, assistantMsg]);
  }
};


  const { inputPlaceholder, sendButtonText, labels, productCard } = chatConfig.ui;

  const renderMessage = (m, idx) => {
if (m.role === "assistant" && m.isProducts === true) {
  let parsed = null;
  try {
    parsed = JSON.parse(m.content.trim());
  } catch {
    parsed = null;
  }

  if (Array.isArray(parsed)) {
    return (
      <div key={`prod-list-${idx}`}>
        {parsed.map((prod, i) => {
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
}

    return (
      <div key={idx} className={`message ${m.role}`}>
        <strong>
          {m.role === "user" ? labels.user : labels.assistant}:
        </strong>{" "}
        {m.content}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="header">{chatConfig.ui.appTitle}</div>
      <div className="chat-window">
        {messages.map((m, idx) => renderMessage(m, idx))}
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
