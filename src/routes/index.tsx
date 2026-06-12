import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Sparkles, Zap, Lock, MessagesSquare, Code2, FileText, GraduationCap, Globe, Mic } from "lucide-react";
import aouraLogo from "@/assets/aoura-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aoura AI by Webz — Create. Learn. Build. Discover." },
      { name: "description", content: "The all-in-one AI operating system. Chat, research, code, learn — with GPT-5, Gemini, Claude, and more in one premium workspace." },
      { property: "og:title", content: "Aoura AI by Webz — Create. Learn. Build. Discover." },
      { property: "og:description", content: "All-in-one AI for chat, research, code, and learning." },
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
          <img src={aouraLogo} alt="Aoura AI" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight">Aoura<span className="text-muted-foreground font-normal"> by Webz</span></span>
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
            Powered by GPT-5, Gemini, Claude & more
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
            <span className="text-gradient">Create. Learn.</span><br/>Build. Discover.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Aoura AI by Webz is your all-in-one AI operating system. Chat, research, code, and learn — with the world's best models, in one beautifully crafted workspace.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-white hover:opacity-90 shadow-glow">
              <Link to="/auth">Launch Aoura free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="glass">
              <a href="#features">See features</a>
            </Button>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: MessagesSquare, title: "Multi-model chat", desc: "GPT-5, Gemini, Claude, DeepSeek — switch mid-conversation." },
              { icon: Sparkles, title: "Reasoning modes", desc: "Default, Reasoning, Research, Coding, and Study modes tuned for each task." },
              { icon: FileText, title: "Document analysis", desc: "Drop in PDFs and images — Aoura reads, summarizes, and reasons across them." },
              { icon: Mic, title: "Voice input", desc: "Talk to Aoura naturally with on-device speech recognition." },
              { icon: Code2, title: "Code-aware", desc: "Production-ready code generation with syntax-highlighted blocks." },
              { icon: GraduationCap, title: "Study mode", desc: "Adaptive explanations and quizzes that teach concepts at your level." },
              { icon: Globe, title: "Research-grade", desc: "Structured answers with reasoning and a path to source citations." },
              { icon: Zap, title: "Lightning streaming", desc: "Token-by-token responses with buttery animations." },
              { icon: Lock, title: "Private by default", desc: "Conversations encrypted and scoped to you with strict row-level security." },
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
          © {new Date().getFullYear()} Aoura AI by Webz — Create. Learn. Build. Discover.
        </footer>
      </main>
    </div>
  );
}
