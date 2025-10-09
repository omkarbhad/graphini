'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
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
import ChatBox from '@/components/chatbox'
import { Navbar } from '@/components/ui/navbar'
import { cn } from '@/lib/utils'

const Drawnix = dynamic(() => import('@drawnix/drawnix').then(mod => ({ default: mod.Drawnix })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center text-muted-foreground">
      Loading canvas...
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

  useEffect(() => {
    const loadLib = async () => {
      try {
        const mermaidModule = await import('@plait-board/mermaid-to-drawnix')
        setMermaidLib(mermaidModule)
      } catch (err) {
        console.error('Failed to load mermaid-to-drawnix:', err)
      }
    }

    loadLib()
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
          result = await mermaidLib.parseMermaidToDrawnix(mermaidCode.replace(/"/g, "'"))
        }

        const { elements } = result

        if (!elements || elements.length === 0) {
          toast.error('No elements generated from Mermaid diagram')
          return
        }

        const board = boardRef.current
        const boardContainerRect = PlaitBoard.getBoardContainer(board).getBoundingClientRect()
        const focusPoint = [boardContainerRect.width / 2, boardContainerRect.height / 2]
        const zoom = board.viewport.zoom
        const origination = getViewportOrigination(board)
        const centerX = origination![0] + focusPoint[0] / zoom
        const centerY = origination![1] + focusPoint[1] / zoom

        const elementRectangle = RectangleClient.getBoundingRectangle(
          elements
            .filter((ele: PlaitElement) => !PlaitGroupElement.isGroup(ele))
            .map((ele: PlaitElement) => RectangleClient.getRectangleByPoints(ele.points as Point[]))
        )

        const startPoint = [
          centerX - elementRectangle.width / 2,
          centerY - elementRectangle.height / 2,
        ] as Point

        board.insertFragment(
          {
            elements: JSON.parse(JSON.stringify(elements)),
          },
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


  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <Navbar
        onSidebarToggle={handleSidebarToggle}
        sidebarCollapsed={isSidebarCollapsed}
      />

      <main className="absolute inset-0">
        <Drawnix
          value={drawnixValue}
          onChange={(data: any) => {
            setDrawnixValue(data.children)
          }}
          theme={{
            themeColorMode: 'default' as any,
          } as any}
          afterInit={(board: any) => {
            boardRef.current = board
          }}
          sidebarCollapsed={isSidebarCollapsed}
          onSidebarToggle={handleSidebarToggle}
        />
      </main>


      <aside
        className={cn(
          'pointer-events-none absolute top-14 bottom-0 right-0 z-40 flex w-full max-w-[24rem] translate-x-0 transform-gpu transition-transform duration-300 ease-out sm:max-w-[26rem] lg:max-w-[28rem]',
          isSidebarCollapsed ? 'translate-x-full' : 'translate-x-0'
        )}
      >
        <div className="pointer-events-auto flex h-full w-full items-stretch bg-gradient-to-l from-white/80 via-white/55 to-transparent p-4 sm:p-6">
          <ChatBox
            onAddMermaidToCanvas={handleAddMermaidToCanvas}
            hidden={isSidebarCollapsed}
            className="h-full"
          />
        </div>
      </aside>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.08),_transparent_60%)] blur-2xl" />
    </div>
  )
}
