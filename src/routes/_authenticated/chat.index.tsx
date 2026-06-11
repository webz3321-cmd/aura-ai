import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { createThread } from "@/lib/threads.functions";
import { Sparkles, MessageSquarePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const create = useServerFn(createThread);
  const createMut = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: (row) => row?.id && navigate({ to: "/chat/$threadId", params: { threadId: row.id } }),
  });

  const prompts = [
    "Explain quantum entanglement like I'm 12",
    "Draft a polite follow-up email to a client",
    "Write a Python function to deduplicate a list",
    "What should I cook with chicken, lemon, and rice?",
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          What can I help you with today?
        </h1>
        <p className="mt-3 text-muted-foreground">Pick a prompt to begin, or start fresh.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => createMut.mutate()}
              className="glass rounded-xl p-4 text-left text-sm transition-all hover:shadow-glow"
            >
              {p}
            </button>
          ))}
        </div>

        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          size="lg"
          className="mt-8 bg-gradient-brand text-white hover:opacity-90 shadow-glow"
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Start new conversation
        </Button>
      </div>
    </div>
  );
}