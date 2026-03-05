"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight, Sparkles, Share2, Download, Zap,
  GitBranch, MessageSquare, Settings, Code2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarsBackground, CosmicOrbs } from "@/components/landing/ui/stars-background";
import { BorderBeam } from "@/components/landing/ui/border-beam";
import Marquee from "@/components/landing/ui/marquee";
import SectionBadge from "@/components/landing/ui/section-badge";

// ─── Data ────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    icon: MessageSquare,
    title: "Describe your system",
    info: "Type a plain-English prompt or paste Mermaid syntax into the chat sidebar.",
  },
  {
    icon: Sparkles,
    title: "AI renders the diagram",
    info: "The AI generates valid diagram code and places it instantly on your canvas.",
  },
  {
    icon: Share2,
    title: "Share or export",
    info: "Export as PNG, SVG, or JSON. Share a link. Your diagram, your way.",
  },
];

const FEATURES = [
  { icon: Sparkles, title: "AI Generation", info: "Describe in plain English — Graphini generates the diagram automatically." },
  { icon: Code2, title: "Mermaid DSL", info: "Full flowchart, sequence, class, gantt, mindmap support." },
  { icon: GitBranch, title: "Infinite Canvas", info: "Smooth pan, zoom, multi-select powered by Plait/Drawnix." },
  { icon: Zap, title: "Streaming Responses", info: "Fast models via OpenRouter — DeepSeek R1, Qwen3, GLM-4.5 Air." },
  { icon: Download, title: "Export Anywhere", info: "PNG, SVG, JSON — open formats, no lock-in." },
  { icon: Users, title: "Open Source", info: "MIT licensed. Fork it, extend it, build on it." },
];

const EXAMPLES = [
  { name: "Microservices", body: "API Gateway → Auth → Users → Orders → Postgres" },
  { name: "OAuth Flow", body: "Client → Server → Identity Provider → Token" },
  { name: "Mind Map", body: "Product Roadmap → Q1 Auth · Q2 Collab · Q3 Export" },
  { name: "DB Schema", body: "users ─ diagrams ─ shares ─ versions" },
  { name: "CI/CD Pipeline", body: "Push → Test → Build → Deploy → Monitor" },
  { name: "React Architecture", body: "Store → Context → Components → Hooks" },
  { name: "Kafka Pipeline", body: "Producer → Topic → Consumer → Sink" },
  { name: "RAG System", body: "Query → Embed → Vector DB → LLM → Response" },
];

const firstRow = EXAMPLES.slice(0, EXAMPLES.length / 2);
const secondRow = EXAMPLES.slice(EXAMPLES.length / 2);

// ─── Components ──────────────────────────────────────────────────────────────

function LandingHeader() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-[hsl(240,16%,5%)]/95 backdrop-blur-xl border-b border-violet-500/20 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
            <GitBranch className="h-3.5 w-3.5 text-violet-300" />
          </div>
          <span className="text-sm font-semibold text-white">Graphini</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {["#features", "#how-it-works", "#open-source"].map((href) => (
            <a
              key={href}
              href={href}
              className="text-sm text-neutral-400 hover:text-violet-200 transition-colors"
            >
              {href.replace("#", "").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-neutral-300 hover:text-violet-200 hover:bg-violet-500/10">
              Dashboard
            </Button>
          </Link>
          <Link href="/editor">
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium"
            >
              Open Editor <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-violet-500/15 bg-[hsl(240,16%,4%)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        {/* Top */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
                <GitBranch className="h-4 w-4 text-violet-300" />
              </div>
              <span className="text-base font-semibold text-white">Graphini</span>
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed">
              AI-powered diagram workspace. Describe your system, watch it render live. Open source, MIT licensed.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Built by</span>
            <a
              href="https://magnova.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-300 hover:text-violet-200 transition-colors"
            >
              Magnova.ai →
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {[
            {
              title: "Product",
              links: [
                { label: "Editor", href: "/editor" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Features", href: "#features" },
                { label: "How it works", href: "#how-it-works" },
              ],
            },
            {
              title: "Open Source",
              links: [
                { label: "GitHub", href: "https://github.com/omkarbhad/graphini" },
                { label: "Contribute", href: "https://github.com/omkarbhad/graphini/issues" },
                { label: "Sponsor", href: "https://github.com/sponsors/omkarbhad" },
                { label: "License (MIT)", href: "https://github.com/omkarbhad/graphini/blob/main/LICENSE" },
              ],
            },
            {
              title: "Stack",
              links: [
                { label: "Next.js", href: "https://nextjs.org" },
                { label: "Plait / Drawnix", href: "https://github.com/plait-board/plait" },
                { label: "Mermaid.js", href: "https://mermaid.js.org" },
                { label: "OpenRouter", href: "https://openrouter.ai" },
              ],
            },
            {
              title: "Magnova",
              links: [
                { label: "magnova.ai", href: "https://magnova.ai" },
                { label: "Astrova", href: "https://astrova.magnova.ai" },
                { label: "Contact", href: "mailto:hello@magnova.ai" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold text-white mb-4 uppercase tracking-wider">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-sm text-neutral-400 hover:text-violet-300 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-violet-500/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} Graphini · MIT License · Built by{" "}
            <a href="https://magnova.ai" className="hover:text-violet-300 transition-colors">Magnova.ai</a>
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/omkarbhad/graphini"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-[hsl(240,18%,9%)] border border-violet-500/20 flex items-center justify-center text-neutral-400 hover:text-violet-200 hover:border-violet-500/35 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[hsl(240,16%,5%)]">
      <LandingHeader />

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 py-12 text-center">
        <StarsBackground />
        <CosmicOrbs />

        {/* Gradient overlays */}
        <div className="fixed inset-0 bg-[hsl(240,16%,5%)] -z-20" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.08),transparent)] -z-10" />
        <div className="pointer-events-none fixed inset-0 -z-30">
          <div className="absolute top-[40%] left-1/2 w-3/4 -translate-x-1/2 h-1/4 bg-gradient-to-r from-violet-600/10 to-indigo-600/6 blur-[5rem] animate-image-glow" />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-3xl w-full">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Open source · MIT · AI-powered
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight">
            <span className="bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent">
              Turn ideas into
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              diagrams, instantly
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm sm:text-base text-neutral-400 leading-relaxed">
            Describe your system in plain English, paste Mermaid syntax, or chat with AI — and watch your diagram render live on an infinite canvas.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/editor">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium gap-2"
              >
                Start diagramming free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com/omkarbhad/graphini" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-transparent border border-violet-500/30 text-violet-100 hover:bg-violet-500/10 hover:border-violet-500/45 transition-all gap-2"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </Button>
            </a>
          </div>
        </div>

        {/* Hero image with border beam */}
        <div className="relative z-10 mt-12 w-full max-w-5xl px-4">
          <div className="relative group">
            <div className="absolute top-[5%] left-1/2 w-3/4 -translate-x-1/2 h-1/3 bg-gradient-to-r from-violet-500/12 to-indigo-500/8 blur-[5rem] animate-image-glow" />
            <div className="-m-2 rounded-xl p-2 ring-1 ring-inset ring-violet-500/20 lg:-m-4 bg-opacity-50 backdrop-blur-3xl">
              <BorderBeam colorFrom="#8b5cf6" colorTo="#6366f1" size={120} duration={12} />
              <div className="relative rounded-lg overflow-hidden border border-violet-500/15 bg-[hsl(240,16%,8%)]">
                {/* Mock editor UI */}
                <div className="flex items-center gap-1.5 border-b border-violet-500/15 px-4 py-3 bg-[hsl(240,18%,6%)]">
                  <span className="h-3 w-3 rounded-full bg-red-500/70" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <span className="h-3 w-3 rounded-full bg-green-500/70" />
                  <span className="ml-3 flex-1 rounded-md border border-violet-500/15 bg-[hsl(240,16%,9%)] px-3 py-1 text-center text-xs text-neutral-500">
                    graphini.magnova.ai/editor
                  </span>
                </div>
                <div className="flex h-64 sm:h-80 items-center justify-center">
                  <div className="text-center">
                    <GitBranch className="mx-auto mb-3 h-12 w-12 text-violet-400/40" />
                    <p className="text-sm text-neutral-500">AI diagram canvas</p>
                    <Link href="/editor">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 gap-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                      >
                        Open editor <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <SectionBadge title="Process" icon={<Settings className="h-3 w-3" />} />
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent tracking-tight">
            Diagram in seconds
          </h2>
          <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            No drag-and-drop. No clunky menus. Just describe it and watch it appear.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.title}
              className="group bg-[hsl(240,16%,8%)]/70 border border-violet-500/15 hover:border-violet-500/30 hover:bg-[hsl(240,18%,10%)] transition-all duration-300 rounded-xl p-5"
            >
              <div className="flex flex-col items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 group-hover:border-violet-500/35 transition-colors">
                  <step.icon className="w-5 h-5 text-violet-300 group-hover:text-violet-200 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-600">0{i + 1}</span>
                  <h3 className="text-sm font-medium text-white">{step.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm text-neutral-500 leading-relaxed">{step.info}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.03),transparent)] -z-10" />
        <div className="max-w-2xl mx-auto text-center mb-12">
          <SectionBadge title="Features" icon={<Zap className="h-3 w-3" />} />
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent tracking-tight">
            Everything you need to diagram fast
          </h2>
          <p className="mt-4 text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            Built for engineers and architects who think in systems.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group bg-[hsl(240,16%,8%)]/70 border border-violet-500/15 hover:border-violet-500/30 hover:bg-[hsl(240,18%,10%)] transition-all duration-300 rounded-xl p-5"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 group-hover:border-violet-500/35 transition-colors">
                  <f.icon className="w-5 h-5 text-violet-300 group-hover:text-violet-200 transition-colors" />
                </div>
                <h3 className="text-sm font-medium text-white group-hover:text-violet-100 transition-colors">{f.title}</h3>
              </div>
              <p className="mt-3 text-sm text-neutral-500 leading-relaxed text-center line-clamp-2">{f.info}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Marquee examples ── */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-2xl mx-auto text-center mb-12 px-4">
          <SectionBadge title="Examples" icon={<Code2 className="h-3 w-3" />} />
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent tracking-tight">
            Anything you can describe, we can draw
          </h2>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-start w-full">
            <Marquee reverse pauseOnHover className="[--duration:30s] select-none">
              {firstRow.map((ex, i) => (
                <div
                  key={`${ex.name}-${i}`}
                  className="w-56 sm:w-64 mx-2 rounded-xl border border-violet-500/15 bg-[hsl(240,16%,8%)]/70 hover:border-violet-500/30 hover:bg-[hsl(240,18%,10%)] transition-all duration-300 p-4"
                >
                  <p className="text-sm font-medium text-white mb-1.5">{ex.name}</p>
                  <p className="text-xs text-neutral-500 font-mono leading-relaxed">{ex.body}</p>
                </div>
              ))}
            </Marquee>
          </div>
          <div className="flex items-start justify-start w-full">
            <Marquee pauseOnHover className="[--duration:30s] select-none">
              {secondRow.map((ex, i) => (
                <div
                  key={`${ex.name}-${i}`}
                  className="w-56 sm:w-64 mx-2 rounded-xl border border-violet-500/15 bg-[hsl(240,16%,8%)]/70 hover:border-violet-500/30 hover:bg-[hsl(240,18%,10%)] transition-all duration-300 p-4"
                >
                  <p className="text-sm font-medium text-white mb-1.5">{ex.name}</p>
                  <p className="text-xs text-neutral-500 font-mono leading-relaxed">{ex.body}</p>
                </div>
              ))}
            </Marquee>
          </div>
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-[hsl(240,16%,5%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-[hsl(240,16%,5%)]" />
        </div>
      </section>

      {/* ── Open Source / Contributors ── */}
      <section id="open-source" className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05),transparent)] -z-10" />
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contributors */}
          <div className="rounded-2xl border border-violet-500/15 bg-[hsl(240,16%,8%)]/70 p-7">
            <SectionBadge title="Contributors" icon={<Users className="h-3 w-3" />} />
            <h3 className="mt-4 text-xl font-bold text-white">Built in the open</h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Graphini is open source under MIT. Code, issues, feedback — every contribution makes it better.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="https://github.com/omkarbhad" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://github.com/omkarbhad.png"
                  alt="Omkar Bhad"
                  className="h-9 w-9 rounded-full border-2 border-violet-500/30 ring-2 ring-[hsl(240,16%,8%)]"
                />
              </a>
              <a
                href="https://github.com/omkarbhad/graphini/graphs/contributors"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-violet-500/30 text-xs text-neutral-400 hover:border-violet-400/50 hover:text-violet-300 transition-colors"
              >
                +
              </a>
            </div>
            <a
              href="https://github.com/omkarbhad/graphini"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Contribute on GitHub <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Sponsors */}
          <div className="rounded-2xl border border-violet-500/15 bg-[hsl(240,16%,8%)]/70 p-7">
            <SectionBadge title="Sponsors" icon={<Sparkles className="h-3 w-3" />} />
            <h3 className="mt-4 text-xl font-bold text-white">Keep it free & open</h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Graphini is free forever. Sponsoring helps keep it maintained, improved, and open.
            </p>
            <div className="mt-5 space-y-3">
              {[
                { name: "Magnova.ai", desc: "AI product studio", href: "https://magnova.ai" },
                { name: "OpenRouter", desc: "Multi-model AI gateway", href: "https://openrouter.ai" },
                { name: "Neon", desc: "Serverless Postgres (coming)", href: "https://neon.tech" },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-violet-500/10 bg-[hsl(240,16%,6%)] px-4 py-2.5 hover:border-violet-500/25 transition-colors"
                >
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  <span className="text-xs text-neutral-500">{s.desc}</span>
                </a>
              ))}
            </div>
            <a
              href="https://github.com/sponsors/omkarbhad"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-xs font-medium text-pink-300 hover:bg-pink-500/15 transition-colors"
            >
              ❤️ Become a sponsor
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06),transparent)] -z-10" />
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight leading-tight text-white">
            Ready to think in{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              diagrams?
            </span>
          </h2>
          <p className="mt-4 text-neutral-400 text-base max-w-lg mx-auto">
            Free, open-source, no account required to start.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link href="/editor">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium gap-2"
              >
                Open Editor <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com/omkarbhad/graphini" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-transparent border border-violet-500/30 text-violet-100 hover:bg-violet-500/10 hover:border-violet-500/45 transition-all"
              >
                Star on GitHub ⭐
              </Button>
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
