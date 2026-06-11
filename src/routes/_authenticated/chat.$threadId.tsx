import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getThread, updateThread } from "@/lib/threads.functions";
import { AVAILABLE_MODELS } from "@/lib/ai-gateway.server";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, Sparkles, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

type LoadedMessage = { id: string; role: "user" | "assistant" | "system"; parts: unknown; created_at: string };

function ThreadPage() {
  const { threadId } = Route.useParams();
  const fetchThread = useServerFn(getThread);
  const updateFn = useServerFn(updateThread);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchThread({ data: { threadId } }),
  });

  const initialMessages: UIMessage[] = useMemo(() => {
    if (!data?.messages) return [];
    return (data.messages as LoadedMessage[]).map((m) => ({
      id: m.id,
      role: m.role as UIMessage["role"],
      parts: (m.parts as UIMessage["parts"]) ?? [],
    }));
  }, [data?.messages]);

  const [model, setModel] = useState<string>("google/gemini-3-flash-preview");
  useEffect(() => {
    if (data?.thread?.model) setModel(data.thread.model);
  }, [data?.thread?.model]);

  return isLoading ? (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ) : (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      model={model}
      onModelChange={async (m) => {
        setModel(m);
        await updateFn({ data: { threadId, model: m } });
        qc.invalidateQueries({ queryKey: ["thread", threadId] });
      }}
      title={data?.thread?.title ?? "New Chat"}
      onTitleAutoset={async (title) => {
        await updateFn({ data: { threadId, title } });
        qc.invalidateQueries({ queryKey: ["threads"] });
        qc.invalidateQueries({ queryKey: ["thread", threadId] });
      }}
    />
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  model,
  onModelChange,
  title,
  onTitleAutoset,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  model: string;
  onModelChange: (m: string) => void;
  title: string;
  onTitleAutoset: (t: string) => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          // Inject model and threadId into body
          let body = init?.body;
          if (body && typeof body === "string") {
            try {
              const parsed = JSON.parse(body);
              parsed.model = model;
              parsed.threadId = threadId;
              body = JSON.stringify(parsed);
            } catch {}
          }
          return fetch(url, { ...init, body, headers });
        },
      }),
    [model, threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "Something went wrong"),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleSetRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  // Auto-set title from first user message
  useEffect(() => {
    if (titleSetRef.current) return;
    if (title && title !== "New Chat") {
      titleSetRef.current = true;
      return;
    }
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser) {
      const text = textFromMessage(firstUser).slice(0, 60).trim();
      if (text) {
        titleSetRef.current = true;
        onTitleAutoset(text);
      }
    }
  }, [messages, title, onTitleAutoset]);

  const isBusy = status === "submitted" || status === "streaming";

  function submit() {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">{title}</h2>
        </div>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="w-[200px] glass">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="text-xs text-muted-foreground">{m.provider}</span>
                <span className="ml-2">{m.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
          {messages.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8" />
              <p>Send a message to get started.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border/50 bg-background/60 p-4 backdrop-blur md:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="glass relative flex items-end gap-2 rounded-2xl p-2 shadow-glow">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask anything…"
              rows={1}
              className="min-h-[44px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            />
            <Button
              onClick={submit}
              disabled={!input.trim() || isBusy}
              size="icon"
              className="shrink-0 bg-gradient-brand text-white hover:opacity-90"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Press Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}

function textFromMessage(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-gradient-brand text-white shadow-glow" : "text-foreground",
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type !== "text") return null;
          return isUser ? (
            <p key={i} className="whitespace-pre-wrap">{part.text}</p>
          ) : (
            <div key={i} className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown>{part.text}</ReactMarkdown>
            </div>
          );
        })}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}