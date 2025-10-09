'use client'

import React, { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { PlaitElement, Point } from '@plait/core'
import { PlaitBoard, getViewportOrigination, PlaitGroupElement, RectangleClient, WritableClipboardOperationType } from '@plait/core'
import { toast } from 'sonner'

// Dynamically import Drawnix to avoid SSR issues
const Drawnix = dynamic(() => import('@drawnix/drawnix').then(mod => ({ default: mod.Drawnix })), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-500">Loading Drawnix...</div>
})

// Dynamically import toolbar components
const AppToolbar = dynamic(() => import('@drawnix/drawnix').then(mod => ({ default: mod.AppToolbar })), {
  ssr: false,
  loading: () => <div className="w-16 h-9 bg-gray-100 rounded animate-pulse" />
})

const CreationToolbar = dynamic(() => import('@drawnix/drawnix').then(mod => ({ default: mod.CreationToolbar })), {
  ssr: false,
  loading: () => <div className="w-16 h-9 bg-gray-100 rounded animate-pulse" />
})

interface CustomDrawnixProps {
  value: PlaitElement[]
  onChange: (data: any) => void
  theme: any
  afterInit: (board: any) => void
  onAddMermaidToCanvas: (mermaidCode: string) => void
}

export default function CustomDrawnix({ 
  value, 
  onChange, 
  theme, 
  afterInit, 
  onAddMermaidToCanvas 
}: CustomDrawnixProps) {
  const boardRef = useRef<any>(null)
  const [mermaidLib, setMermaidLib] = useState<any>(null)

  // Load mermaid-to-drawnix library
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

  const handleAddMermaidToCanvas = async (mermaidCode: string) => {
    if (!mermaidLib) {
      toast.error('Mermaid converter not loaded yet')
      return
    }

    if (!boardRef.current) {
      toast.error('Canvas not ready')
      return
    }

    try {
      // Convert mermaid to drawnix elements
      let result
      try {
        result = await mermaidLib.parseMermaidToDrawnix(mermaidCode)
      } catch (err: any) {
        // Try with quotes replaced
        result = await mermaidLib.parseMermaidToDrawnix(mermaidCode.replace(/"/g, "'"))
      }

      const { elements } = result

      if (!elements || elements.length === 0) {
        toast.error('No elements generated from Mermaid diagram')
        return
      }

      // Get board center position
      const board = boardRef.current
      const boardContainerRect = PlaitBoard.getBoardContainer(board).getBoundingClientRect()
      const focusPoint = [
        boardContainerRect.width / 2,
        boardContainerRect.height / 2,
      ]
      const zoom = board.viewport.zoom
      const origination = getViewportOrigination(board)
      const centerX = origination![0] + focusPoint[0] / zoom
      const centerY = origination![1] + focusPoint[1] / zoom

      // Calculate element bounds
      const elementRectangle = RectangleClient.getBoundingRectangle(
        elements
          .filter((ele: PlaitElement) => !PlaitGroupElement.isGroup(ele))
          .map((ele: PlaitElement) =>
            RectangleClient.getRectangleByPoints(ele.points as Point[])
          )
      )

      // Calculate start point to center the diagram
      const startPoint = [
        centerX - elementRectangle.width / 2,
        centerY - elementRectangle.height / 2,
      ] as Point

      // Insert into board
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
  }

  return (
    <div className="h-full w-full relative">
      <Drawnix
        value={value}
        onChange={onChange}
        theme={theme}
        afterInit={(board: any) => {
          boardRef.current = board
          afterInit(board)
        }}
      />
      
      {/* Creation Toolbar - Centered */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <CreationToolbar />
      </div>
    </div>
  )
}
