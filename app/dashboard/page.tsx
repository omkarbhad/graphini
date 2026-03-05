"use client";

import Link from "next/link";
import {
  Plus,
  Search,
  GitBranch,
  Clock,
  MoreHorizontal,
  Share2,
  Trash2,
  Edit3,
  LogIn,
  Home,
  Layout,
  Star,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextShimmer } from "@/components/ui/text-shimmer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Placeholder diagrams — replace with real DB fetch after Firebase + Neon integration
const MOCK_DIAGRAMS = [
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
    preview: "users ─ diagrams ─ shares",
  },
];

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Layout, label: "My Diagrams", href: "/dashboard", active: true },
  { icon: Star, label: "Starred", href: "/dashboard/starred" },
  { icon: Share2, label: "Shared with me", href: "/dashboard/shared" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

function DiagramCard({ diagram }: { diagram: typeof MOCK_DIAGRAMS[0] }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md">
      {/* Preview area */}
      <Link href={`/editor?id=${diagram.id}`} className="block">
        <div className="flex h-36 items-center justify-center border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white px-4">
          <div className="text-center">
            <GitBranch className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-[11px] text-gray-400 font-mono leading-relaxed">{diagram.preview}</p>
          </div>
        </div>
      </Link>

      {/* Meta */}
      <div className="flex items-center justify-between p-3">
        <div className="min-w-0">
          <Link href={`/editor?id=${diagram.id}`}>
            <p className="truncate text-sm font-medium text-gray-900 hover:text-primary">{diagram.title}</p>
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{diagram.updatedAt}</span>
            <span>·</span>
            <span className="capitalize">{diagram.type}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <Edit3 className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="mr-2 h-3.5 w-3.5" /> Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500 focus:text-red-500">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Auth state placeholder — replace with Firebase useAuth() hook
  const isLoggedIn = false;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-gray-100 bg-white md:flex">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
          </div>
          <TextShimmer as="span" className="text-sm font-semibold" duration={3}>
            Graphini
          </TextShimmer>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                item.active
                  ? "bg-primary/8 text-primary font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth section */}
        <div className="border-t border-gray-100 p-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-sky-400" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-900">Omkar Bhad</p>
                <p className="truncate text-[10px] text-gray-400">omkar@magnova.ai</p>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
              <LogIn className="h-3.5 w-3.5" /> Sign in to save
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-auto bg-gray-50">
        {/* Topbar */}
        <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-6">
          <h1 className="text-sm font-semibold text-gray-900">My Diagrams</h1>
          <div className="flex-1" />
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search diagrams..."
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Link href="/editor">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New diagram
            </Button>
          </Link>
        </div>

        <div className="flex-1 p-6">
          {/* Auth banner */}
          {!isLoggedIn && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-white p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Sign in to save your work</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Create an account to save, share, and sync diagrams across devices.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 flex-shrink-0">
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Button>
            </div>
          )}

          {/* Recent section */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recent</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* New diagram card */}
            <Link href="/editor" className="group">
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white transition-colors hover:border-primary/40 hover:bg-primary/3">
                <Plus className="mb-2 h-8 w-8 text-gray-300 transition-colors group-hover:text-primary/60" />
                <p className="text-sm font-medium text-gray-400 group-hover:text-primary/70">New diagram</p>
              </div>
            </Link>

            {/* Diagram cards */}
            {MOCK_DIAGRAMS.map((d) => (
              <DiagramCard key={d.id} diagram={d} />
            ))}
          </div>

          {/* Empty state (shown when no diagrams and logged in) */}
          {/* 
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <GitBranch className="mb-4 h-12 w-12 text-gray-200" />
            <h3 className="text-sm font-medium text-gray-900">No diagrams yet</h3>
            <p className="mt-1.5 text-sm text-gray-500">Create your first diagram to get started.</p>
            <Link href="/editor" className="mt-4">
              <Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New diagram</Button>
            </Link>
          </div>
          */}
        </div>
      </main>
    </div>
  );
}
