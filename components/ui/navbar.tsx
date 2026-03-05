'use client'

import * as React from 'react'
import {
  HelpCircle,
  PanelRight,
  PanelRightOpen,
  Share2,
  Sparkles,
  Workflow,
  TestTube,
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { TextShimmer } from './text-shimmer'

interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
  children?: React.ReactNode
}

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, sidebarCollapsed = false, onSidebarToggle, children, ...props }, ref) => {
    const toggleLabel = sidebarCollapsed ? 'Open agent sidebar' : 'Collapse agent sidebar'

    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60',
          className
        )}
        {...props}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3 text-gray-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Workflow className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-tight">
              <TextShimmer as="span" className="text-sm font-semibold tracking-wide" duration={3} spread={1.5}>
                Graphini
              </TextShimmer>
              <span className="text-[10px] uppercase tracking-[0.4em] text-gray-500">Diagram workspace</span>
            </div>
          </div>

          {/* Toolbar Section */}
          <div className="flex flex-1 justify-center">
            {children}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Discover templates"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Share workspace"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Test artifact system"
              onClick={() => {
                // This would trigger the artifact demo
                console.log("Artifact demo triggered");
              }}
            >
              <TestTube className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Get help"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
            {onSidebarToggle ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={toggleLabel}
                onClick={onSidebarToggle}
                className="h-10 w-10 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                {sidebarCollapsed ? (
                  <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <PanelRight className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </header>
    )
  }
)

Navbar.displayName = 'Navbar'
