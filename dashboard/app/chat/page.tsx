"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/user-context";
import { buildChatContext } from "@/lib/chat-context";
import { addUsage, getUsage, EST } from "@/lib/ai-usage";
import { Send, Loader2, MessageSquare, Sparkles, AlertCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How much have we spent this month?",
  "Which category are we spending the most on?",
  "Search the web: best budgeting tips for families",
  "What's the latest news on the World Cup?",
];

export default function Chat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [model, setModelState] = useState<"fast" | "smart">("fast");
  const [usagePct, setUsagePct] = useState(0);
  const contextRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoSent = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("n2s_chat_model");
    if (saved === "fast" || saved === "smart") setModelState(saved);
    setUsagePct(getUsage().pct);
  }, []);
  function setModel(m: "fast" | "smart") {
    setModelState(m);
    localStorage.setItem("n2s_chat_model", m);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Gather live budget + news context, then auto-send a ?q= prompt from the dashboard box
  useEffect(() => {
    (async () => {
      contextRef.current = await buildChatContext();
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && !autoSent.current) {
        autoSent.current = true;
        send(q);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError("");
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      // Make sure the real budget/news data is loaded before asking
      if (!contextRef.current) contextRef.current = await buildChatContext();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: contextRef.current, model }),
      });

      if (!res.ok || !res.body) {
        const info = await res.json().catch(() => ({}));
        setError(info.error || "Something went wrong. Please try again.");
        setMessages(next);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            if (json.response) {
              assistant += json.response;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {
            /* ignore keep-alive / partial lines */
          }
        }
      }

      if (!assistant) {
        setMessages(next);
        setError("The assistant didn't return a response. Please try again.");
      } else {
        addUsage(model === "smart" ? EST.smart : EST.fast);
        setUsagePct(getUsage().pct);
      }
    } catch {
      setMessages(next);
      setError("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] md:h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <MessageSquare size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-medium leading-tight">Assistant</h1>
            <p className="text-xs text-muted-foreground truncate" title="Estimated share of today's free Workers AI allowance used on this device. Exact usage is in your Cloudflare dashboard.">
              Budget · News · Web · <span className={usagePct >= 90 ? "text-amber-600" : ""}>~{usagePct}% of today&apos;s free AI</span>
            </p>
          </div>
        </div>

        {/* Fast / Smart model toggle */}
        <div className="flex bg-muted p-1 rounded-lg gap-1 shrink-0">
          <button
            onClick={() => setModel("fast")}
            title="Llama 3.1 8B — faster, more free messages per day"
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              model === "fast" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Fast
          </button>
          <button
            onClick={() => setModel("smart")}
            title="Llama 3.3 70B — smarter, uses more of the daily free allowance"
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              model === "smart" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Smart
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-5">
        {empty && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Sparkles size={26} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Hi{user ? `, ${user.name}` : ""} 👋</h2>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                Ask me about your budget, the latest news, or anything else.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm px-3 py-2.5 rounded-xl border border-border hover:border-blue-400 hover:bg-muted/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {m.content ||
                (busy && i === messages.length - 1 ? (
                  <Loader2 size={15} className="animate-spin text-muted-foreground" />
                ) : null)}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl px-3 py-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-4 md:px-6 py-3 border-t border-border shrink-0 pb-20 md:pb-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-blue-400 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Message the assistant…"
            className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-32"
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0 h-9 w-9"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          The assistant can make mistakes. Double-check important info.
        </p>
      </div>
    </div>
  );
}
