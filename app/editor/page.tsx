'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { withBatchedUpdatesThrottled, initializeWASMPerformance } from '../lib/performance'
import dynamic from 'next/dynamic'
import type { PlaitElement, Point } from '@plait/core'
import {
  PlaitBoard,
  getViewportOrigination,
  PlaitGroupElement,
  RectangleClient,
  WritableClipboardOperationType,
} from '@plait/core'
import { toast } from 'sonner'
import { AsyncSidebar } from '@/components/async-sidebar'
import { Navbar } from '@/components/ui/navbar'
import { cn } from '@/lib/utils'
import { TextShimmer } from '@/components/ui/text-shimmer'

// RequestAnimationFrame-based throttle for ultra-smooth zoom/pan/move/selection operations
// This is significantly better than setTimeout-based throttling for visual operations
function rafThrottle<T extends (...args: any[]) => void>(func: T): (...args: Parameters<T>) => void {
  let rafId: number | null = null
  let latestArgs: Parameters<T>

  return function(this: any, ...args: Parameters<T>) {
    latestArgs = args

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, latestArgs)
        rafId = null
      })
    }
  }
}

const Drawnix = dynamic(() => import('@drawnix/drawnix').then(mod => ({ default: mod.Drawnix })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-gradient-to-br from-gray-50 to-white">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <TextShimmer className="text-sm font-medium text-gray-600">Loading canvas...</TextShimmer>
      </div>
    </div>
  ),
})

export default function Home() {
  const [drawnixValue, setDrawnixValue] = useState<PlaitElement[]>([])
  const boardRef = useRef<PlaitBoard | null>(null)
  const [mermaidLib, setMermaidLib] = useState<any>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Auto-collapse sidebar on mobile screens
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024
    }
    return false
  })

  // Ref for toolbar portal to render toolbar in navbar
  const toolbarPortalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadLibs = async () => {
      try {
        // Pre-initialize WASM for better performance
        initializeWASMPerformance()
        
        const mermaidModule = await import('@plait-board/mermaid-to-drawnix')
        setMermaidLib(mermaidModule)
      } catch (err) {
        console.error('Failed to load libraries:', err)
      }
    }

    loadLibs()
  }, [])

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const shouldCollapse = window.innerWidth < 1024
      if (shouldCollapse && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isSidebarCollapsed])


  const handleAddMermaidToCanvas = useCallback(
    async (mermaidCode: string) => {
      if (!mermaidLib) {
        toast.error('Mermaid converter not loaded yet')
        return
      }

      if (!boardRef.current) {
        toast.error('Canvas not ready')
        return
      }

      try {
        let result

        try {
          result = await mermaidLib.parseMermaidToDrawnix(mermaidCode)
        } catch (err: any) {
          // Single fast retry with common fixes
          const fixedCode = mermaidCode
            .replace(/"/g, "'") // Fix quotes
            .replace(/\[([^\]]*)\(([^\]]*)\)([^\]]*)\]/g, '[$1$2$3]') // Remove parentheses from labels
            .replace(/^componentDiagram\s*$/gm, 'graph TD') // Fix componentDiagram syntax
            .replace(/^componentDiagram\s+(\w+)\s*$/gm, 'graph $1') // Fix componentDiagram with direction
            .split('\n')
            .filter(line => {
              const trimmed = line.trim()
              // Remove problematic style/class lines
              return trimmed &&
                     !trimmed.startsWith('%%') &&
                     !trimmed.startsWith('style ') &&
                     !trimmed.startsWith('class ') &&
                     !trimmed.startsWith('classdef ') &&
                     !trimmed.startsWith('classDef ')
            })
            .join('\n')

          try {
            result = await mermaidLib.parseMermaidToDrawnix(fixedCode)
          } catch (err2: any) {
            // If still failing, show error
            const errorMsg = err2?.message || err?.message || 'Unknown parsing error'
            toast.error('Mermaid Syntax Error', {
              description: `Unable to parse diagram: ${errorMsg.substring(0, 100)}`,
              duration: 5000,
            })
            console.error('Mermaid parse failed:', {
              originalError: err?.message,
              retryError: err2?.message,
              code: mermaidCode.substring(0, 200)
            })
            throw err2
          }
        }

        const { elements } = result

        if (!elements || elements.length === 0) {
          toast.error('No elements generated from Mermaid diagram')
          return
        }

        const board = boardRef.current
        const boardContainer = PlaitBoard.getBoardContainer(board)

        if (!boardContainer) {
          toast.error('Canvas container not found')
          return
        }

        // Optimize: Calculate positions once and cache results
        const boardContainerRect = boardContainer.getBoundingClientRect()
        const zoom = board.viewport.zoom
        const origination = getViewportOrigination(board)

        // Use faster calculation without intermediate arrays
        const focusX = boardContainerRect.width / 2
        const focusY = boardContainerRect.height / 2
        const centerX = origination![0] + focusX / zoom
        const centerY = origination![1] + focusY / zoom

        // Optimize: Filter and map in single pass
        const nonGroupElements: any[] = []
        for (const ele of elements) {
          if (!PlaitGroupElement.isGroup(ele)) {
            nonGroupElements.push(RectangleClient.getRectangleByPoints(ele.points as Point[]))
          }
        }

        const elementRectangle = RectangleClient.getBoundingRectangle(nonGroupElements)

        const startPoint: Point = [
          centerX - elementRectangle.width / 2,
          centerY - elementRectangle.height / 2,
        ]

        // Create a text element to display the diagram code
        const codeTextElement = {
          id: `diagram-code-${Date.now()}`,
          type: 'text',
          points: [
            [startPoint[0] - 20, startPoint[1] - 40],
            [startPoint[0] + 300, startPoint[1] - 10]
          ],
          text: {
            children: [
              {
                text: `Diagram Code:\n${mermaidCode}`,
                color: '#666666',
                fontSize: 12,
                fontFamily: 'monospace'
              }
            ]
          },
          strokeColor: '#e0e0e0',
          strokeWidth: 1,
          fill: '#f8f8f8'
        }

        // Add the code text element to the elements array
        const elementsWithCode = [...elements, codeTextElement]

        // Optimize: Use direct reference instead of JSON.parse(JSON.stringify())
        // This is much faster for large diagrams
        board.insertFragment(
          { elements: elementsWithCode },
          startPoint,
          WritableClipboardOperationType.paste
        )

        toast.success('Diagram added to canvas!')
      } catch (err: any) {
        console.error('Error converting mermaid:', err)
        toast.error('Failed to convert Mermaid diagram: ' + err.message)
      }
    },
    [mermaidLib]
  )


  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [setIsSidebarCollapsed])

  // Optimize: Use RAF throttle for onChange to sync with browser paint cycles
  // This dramatically improves performance during selection/zoom/pan/move operations
  // RAF ensures updates happen at optimal times (right before browser repaints)
  const handleDrawnixChange = useMemo(() => {
    return withBatchedUpdatesThrottled((data: any) => {
      setDrawnixValue(data.children)
    })
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <Navbar
        onSidebarToggle={handleSidebarToggle}
        sidebarCollapsed={isSidebarCollapsed}
      >
        {/* Toolbar portal - Drawnix will render its toolbar here */}
        <div ref={toolbarPortalRef} className="flex items-center justify-center" />
      </Navbar>

      <main
        className="absolute inset-0 pt-14"
        style={{
          // Critical performance optimizations for zoom/pan/move with selections
          willChange: 'transform',           // Tell browser to optimize transforms
          transform: 'translateZ(0)',        // Force GPU layer
          backfaceVisibility: 'hidden',      // Prevent flickering during transforms
          perspective: 1000,                 // Enable 3D context for better GPU usage
          isolation: 'isolate',              // Create stacking context for performance
        }}
      >
        <Drawnix
          value={drawnixValue}
          onChange={handleDrawnixChange}
          theme={{
            themeColorMode: 'default' as any,
          } as any}
          afterInit={(board: any) => {
            boardRef.current = board

            // Additional performance optimization: Disable text selection during operations
            if (board && board.container) {
              board.container.style.userSelect = 'none'
              board.container.style.webkitUserSelect = 'none'
            }
          }}
          sidebarCollapsed={isSidebarCollapsed}
          onSidebarToggle={handleSidebarToggle}
          toolbarPortal={toolbarPortalRef.current}
        />

      </main>


      <AsyncSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        onAddMermaidToCanvas={handleAddMermaidToCanvas}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.08),_transparent_60%)] blur-2xl" />
      
    </div>
  )
}
