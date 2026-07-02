"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildChatContext } from "@/lib/chat-context";
import { Sparkles, Send, Loader2, X, Maximize2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export function DashboardChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<"fast" | "smart">("fast");
  const contextRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    buildChatContext().then((c) => { contextRef.current = c; });
    const saved = localStorage.getItem("n2s_chat_model");
    if (saved === "fast" || saved === "smart") setModel(saved);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setOpen(true);
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: contextRef.current, model }),
      });
      if (!res.ok || !res.body) {
        setMessages([...next, { role: "assistant", content: "Sorry, I couldn't answer that right now." }]);
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
            /* ignore */
          }
        }
      }
      if (!assistant) setMessages([...next, { role: "assistant", content: "I didn't catch a response — try again?" }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Couldn't reach the assistant. Check your connection." }]);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setMessages([]);
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Conversation (inline, expands in place) */}
      {open && messages.length > 0 && (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles size={13} className="text-blue-600" /> Assistant
            </div>
            <div className="flex items-center gap-1">
              <Link href="/chat" title="Open full chat" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Maximize2 size={13} />
              </Link>
              <button onClick={close} title="Close" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="max-h-72 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.content || (busy && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : null)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Composer / ask box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 px-3 py-2 focus-within:bg-muted/30 transition-colors"
      >
        <Sparkles size={17} className="text-blue-600 shrink-0" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={open ? "Reply…" : "Ask the assistant about your budget, news…"}
          className="flex-1 bg-transparent outline-none text-sm py-1"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} className="rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0 h-8 w-8">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </Button>
      </form>
    </div>
  );
}
