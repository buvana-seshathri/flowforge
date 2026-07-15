import { useEffect, useRef, useState } from 'react'
import { wsUrl } from '../api/client'
import { ExecutionLog } from '../types'

/**
 * Subscribes to real-time execution logs over WebSocket for a given execution.
 * The backend streams ExecutionLog events as they're written by the workflow
 * engine's distributed workers, via Redis pub/sub.
 */
export function useExecutionStream(executionId?: string) {
  const [liveLogs, setLiveLogs] = useState<ExecutionLog[]>([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!executionId) return
    setLiveLogs([])

    const socket = new WebSocket(wsUrl(executionId))
    socketRef.current = socket

    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)
    socket.onmessage = (event) => {
      try {
        const log: ExecutionLog = JSON.parse(event.data)
        setLiveLogs((prev) => [...prev, log])
      } catch (e) {
        console.error('failed to parse log event', e)
      }
    }

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [executionId])

  return { liveLogs, connected }
}
