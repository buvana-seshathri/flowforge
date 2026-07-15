import { useMemo } from 'react'
import { useExecutions, useExecutionLogs } from '../api/hooks'
import { useExecutionStream } from '../hooks/useWebSocket'
import { format } from 'date-fns'

interface Props {
  workflowId: string
  activeExecutionId: string | null
  onSelectExecution: (id: string) => void
}

const statusColor: Record<string, string> = {
  pending: 'text-forge-muted',
  running: 'text-forge-accent2',
  success: 'text-forge-success',
  failed: 'text-forge-danger',
}

const levelColor: Record<string, string> = {
  info: 'text-forge-muted',
  success: 'text-forge-success',
  error: 'text-forge-danger',
}

export default function ExecutionLogs({ workflowId, activeExecutionId, onSelectExecution }: Props) {
  const { data: executions = [] } = useExecutions(workflowId)
  const { data: historicalLogs = [] } = useExecutionLogs(activeExecutionId || undefined)
  const { liveLogs, connected } = useExecutionStream(activeExecutionId || undefined)

  const mergedLogs = useMemo(() => {
    const seen = new Set<number>()
    const all = [...historicalLogs, ...liveLogs].filter((l) => {
      if (seen.has(l.id)) return false
      seen.add(l.id)
      return true
    })
    return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [historicalLogs, liveLogs])

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 overflow-y-auto border-r border-forge-border">
        <div className="border-b border-forge-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-forge-muted">
          Executions
        </div>
        {executions.length === 0 && (
          <div className="px-3 py-4 text-xs text-forge-muted">No runs yet. Trigger the workflow to see it here.</div>
        )}
        {executions.map((ex) => (
          <button
            key={ex.id}
            onClick={() => onSelectExecution(ex.id)}
            className={`block w-full border-b border-forge-border px-3 py-2 text-left text-xs transition hover:bg-forge-bg ${
              activeExecutionId === ex.id ? 'bg-forge-bg' : ''
            }`}
          >
            <div className={`font-mono font-medium ${statusColor[ex.status]}`}>{ex.status}</div>
            <div className="mt-0.5 text-forge-muted">{ex.trigger_by}</div>
            <div className="text-forge-muted">{format(new Date(ex.started_at), 'HH:mm:ss')}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-black/20 p-3 font-mono text-xs">
        {activeExecutionId ? (
          <>
            <div className="mb-2 flex items-center gap-2 text-forge-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-forge-success' : 'bg-forge-muted'}`} />
              {connected ? 'Live' : 'Not connected'} · execution {activeExecutionId.slice(0, 8)}
            </div>
            {mergedLogs.map((log) => (
              <div key={log.id} className="mb-1 flex gap-2">
                <span className="shrink-0 text-forge-muted">
                  {format(new Date(log.created_at), 'HH:mm:ss.SSS')}
                </span>
                <span className={`shrink-0 uppercase ${levelColor[log.level] || 'text-forge-muted'}`}>
                  [{log.level}]
                </span>
                {log.node_type && <span className="shrink-0 text-forge-accent">{log.node_type}</span>}
                <span className="text-forge-text">{log.message}</span>
              </div>
            ))}
            {mergedLogs.length === 0 && <div className="text-forge-muted">Waiting for logs…</div>}
          </>
        ) : (
          <div className="text-forge-muted">Select an execution to view its logs.</div>
        )}
      </div>
    </div>
  )
}
