"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Menu,
  MessageSquarePlus,
  Paperclip,
  Plus,
  Send,
  Settings,
  Sparkles,
  User,
  X
} from "lucide-react";
import { MODELS, getModel, type ModelId } from "@/lib/models";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

const starter: Chat = {
  id: "new",
  title: "New chat",
  messages: []
};

export default function ChatApp() {
  const [model, setModel] = useState<ModelId>("openrouter/free");
  const [chats, setChats] = useState<Chat[]>([starter]);
  const [activeId, setActiveId] = useState("new");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find((chat) => chat.id === activeId) ?? starter;
  const activeModel = getModel(model);

  useEffect(() => {
    const saved = window.localStorage.getItem("claude-chat-chats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Chat[];
        if (parsed.length) setChats(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("claude-chat-chats", JSON.stringify(chats));
  }, [chats]);

  const updateActiveMessages = (messages: Message[]) => {
    setChats((current) =>
      current.map((chat) =>
        chat.id === activeId ? { ...chat, messages } : chat
      )
    );
  };

  const newChat = () => {
    const id = crypto.randomUUID();
    setChats((current) => [
      { id, title: "New chat", messages: [] },
      ...current
    ]);
    setActiveId(id);
    setInput("");
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };

    const assistantId = crypto.randomUUID();
    const nextMessages = [
      ...activeChat.messages,
      userMessage,
      { id: assistantId, role: "assistant" as const, content: "" }
    ];

    setInput("");
    setLoading(true);
    updateActiveMessages(nextMessages);

    setChats((current) =>
      current.map((chat) =>
        chat.id === activeId && chat.messages.length === 0
          ? { ...chat, title: text.slice(0, 42) }
          : chat
      )
    );

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [...activeChat.messages, userMessage].map(({ role, content }) => ({
            role,
            content
          }))
        })
      });

      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Unable to contact the AI.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          const line = raw.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;

          const data = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            error?: string;
          };

          if (data.type === "text") {
            setChats((current) =>
              current.map((chat) => {
                if (chat.id !== activeId) return chat;
                return {
                  ...chat,
                  messages: chat.messages.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: message.content + (data.text ?? "") }
                      : message
                  )
                };
              })
            );
          }

          if (data.type === "error") throw new Error(data.error ?? "Streaming error.");
        }
      }
    } catch (error) {
      setChats((current) =>
        current.map((chat) => {
          if (chat.id !== activeId) return chat;
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content:
                      "Sorry — something went wrong. " +
                      (error instanceof Error ? error.message : "")
                  }
                : message
            )
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <main className="flex h-dvh overflow-hidden bg-white text-neutral-900">
      {sidebarOpen && (
        <aside className="hidden w-[270px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 md:flex">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2 font-semibold">
              <div className="grid size-8 place-items-center rounded-xl bg-neutral-900 text-white">
                <Sparkles className="size-4" />
              </div>
              Claude Chat
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-3">
            <button
              onClick={newChat}
              className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium shadow-sm hover:bg-neutral-100"
            >
              <MessageSquarePlus className="size-4" />
              New chat
              <span className="ml-auto text-xs text-neutral-400">⌘K</span>
            </button>
          </div>

          <div className="mt-5 flex-1 overflow-y-auto px-3">
            <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Chats
            </div>
            <div className="space-y-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveId(chat.id)}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                    chat.id === activeId
                      ? "bg-neutral-200 font-medium"
                      : "hover:bg-neutral-100"
                  }`}
                >
                  {chat.title}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-200 p-3">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-200">
              <Settings className="size-4" />
              Settings
            </button>
            <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2">
              <div className="grid size-8 place-items-center rounded-full bg-violet-100 text-violet-700">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">Guest</div>
                <div className="truncate text-xs text-neutral-400">Free plan</div>
              </div>
            </div>
          </div>
        </aside>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4 md:px-6">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 hover:bg-neutral-100"
              >
                <Menu className="size-5" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setModelOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-neutral-100"
              >
                <Bot className="size-4" />
                {activeModel.name}
                <ChevronDown className="size-4 text-neutral-400" />
              </button>

              {modelOpen && (
                <div className="absolute left-0 top-12 z-20 w-80 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
                  {MODELS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setModel(item.id);
                        setModelOpen(false);
                      }}
                      className={`w-full rounded-lg p-3 text-left hover:bg-neutral-50 ${
                        item.id === model ? "bg-neutral-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{item.name}</span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                          {item.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
            <Settings className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 md:px-8 md:py-12">
            {activeChat.messages.length === 0 ? (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-neutral-900 text-white shadow-lg">
                  <Sparkles className="size-6" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  What can I help you with?
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
                  Ask anything, write code, analyze ideas, or work through a problem with Claude.
                </p>
                <div className="mt-7 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                  {[
                    "Build a modern landing page",
                    "Explain this code to me",
                    "Create a product strategy",
                    "Help me debug an error"
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="rounded-xl border border-neutral-200 bg-white p-3 text-left text-sm hover:bg-neutral-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {activeChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role === "assistant" && (
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-900 text-white">
                        <Sparkles className="size-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap text-sm leading-7 ${
                        message.role === "user"
                          ? "rounded-2xl bg-neutral-100 px-4 py-3"
                          : "pt-1"
                      }`}
                    >
                      {message.content || (loading ? "…" : "")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 md:px-8 md:pb-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-neutral-300 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${activeModel.name}...`}
                className="min-h-[72px] resize-none border-0 px-3 py-2 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
                    <Paperclip className="size-4" />
                  </button>
                  <button className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
                    <Plus className="size-4" />
                  </button>
                  <span className="hidden text-xs text-neutral-400 sm:block">
                    Shift + Enter for new line
                  </span>
                </div>
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  className="grid size-9 place-items-center rounded-xl bg-neutral-900 text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-neutral-400">
              AI can make mistakes. Check important information.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
