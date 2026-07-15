import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Node, Edge } from 'reactflow'
import FlowEditor from '../components/FlowEditor'
import ExecutionLogs from '../components/ExecutionLogs'
import {
  useSetWorkflowStatus,
  useTriggerWorkflow,
  useUpdateWorkflow,
  useWorkflow,
} from '../api/hooks'

export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workflow, isLoading } = useWorkflow(id)
  const updateWorkflow = useUpdateWorkflow(id!)
  const setStatus = useSetWorkflowStatus(id!)
  const triggerWorkflow = useTriggerWorkflow(id!)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [graph, setGraph] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] })
  const [dirty, setDirty] = useState(false)
  const [showLogs, setShowLogs] = useState(true)
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null)

  useEffect(() => {
    if (workflow) {
      setName(workflow.name)
      setDescription(workflow.description)
      setGraph({ nodes: workflow.nodes || [], edges: workflow.edges || [] })
    }
  }, [workflow?.id])

  if (isLoading || !workflow) {
    return <div className="p-10 text-sm text-forge-muted">Loading workflow…</div>
  }

  const handleGraphChange = (nodes: Node[], edges: Edge[]) => {
    setGraph({ nodes, edges })
    setDirty(true)
  }

  const handleSave = async () => {
    await updateWorkflow.mutateAsync({
      name,
      description,
      nodes: graph.nodes,
      edges: graph.edges,
      cron_expr: workflow.cron_expr,
    })
    setDirty(false)
  }

  const handleRun = async () => {
    if (dirty) await handleSave()
    const exec = await triggerWorkflow.mutateAsync({ status: 'ok', source: 'manual-test' })
    setActiveExecutionId(exec.id)
    setShowLogs(true)
  }

  const toggleActive = () => {
    setStatus.mutate(workflow.status === 'active' ? 'paused' : 'active')
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-forge-border bg-forge-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-sm text-forge-muted hover:text-forge-text">
            ← Workflows
          </button>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setDirty(true)
            }}
            className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none focus:border-forge-border focus:bg-forge-bg"
          />
          <input
            value={description}
            placeholder="Add a description…"
            onChange={(e) => {
              setDescription(e.target.value)
              setDirty(true)
            }}
            className="w-64 rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-forge-muted outline-none focus:border-forge-border focus:bg-forge-bg"
          />
        </div>

        <div className="flex items-center gap-2">
          <code className="rounded bg-forge-bg px-2 py-1 text-[11px] text-forge-muted">
            /webhooks/{workflow.webhook_slug}
          </code>
          <button
            onClick={toggleActive}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              workflow.status === 'active'
                ? 'bg-forge-success/20 text-forge-success'
                : 'bg-forge-muted/20 text-forge-muted'
            }`}
          >
            {workflow.status === 'active' ? 'Active' : 'Inactive'}
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="rounded-md border border-forge-border px-3 py-1.5 text-xs font-medium text-forge-text disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={handleRun}
            className="rounded-md bg-forge-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-forge-accent/90"
          >
            ▶ Test run
          </button>
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="rounded-md border border-forge-border px-3 py-1.5 text-xs font-medium text-forge-text"
          >
            {showLogs ? 'Hide logs' : 'Show logs'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <FlowEditor initialNodes={graph.nodes} initialEdges={graph.edges} onChange={handleGraphChange} />
        </div>
        {showLogs && (
          <div className="h-full w-[520px] shrink-0 border-l border-forge-border">
            <ExecutionLogs
              workflowId={workflow.id}
              activeExecutionId={activeExecutionId}
              onSelectExecution={setActiveExecutionId}
            />
          </div>
        )}
      </div>
    </div>
  )
}
