import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Sparkles, Zap, Lock, MessagesSquare, Code2, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nebula AI — Chat with every great model in one place" },
      { name: "description", content: "Premium AI workspace with multi-model chat, persistent history, dark mode, and Apple-grade design." },
      { property: "og:title", content: "Nebula AI — Premium Multi-Model Chat" },
      { property: "og:description", content: "Chat with Gemini, GPT-5, and more from a single beautiful interface." },
    ],
  }),
  component: Index,
});

function Index() {
  const { theme, toggle } = useTheme();
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-subtle text-foreground">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-brand opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-brand opacity-20 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Nebula</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild className="bg-gradient-brand text-white hover:opacity-90 shadow-glow">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-24 text-center sm:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-brand" />
            Powered by Gemini, GPT-5, and more
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
            One workspace for <span className="text-gradient">every great AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Nebula brings the best models together in one beautifully designed interface — with persistent history, lightning-fast streaming, and a premium feel on every device.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-white hover:opacity-90 shadow-glow">
              <Link to="/auth">Start chatting free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="glass">
              <a href="#features">See features</a>
            </Button>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: MessagesSquare, title: "Multi-model chat", desc: "Switch between Gemini, GPT-5, and more — mid-conversation." },
              { icon: Zap, title: "Lightning streaming", desc: "Token-by-token responses with buttery animations." },
              { icon: Lock, title: "Private by default", desc: "Your conversations are encrypted and scoped to you with strict row-level security." },
              { icon: Code2, title: "Code-aware", desc: "Beautiful syntax-highlighted code blocks with copy-to-clipboard." },
              { icon: FileText, title: "Persistent history", desc: "Every thread is saved and searchable across all your devices." },
              { icon: Sparkles, title: "Apple-grade design", desc: "Glassmorphism, gradients, and motion that actually feels good." },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 transition-all hover:shadow-glow">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Nebula AI — Built with love.
        </footer>
      </main>
    </div>
  );
}
