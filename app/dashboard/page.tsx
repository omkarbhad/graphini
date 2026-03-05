"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus, Search, GitBranch, Clock, MoreHorizontal,
  Share2, Trash2, Edit3, LogIn, Home, LayoutGrid,
  Star, Settings, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Diagram {
  id: string;
  title: string;
  updatedAt: string;
  type: "flowchart" | "sequence" | "mindmap" | "class" | "er" | "gitgraph";
  preview: string;
}

// ─── Mock data ─ replace with real DB fetch after Firebase + Neon ─────────────

const MOCK_DIAGRAMS: Diagram[] = [
  {
    id: "1",
    title: "Microservices Architecture",
    updatedAt: "2 hours ago",
    type: "flowchart",
    preview: "API Gateway → Auth → Users → Orders",
  },
  {
    id: "2",
    title: "OAuth2 Sequence",
    updatedAt: "Yesterday",
    type: "sequence",
    preview: "Client → Server → Identity Provider",
  },
  {
    id: "3",
    title: "Product Roadmap",
    updatedAt: "3 days ago",
    type: "mindmap",
    preview: "Q1: Auth · Q2: Collab · Q3: Export",
  },
  {
    id: "4",
    title: "DB Schema",
    updatedAt: "Last week",
    type: "class",
    preview: "users ─< diagrams ─< shares",
  },
];

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: LayoutGrid, label: "My Diagrams", href: "/dashboard" },
  { icon: Star, label: "Starred", href: "/dashboard/starred" },
  { icon: Share2, label: "Shared with me", href: "/dashboard/shared" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

// ─── Diagram type colors ──────────────────────────────────────────────────────

const TYPE_COLORS: Record<Diagram["type"], string> = {
  flowchart: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  sequence: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  mindmap: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  class: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  er: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  gitgraph: "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

// ─── DiagramCard ──────────────────────────────────────────────────────────────

function DiagramCard({ diagram }: { diagram: Diagram }) {
  const typeColor = TYPE_COLORS[diagram.type] ?? "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-violet-500/[0.1] bg-[hsl(240,16%,9%)] transition-all duration-200 hover:border-violet-500/25 hover:bg-[hsl(240,18%,11%)] hover:shadow-lg hover:shadow-black/30">
      {/* Preview */}
      <Link href={`/editor?id=${diagram.id}`} aria-label={`Open diagram: ${diagram.title}`} className="block">
        <div className="flex h-36 flex-col items-center justify-center border-b border-violet-500/[0.08] bg-[hsl(240,18%,7%)] px-4 gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/[0.08]">
            <GitBranch className="h-5 w-5 text-violet-400/50" aria-hidden="true" />
          </div>
          <p className="text-[11px] text-neutral-600 font-mono leading-relaxed text-center line-clamp-2 max-w-[180px]">
            {diagram.preview}
          </p>
        </div>
      </Link>

      {/* Meta */}
      <div className="flex items-center justify-between p-3 min-w-0">
        <div className="min-w-0 flex-1 mr-2">
          <Link href={`/editor?id=${diagram.id}`}>
            <p className="truncate text-sm font-medium text-neutral-200 hover:text-violet-300 transition-colors">
              {diagram.title}
            </p>
          </Link>
          <div className="mt-1 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-neutral-600 flex-shrink-0" aria-hidden="true" />
            <span className="text-[11px] text-neutral-600 truncate">{diagram.updatedAt}</span>
            <span
              className={`ml-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${typeColor}`}
            >
              {diagram.type}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`More options for ${diagram.title}`}
              className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-neutral-500 hover:text-neutral-300 hover:bg-violet-500/10 transition-all"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40 bg-[hsl(240,18%,10%)] border border-violet-500/20 text-neutral-200"
          >
            <DropdownMenuItem className="hover:bg-violet-500/10 cursor-pointer gap-2">
              <Edit3 className="h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-violet-500/10 cursor-pointer gap-2">
              <Share2 className="h-3.5 w-3.5" /> Share
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-violet-500/10" />
            <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 focus:text-red-400 cursor-pointer gap-2">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-violet-500/[0.1] bg-[hsl(240,18%,6%)]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-violet-500/[0.1] px-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
            <GitBranch className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-white">Graphini</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Dashboard navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-violet-500/15 text-violet-200 font-medium"
                  : "text-neutral-500 hover:bg-violet-500/[0.08] hover:text-neutral-200"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Auth */}
      <div className="border-t border-violet-500/[0.1] p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs border-violet-500/20 bg-transparent text-neutral-400 hover:bg-violet-500/10 hover:text-neutral-200 hover:border-violet-500/40"
        >
          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
          Sign in to save
        </Button>
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredDiagrams = MOCK_DIAGRAMS.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[hsl(240,16%,5%)]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen sticky top-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      )}
      {mobileSidebarOpen && (
        <div className="fixed inset-y-0 left-0 z-50 md:hidden">
          <Sidebar onClose={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-violet-500/[0.1] bg-[hsl(240,18%,6%)]/95 backdrop-blur px-4 sm:px-6">
          <button
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-sm font-semibold text-neutral-200">My Diagrams</h1>
          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600"
              aria-hidden="true"
            />
            <Input
              placeholder="Search diagrams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search diagrams"
              className="h-8 pl-8 text-sm bg-[hsl(240,18%,9%)] border-violet-500/20 text-neutral-200 placeholder:text-neutral-600 focus:border-violet-500/40"
            />
          </div>

          <Link href="/editor">
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">New diagram</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>

        <div className="flex-1 p-4 sm:p-6">
          {/* Auth banner */}
          <div
            role="alert"
            className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between rounded-xl border border-dashed border-violet-500/20 bg-violet-500/[0.04] p-4"
          >
            <div>
              <p className="text-sm font-medium text-neutral-200">Sign in to save your work</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Create an account to save, share, and sync diagrams across devices.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0 gap-2 border-violet-500/30 bg-transparent text-neutral-300 hover:bg-violet-500/10 hover:text-neutral-100 hover:border-violet-500/50"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Sign in
            </Button>
          </div>

          {/* Section label */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
              Recent
            </h2>
            <span className="text-xs text-neutral-700">
              {filteredDiagrams.length} diagram{filteredDiagrams.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* New diagram card */}
            <Link href="/editor" aria-label="Create a new diagram" className="group">
              <div className="flex min-h-[220px] h-full flex-col items-center justify-center rounded-xl border border-dashed border-violet-500/[0.15] bg-transparent transition-all hover:border-violet-500/35 hover:bg-violet-500/[0.04]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/[0.06] group-hover:border-violet-500/40 group-hover:bg-violet-500/10 transition-all mb-2">
                  <Plus className="h-5 w-5 text-violet-400/50 group-hover:text-violet-300 transition-colors" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-neutral-600 group-hover:text-violet-300 transition-colors">
                  New diagram
                </p>
              </div>
            </Link>

            {/* Filtered diagram cards */}
            {filteredDiagrams.length > 0 ? (
              filteredDiagrams.map((d) => <DiagramCard key={d.id} diagram={d} />)
            ) : (
              <div className="col-span-full py-16 text-center">
                <p className="text-sm text-neutral-600">No diagrams match &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
