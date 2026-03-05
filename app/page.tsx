"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight, Sparkles, Share2, Download, Zap,
  GitBranch, MessageSquare, Settings, Code2, Users, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarsBackground, CosmicOrbs } from "@/components/landing/ui/stars-background";
import { BorderBeam } from "@/components/landing/ui/border-beam";
import Marquee from "@/components/landing/ui/marquee";
import SectionBadge from "@/components/landing/ui/section-badge";

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Open Source", href: "#open-source" },
];

const HOW_IT_WORKS = [
  {
    icon: MessageSquare,
    title: "Describe your system",
    info: "Type a prompt in plain English, or paste Mermaid syntax directly into the chat sidebar.",
  },
  {
    icon: Sparkles,
    title: "AI renders the diagram",
    info: "The model generates valid diagram code and places it instantly on your infinite canvas.",
  },
  {
    icon: Share2,
    title: "Share or export",
    info: "Export as PNG, SVG, or JSON. Share a shareable link. No friction.",
  },
];

const FEATURES = [
  { icon: Sparkles, title: "AI Generation", info: "Describe in plain English. Graphini generates and places diagrams automatically." },
  { icon: Code2, title: "Mermaid DSL", info: "Full support: flowchart, sequence, class, gantt, mindmap, ER, gitGraph." },
  { icon: GitBranch, title: "Infinite Canvas", info: "Smooth pan, zoom, and multi-select. Powered by Plait / Drawnix." },
  { icon: Zap, title: "Streaming AI", info: "Fast models via OpenRouter — DeepSeek R1, Qwen3 235B, GLM-4.5 Air." },
  { icon: Download, title: "Export Anywhere", info: "PNG, SVG, JSON. Open formats. Your data, your way, no lock-in." },
  { icon: Users, title: "Open Source", info: "MIT licensed. Free forever. Fork it, self-host it, build on it." },
];

const EXAMPLES = [
  { name: "Microservices", body: "API Gateway → Auth Service → User Service → Orders → Postgres" },
  { name: "OAuth2 Flow", body: "Client → Auth Server → Token → Resource Server → Response" },
  { name: "Product Roadmap", body: "Q1: Auth & Onboarding · Q2: Collaboration · Q3: Export & Share" },
  { name: "DB Schema", body: "users ─< diagrams ─< shares ─< versions" },
  { name: "CI/CD Pipeline", body: "Push → Lint → Test → Build → Staging → Prod" },
  { name: "React Architecture", body: "Store → Context API → Smart Components → Hooks → UI" },
  { name: "Kafka Pipeline", body: "Producer → Topic → Broker → Consumer Group → Sink" },
  { name: "RAG System", body: "Query → Embed → Qdrant → Top-K → LLM → Streamed Response" },
  { name: "Multi-Agent", body: "Planner → Researcher → Writer → Reviewer → Output" },
  { name: "k8s Cluster", body: "Ingress → Service → Deployment → Pods → PVC" },
];

const SPONSORS = [
  { name: "Magnova.ai", desc: "AI product studio", href: "https://magnova.ai" },
  { name: "OpenRouter", desc: "Multi-model AI gateway", href: "https://openrouter.ai" },
  { name: "Neon", desc: "Serverless Postgres — coming soon", href: "https://neon.tech" },
];

const firstRow = EXAMPLES.slice(0, 5);
const secondRow = EXAMPLES.slice(5);

// ─── GitHub Icon ─────────────────────────────────────────────────────────────

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function LandingHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize
  React.useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-[hsl(240,16%,5%)]/96 backdrop-blur-xl border-b border-violet-500/20 shadow-[0_1px_20px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
            <GitBranch className="h-3.5 w-3.5 text-violet-300" />
          </div>
          <span className="text-sm font-semibold text-white">Graphini</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-400 hover:text-violet-200 transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-300 hover:text-violet-200 hover:bg-violet-500/10 transition-all"
            >
              Dashboard
            </Button>
          </Link>
          <Link href="/editor">
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium transition-all gap-1.5"
            >
              Open Editor <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile: open editor + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/editor">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-3">
              Try it
            </Button>
          </Link>
          <button
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-violet-500/20 bg-[hsl(240,16%,5%)]/98 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:bg-violet-500/10 hover:text-violet-200 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:bg-violet-500/10 hover:text-violet-200 transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

const FOOTER_COLS = [
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
      { label: "Issues", href: "https://github.com/omkarbhad/graphini/issues" },
      { label: "Sponsor", href: "https://github.com/sponsors/omkarbhad" },
      { label: "MIT License", href: "https://github.com/omkarbhad/graphini/blob/main/LICENSE" },
    ],
  },
  {
    title: "Stack",
    links: [
      { label: "Next.js 15", href: "https://nextjs.org" },
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
];

function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-violet-500/[0.12] bg-[hsl(240,18%,4%)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
                <GitBranch className="h-4 w-4 text-violet-300" />
              </div>
              <span className="text-base font-semibold text-white">Graphini</span>
            </Link>
            <p className="text-sm text-neutral-500 leading-relaxed">
              AI-powered diagram workspace. Describe your system, watch it render live on an infinite canvas. Free, open source, MIT licensed.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">Built by</span>
            <a
              href="https://magnova.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-400 hover:text-violet-300 transition-colors"
            >
              Magnova.ai →
            </a>
            <a
              href="https://github.com/omkarbhad/graphini"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Graphini on GitHub"
              className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-violet-300 transition-colors"
            >
              <GitHubIcon className="h-3.5 w-3.5" />
              omkarbhad/graphini
            </a>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[10px] font-bold text-neutral-500 mb-4 uppercase tracking-widest">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") || link.href.startsWith("mailto") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-sm text-neutral-500 hover:text-violet-300 transition-colors"
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
        <div className="pt-6 border-t border-violet-500/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-600">
            © {year} Graphini · MIT License ·{" "}
            <a href="https://magnova.ai" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors">
              Magnova.ai
            </a>
          </p>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/omkarbhad/graphini"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Graphini on GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/20 bg-[hsl(240,18%,8%)] text-neutral-500 hover:text-violet-200 hover:border-violet-500/40 transition-all"
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[hsl(240,16%,5%)] overflow-x-hidden">
      <LandingHeader />

      {/* ── Hero ── */}
      <section
        aria-label="Hero"
        className="relative flex w-full flex-col items-center justify-center px-4 pt-16 pb-24 text-center"
        style={{ minHeight: "calc(100vh - 3.5rem)" }}
      >
        {/* Background layers — these are absolute to the section */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <StarsBackground />
          <CosmicOrbs />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(139,92,246,0.1),transparent)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/4 bg-gradient-to-r from-violet-600/8 to-indigo-600/5 blur-[5rem] animate-image-glow" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center max-w-3xl w-full">
          {/* Badge */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-3.5 py-1.5 text-xs font-medium text-violet-200"
            role="note"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            Open source &nbsp;·&nbsp; MIT &nbsp;·&nbsp; AI-powered
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
            <span className="bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent block">
              Turn ideas into
            </span>
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent block mt-1">
              diagrams, instantly
            </span>
          </h1>

          {/* Sub */}
          <p className="mt-5 max-w-lg text-sm sm:text-base text-neutral-400 leading-relaxed">
            Describe your system in plain English, paste Mermaid syntax, or chat with AI — and watch your diagram render live on an infinite canvas.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/editor">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all"
              >
                Start diagramming free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/omkarbhad/graphini"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Graphini source on GitHub"
            >
              <Button
                size="lg"
                className="border border-violet-500/30 bg-transparent text-violet-100 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all gap-2"
              >
                <GitHubIcon className="h-4 w-4" />
                View on GitHub
              </Button>
            </a>
          </div>

          {/* Quick example chips */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-xl">
            <span className="text-[11px] text-neutral-600 mr-1">Try:</span>
            {["Microservices", "OAuth flow", "DB schema", "CI/CD pipeline"].map((label) => (
              <Link
                key={label}
                href={`/editor?prompt=${encodeURIComponent(label + " diagram")}`}
                className="rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-3 py-1 text-[11px] text-violet-300/70 hover:border-violet-500/40 hover:text-violet-200 hover:bg-violet-500/10 transition-all"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Hero preview mockup */}
        <div className="relative z-10 mt-14 w-full max-w-4xl px-4">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-r from-violet-500/10 to-indigo-500/8 blur-[4rem] animate-image-glow pointer-events-none" aria-hidden="true" />
          <div className="relative rounded-xl overflow-hidden border border-violet-500/20 bg-[hsl(240,16%,8%)] shadow-2xl shadow-black/50">
            <BorderBeam colorFrom="#8b5cf6" colorTo="#6366f1" size={100} duration={14} />
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 border-b border-violet-500/[0.12] px-4 py-2.5 bg-[hsl(240,18%,6%)]">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" aria-hidden="true" />
              <div className="mx-auto flex max-w-xs w-full items-center justify-center rounded border border-violet-500/[0.12] bg-[hsl(240,16%,9%)] px-3 py-0.5">
                <span className="text-[11px] text-neutral-600 truncate">graphini.magnova.ai/editor</span>
              </div>
            </div>
            {/* Split: canvas + chat */}
            <div className="flex h-60 sm:h-72">
              {/* Canvas area */}
              <div className="flex flex-1 items-center justify-center border-r border-violet-500/[0.08]">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/[0.08]">
                    <GitBranch className="h-7 w-7 text-violet-400/60" />
                  </div>
                  <p className="text-xs text-neutral-600">Infinite diagram canvas</p>
                </div>
              </div>
              {/* Chat sidebar area */}
              <div className="hidden sm:flex w-52 flex-col border-l border-violet-500/[0.08] p-3 gap-2">
                <div className="h-3 w-20 rounded-full bg-violet-500/10" />
                <div className="h-2 w-full rounded-full bg-neutral-800" />
                <div className="h-2 w-4/5 rounded-full bg-neutral-800" />
                <div className="h-2 w-3/5 rounded-full bg-neutral-800" />
                <div className="mt-auto rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2">
                  <div className="h-2 w-3/4 rounded-full bg-violet-500/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="w-full py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <SectionBadge title="Process" icon={<Settings className="h-3 w-3" />} />
            <h2
              id="how-heading"
              className="mt-5 text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent tracking-tight"
            >
              Diagram in seconds
            </h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
              No drag-and-drop. No clunky menus. Just describe it and watch it appear.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                className="group rounded-xl border border-violet-500/[0.12] bg-[hsl(240,16%,8%)]/80 p-6 hover:border-violet-500/30 hover:bg-[hsl(240,18%,10%)] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 group-hover:border-violet-500/40 transition-colors">
                    <step.icon className="h-5 w-5 text-violet-300" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-neutral-700 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{step.info}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="w-full py-20"
      >
        {/* Full-width background */}
        <div className="w-full" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%)" }} aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <SectionBadge title="Features" icon={<Zap className="h-3 w-3" />} />
            <h2
              id="features-heading"
              className="mt-5 text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent tracking-tight"
            >
              Everything you need to diagram fast
            </h2>
            <p className="mt-4 text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
              Built for engineers and architects who think in systems.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-violet-500/[0.12] bg-[hsl(240,16%,8%)]/80 p-6 hover:border-violet-500/30 hover:bg-[hsl(240,18%,10%)] transition-all duration-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 group-hover:border-violet-500/40 mb-4 transition-colors">
                  <f.icon className="h-5 w-5 text-violet-300" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-violet-100 transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.info}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marquee examples ── */}
      <section
        aria-labelledby="examples-heading"
        className="w-full py-20 overflow-hidden"
      >
        <div className="mx-auto max-w-2xl px-4 text-center mb-12">
          <SectionBadge title="Examples" icon={<Code2 className="h-3 w-3" />} />
          <h2
            id="examples-heading"
            className="mt-5 text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent tracking-tight"
          >
            Anything you can describe, we can draw
          </h2>
        </div>

        <div className="relative flex flex-col gap-4">
          <Marquee reverse pauseOnHover className="[--duration:35s] select-none">
            {firstRow.map((ex) => (
              <ExampleCard key={ex.name} ex={ex} />
            ))}
          </Marquee>
          <Marquee pauseOnHover className="[--duration:35s] select-none">
            {secondRow.map((ex) => (
              <ExampleCard key={ex.name} ex={ex} />
            ))}
          </Marquee>
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-[hsl(240,16%,5%)] to-transparent" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[10%] bg-gradient-to-l from-[hsl(240,16%,5%)] to-transparent" aria-hidden="true" />
        </div>
      </section>

      {/* ── Open Source / Contributors ── */}
      <section
        id="open-source"
        aria-labelledby="oss-heading"
        className="w-full py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Contributors */}
            <div className="rounded-2xl border border-violet-500/[0.12] bg-[hsl(240,16%,8%)]/80 p-7">
              <SectionBadge title="Contributors" icon={<Users className="h-3 w-3" />} />
              <h3 id="oss-heading" className="mt-5 text-xl font-bold text-white">Built in the open</h3>
              <p className="mt-2.5 text-sm text-neutral-400 leading-relaxed">
                Graphini is MIT licensed. Code, issues, docs, feedback — every contribution makes it better.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <a
                  href="https://github.com/omkarbhad"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Omkar Bhad on GitHub"
                >
                  <img
                    src="https://github.com/omkarbhad.png"
                    alt="Omkar Bhad"
                    width={36}
                    height={36}
                    loading="lazy"
                    className="h-9 w-9 rounded-full border-2 border-violet-500/40 ring-2 ring-[hsl(240,16%,8%)]"
                  />
                </a>
                <a
                  href="https://github.com/omkarbhad/graphini/graphs/contributors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="All contributors"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-violet-500/30 text-xs text-neutral-500 hover:border-violet-400/50 hover:text-violet-300 transition-colors"
                >
                  +
                </a>
                <div className="ml-1">
                  <p className="text-xs font-medium text-neutral-300">Omkar Bhad</p>
                  <p className="text-[11px] text-neutral-600">Creator &amp; maintainer</p>
                </div>
              </div>
              <a
                href="https://github.com/omkarbhad/graphini"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Contribute on GitHub <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Sponsors */}
            <div className="rounded-2xl border border-violet-500/[0.12] bg-[hsl(240,16%,8%)]/80 p-7">
              <SectionBadge title="Sponsors & Stack" icon={<Sparkles className="h-3 w-3" />} />
              <h3 className="mt-5 text-xl font-bold text-white">Keep it free &amp; open</h3>
              <p className="mt-2.5 text-sm text-neutral-400 leading-relaxed">
                Graphini is free forever. Sponsoring helps keep it maintained and growing.
              </p>
              <ul className="mt-6 space-y-2.5" aria-label="Sponsors and technology partners">
                {SPONSORS.map((s) => (
                  <li key={s.name}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-violet-500/[0.1] bg-[hsl(240,16%,6%)] px-4 py-2.5 hover:border-violet-500/25 hover:bg-[hsl(240,16%,8%)] transition-all"
                    >
                      <span className="text-sm font-medium text-neutral-300">{s.name}</span>
                      <span className="text-xs text-neutral-600">{s.desc}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <a
                href="https://github.com/sponsors/omkarbhad"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-pink-500/30 bg-pink-500/[0.08] px-4 py-2 text-xs font-medium text-pink-300 hover:bg-pink-500/[0.14] hover:border-pink-500/50 transition-all"
              >
                ❤️ Become a sponsor
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section aria-label="Call to action" className="w-full py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className="relative overflow-hidden rounded-2xl border border-violet-500/[0.15] bg-gradient-to-br from-[hsl(240,20%,9%)] to-[hsl(250,18%,7%)] px-8 py-16 text-center"
          >
            {/* Decorative glows */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute left-1/4 top-0 h-48 w-48 rounded-full bg-violet-600/15 blur-[80px]" />
              <div className="absolute right-1/4 bottom-0 h-48 w-48 rounded-full bg-indigo-600/12 blur-[80px]" />
            </div>
            <h2 className="relative text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
              Ready to think in{" "}
              <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                diagrams?
              </span>
            </h2>
            <p className="relative mt-4 text-neutral-400 max-w-sm mx-auto text-sm sm:text-base">
              Free, open source, no account required to start.
            </p>
            <div className="relative flex flex-wrap items-center justify-center gap-3 mt-8">
              <Link href="/editor">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all"
                >
                  Open Editor <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a
                href="https://github.com/omkarbhad/graphini"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Star Graphini on GitHub"
              >
                <Button
                  size="lg"
                  className="border border-violet-500/30 bg-transparent text-violet-100 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all gap-2"
                >
                  <GitHubIcon className="h-4 w-4" />
                  Star on GitHub ⭐
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExampleCard({ ex }: { ex: { name: string; body: string } }) {
  return (
    <div className="mx-2 w-60 flex-shrink-0 rounded-xl border border-violet-500/[0.12] bg-[hsl(240,16%,8%)]/80 p-4 hover:border-violet-500/30 hover:bg-[hsl(240,18%,10%)] transition-all duration-300">
      <p className="text-sm font-semibold text-white mb-1.5">{ex.name}</p>
      <p className="text-[11px] text-neutral-500 font-mono leading-relaxed">{ex.body}</p>
    </div>
  );
}
