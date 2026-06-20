import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { askLLM } from "./lib/groq";
import ReactMarkdown from "react-markdown";

import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I am LinearCue. Ask me anything, speak, or capture your screen." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("ready");
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(questionOverride = null) {
    const question = (questionOverride || input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      setStatus("capturing");
      await invoke("capture_screen");
      const screenText = await invoke("extract_text_from_screen");
      setStatus("thinking");
      const answer = await askLLM(question, screenText || "", transcript);
      setMessages(prev => [...prev, { role: "assistant", text: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Error: " + (err.message || err)
      }]);
    } finally {
      setLoading(false);
      setStatus("ready");
    }
  }

  async function handleMic() {
    if (recording || loading) return;
    setRecording(true);
    setStatus("recording");
    try {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Recording for 5 seconds... speak now"
      }]);
      await invoke("record_audio");
      setStatus("transcribing");
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Transcribing..."
      }]);
      const text = await invoke("transcribe_audio");
      if (text && text.trim()) {
        setTranscript(text.trim());
        setMessages(prev => [...prev, {
          role: "user",
          text: "Voice: " + text.trim()
        }]);
        await handleSend(text.trim());
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          text: "Could not hear anything. Try again."
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Mic error: " + (err.message || err)
      }]);
    } finally {
      setRecording(false);
      setStatus("ready");
    }
  }

  async function handleScreenCapture() {
    if (loading) return;
    setLoading(true);
    setStatus("capturing");
    try {
      await invoke("capture_screen");
      const screenText = await invoke("extract_text_from_screen");
      if (screenText && screenText.trim()) {
        setStatus("thinking");
        const answer = await askLLM("What is on my screen? Summarize what you see clearly.", screenText, "");
        setMessages(prev => [...prev, {
          role: "assistant",
          text: answer
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          text: "Screen captured but no text found. Try asking me a question."
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Screen capture error: " + (err.message || err)
      }]);
    } finally {
      setLoading(false);
      setStatus("ready");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="app">
      <div className="header">
        <span className="logo">LinearCue</span>
        <span className={"status-dot " + status} title={status} />
      </div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={"message " + msg.role}>
            {msg.role === "assistant"
              ? <ReactMarkdown>{msg.text}</ReactMarkdown>
              : <p>{msg.text}</p>
            }
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="input-area">
        <button
          className={"icon-btn " + (recording ? "recording" : "")}
          onClick={handleMic}
          disabled={loading}
          title="Click to speak (5 seconds)"
        >
          {recording ? "⏹" : "🎤"}
        </button>
        <button
          className="icon-btn"
          onClick={handleScreenCapture}
          disabled={loading || recording}
          title="Capture screen"
        >
          📷
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything... (Enter to send)"
          rows={2}
          disabled={loading || recording}
        />
        <button
          className="send-btn"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
      <div className="footer">
        Press <kbd>⌘ Shift Space</kbd> to show / hide
      </div>
    </div>
  );
}
