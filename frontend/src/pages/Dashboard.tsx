import { useNavigate } from 'react-router-dom'
import { useCreateWorkflow, useDeleteWorkflow, useWorkflows } from '../api/hooks'
import { format } from 'date-fns'

const statusStyles: Record<string, string> = {
  draft: 'bg-forge-muted/20 text-forge-muted',
  active: 'bg-forge-success/20 text-forge-success',
  paused: 'bg-yellow-400/20 text-yellow-400',
}

export default function Dashboard() {
  const { data: workflows = [], isLoading } = useWorkflows()
  const createWorkflow = useCreateWorkflow()
  const deleteWorkflow = useDeleteWorkflow()
  const navigate = useNavigate()

  const handleCreate = async () => {
    const wf = await createWorkflow.mutateAsync({
      name: 'Untitled workflow',
      description: '',
      nodes: [
        {
          id: 'trigger_start',
          type: 'trigger',
          position: { x: 80, y: 120 },
          data: { label: 'Manual start', triggerKind: 'manual' },
        },
      ],
      edges: [],
    })
    navigate(`/workflows/${wf.id}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Flow<span className="text-forge-accent">Forge</span>
          </h1>
          <p className="mt-1 text-sm text-forge-muted">
            Visual workflow automation — triggers, conditions, and actions, executed asynchronously by distributed workers.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-md bg-forge-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-forge-accent/90"
        >
          + New workflow
        </button>
      </div>

      {isLoading && <div className="text-sm text-forge-muted">Loading workflows…</div>}

      {!isLoading && workflows.length === 0 && (
        <div className="rounded-lg border border-dashed border-forge-border p-10 text-center text-sm text-forge-muted">
          No workflows yet. Create one to start automating.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="group relative cursor-pointer rounded-lg border border-forge-border bg-forge-panel p-4 transition hover:border-forge-accent"
            onClick={() => navigate(`/workflows/${wf.id}`)}
          >
            <div className="mb-2 flex items-start justify-between">
              <h2 className="truncate pr-2 font-medium">{wf.name}</h2>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[wf.status]}`}>
                {wf.status}
              </span>
            </div>
            <p className="mb-3 line-clamp-2 min-h-[2.5em] text-xs text-forge-muted">
              {wf.description || 'No description'}
            </p>
            <div className="flex items-center justify-between text-[11px] text-forge-muted">
              <span>{wf.nodes?.length ?? 0} nodes</span>
              <span>Updated {format(new Date(wf.updated_at), 'MMM d, HH:mm')}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete "${wf.name}"?`)) deleteWorkflow.mutate(wf.id)
              }}
              className="absolute right-3 top-3 hidden text-xs text-forge-danger group-hover:block"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
