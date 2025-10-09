'use client'

import { useEffect, useState, useCallback } from 'react'
import type { PlaitElement } from '@plait/core'

export interface MermaidToDrawnixAPI {
  parseMermaidToDrawnix: (
    definition: string,
    config?: any
  ) => Promise<{ elements: PlaitElement[] }>
}

export function useMermaidToCanvas() {
  const [api, setApi] = useState<MermaidToDrawnixAPI | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLib = async () => {
      try {
        const mermaidModule = await import('@plait-board/mermaid-to-drawnix')
        setApi(mermaidModule as MermaidToDrawnixAPI)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load mermaid-to-drawnix:', err)
        setLoading(false)
      }
    }
    loadLib()
  }, [])

  const convertMermaid = useCallback(
    async (mermaidCode: string): Promise<PlaitElement[]> => {
      if (!api) {
        throw new Error('Mermaid API not loaded')
      }

      try {
        const result = await api.parseMermaidToDrawnix(mermaidCode)
        return result.elements
      } catch (err: any) {
        // Try with quotes replaced
        try {
          const result = await api.parseMermaidToDrawnix(
            mermaidCode.replace(/"/g, "'")
          )
          return result.elements
        } catch (retryErr) {
          throw err
        }
      }
    },
    [api]
  )

  return { convertMermaid, loading, ready: !loading && !!api }
}
