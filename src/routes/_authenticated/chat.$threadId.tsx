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
import { CHAT_MODES, type ChatMode } from "@/lib/chat-modes";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, Sparkles, Loader2, User, Paperclip, Mic, MicOff, X, FileText, Image as ImageIcon } from "lucide-react";
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

  const [mode, setMode] = useState<ChatMode>("default");

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
      mode={mode}
      onModeChange={setMode}
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
  mode,
  onModeChange,
  title,
  onTitleAutoset,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  model: string;
  onModelChange: (m: string) => void;
  mode: ChatMode;
  onModeChange: (m: ChatMode) => void;
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
              parsed.mode = mode;
              body = JSON.stringify(parsed);
            } catch {}
          }
          return fetch(url, { ...init, body, headers });
        },
      }),
    [model, threadId, mode],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "Something went wrong"),
  });

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);
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
    if ((!text && attachments.length === 0) || isBusy) return;
    setInput("");
    let files: FileList | undefined;
    if (attachments.length) {
      const dt = new DataTransfer();
      attachments.forEach((f) => dt.items.add(f));
      files = dt.files;
    }
    setAttachments([]);
    sendMessage({ text, files });
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const f of Array.from(list)) {
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name} is over 20MB`);
        continue;
      }
      const isImage = f.type.startsWith("image/");
      const isPdf = f.type === "application/pdf";
      if (!isImage && !isPdf) {
        toast.error(`${f.name}: only images and PDFs are supported right now`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) setAttachments((prev) => [...prev, ...accepted]);
  }

  function toggleVoice() {
    type SR = {
      new (): {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
    };
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input isn't supported in this browser");
      return;
    }
    if (listening) {
      (recognitionRef.current as { stop: () => void } | null)?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={(v) => onModeChange(v as ChatMode)}>
            <SelectTrigger className="w-[160px] glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHAT_MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {m.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
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
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((f, i) => (
                <div key={i} className="glass flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs">
                  {f.type.startsWith("image/") ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="glass relative flex items-end gap-2 rounded-2xl p-2 shadow-glow">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image or PDF"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn("shrink-0", listening && "text-destructive")}
              onClick={toggleVoice}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
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
              placeholder={listening ? "Listening…" : "Ask anything — drop in images or PDFs"}
              rows={1}
              className="min-h-[44px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            />
            <Button
              onClick={submit}
              disabled={(!input.trim() && attachments.length === 0) || isBusy}
              size="icon"
              className="shrink-0 bg-gradient-brand text-white hover:opacity-90"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Enter to send · Shift+Enter for newline · Attach images/PDFs · 🎙️ for voice
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
          if (part.type === "file") {
            const fp = part as { type: "file"; mediaType?: string; url?: string; filename?: string };
            if (fp.mediaType?.startsWith("image/") && fp.url) {
              return (
                <img
                  key={i}
                  src={fp.url}
                  alt={fp.filename ?? "attachment"}
                  className="my-1 max-h-64 rounded-lg border border-border/50"
                />
              );
            }
            return (
              <div key={i} className="my-1 inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">{fp.filename ?? "Attachment"}</span>
              </div>
            );
          }
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