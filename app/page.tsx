"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Share2, Download, Zap, GitBranch, MessageSquare, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/ui/text-shimmer";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Describe your diagram in plain English. Graphini instantly renders it on canvas.",
  },
  {
    icon: GitBranch,
    title: "Mermaid DSL Support",
    description: "Write Mermaid syntax directly. Full support for flowcharts, sequences, class diagrams, and more.",
  },
  {
    icon: MessageSquare,
    title: "Chat Sidebar",
    description: "Iterate in conversation. Ask follow-up questions, refine diagrams, add nodes — all in plain text.",
  },
  {
    icon: Zap,
    title: "Instant Canvas",
    description: "No export step, no friction. Your diagram lives on an infinite canvas, ready to pan and zoom.",
  },
  {
    icon: Share2,
    title: "Share Anywhere",
    description: "Export as PNG, SVG, or JSON. Share a link — your diagram, your way.",
  },
  {
    icon: Download,
    title: "Open Standard",
    description: "Built on open formats. Your data is yours — import, export, and extend freely.",
  },
];

const EXAMPLES = [
  { label: "System architecture", prompt: "Draw a microservices architecture with API gateway, auth service, and Postgres" },
  { label: "Flowchart", prompt: "User signup flow with email verification and onboarding steps" },
  { label: "Sequence diagram", prompt: "OAuth2 authentication flow between client, server, and identity provider" },
  { label: "Mind map", prompt: "Product roadmap for a SaaS app — features, infrastructure, and growth" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <GitBranch className="h-4 w-4 text-primary" />
            </div>
            <TextShimmer as="span" className="text-sm font-semibold tracking-wide" duration={3}>
              Graphini
            </TextShimmer>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link href="/editor">
              <Button size="sm" className="gap-1.5">
                Open Editor <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 py-24 text-center md:py-36">
        {/* Gradient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-100/60 blur-3xl" />
          <div className="absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/60 px-3 py-1 text-xs font-medium text-gray-500 backdrop-blur mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI-powered diagram workspace · Open source
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">
          Describe it.{" "}
          <TextShimmer as="span" className="font-bold" duration={2.5}>
            See it.
          </TextShimmer>{" "}
          Ship it.
        </h1>

        <p className="mt-5 max-w-xl text-base text-gray-500 md:text-lg">
          Graphini turns plain-English prompts and Mermaid syntax into interactive diagrams — instantly, on an infinite canvas.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/editor">
            <Button size="lg" className="gap-2">
              <Play className="h-4 w-4" />
              Start diagramming free
            </Button>
          </Link>
          <a
            href="https://github.com/omkarbhad/graphini"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="outline" className="gap-2">
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Example prompts */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-gray-400">Try:</span>
          {EXAMPLES.map((ex) => (
            <Link
              key={ex.label}
              href={`/editor?prompt=${encodeURIComponent(ex.prompt)}`}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              {ex.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Demo preview placeholder */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-300" />
            <span className="h-3 w-3 rounded-full bg-yellow-300" />
            <span className="h-3 w-3 rounded-full bg-green-300" />
            <span className="ml-3 flex-1 rounded-md border border-gray-100 bg-white px-3 py-1 text-center text-xs text-gray-400">
              graphini.magnova.ai/editor
            </span>
          </div>
          <div className="flex h-72 items-center justify-center text-gray-400">
            <div className="text-center">
              <GitBranch className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">Live editor preview</p>
              <Link href="/editor">
                <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-primary">
                  Open editor <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Everything you need to diagram fast</h2>
          <p className="mt-3 text-gray-500">Built for engineers and architects who think in systems.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-sm"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-2xl bg-gray-900 px-8 py-14 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
            <div className="absolute left-1/4 top-0 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute right-1/4 bottom-0 h-48 w-48 rounded-full bg-sky-600/20 blur-3xl" />
          </div>
          <h2 className="relative text-2xl font-bold md:text-3xl">Ready to think in diagrams?</h2>
          <p className="relative mt-3 text-gray-400">Free, open-source, no account required to start.</p>
          <Link href="/editor" className="relative mt-6 inline-block">
            <Button size="lg" className="gap-2 bg-white text-gray-900 hover:bg-gray-100">
              Open Editor <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-gray-400 md:flex-row md:justify-between">
          <span>© 2025 Graphini · Built by <a href="https://magnova.ai" className="hover:text-gray-600 underline underline-offset-2">Magnova.ai</a></span>
          <div className="flex gap-4">
            <a href="https://github.com/omkarbhad/graphini" className="hover:text-gray-600">GitHub</a>
            <Link href="/editor" className="hover:text-gray-600">Editor</Link>
            <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
