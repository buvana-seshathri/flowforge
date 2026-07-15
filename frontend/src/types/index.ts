export type NodeKind = 'trigger' | 'condition' | 'action'

export interface NodeData {
  label: string
  triggerKind?: 'webhook' | 'schedule' | 'manual'
  field?: string
  operator?: 'equals' | 'not_equals' | 'contains'
  value?: string
  actionKind?: 'http_request' | 'log' | 'delay'
  url?: string
  method?: string
  body?: string
  message?: string
  delayMs?: number
}

export interface Workflow {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused'
  nodes: any[]
  edges: any[]
  webhook_slug: string
  cron_expr: string
  created_at: string
  updated_at: string
}

export interface Execution {
  id: string
  workflow_id: string
  status: 'pending' | 'running' | 'success' | 'failed'
  trigger_by: string
  input_data: any
  started_at: string
  finished_at: string | null
  error: string
}

export interface ExecutionLog {
  id: number
  execution_id: string
  node_id: string
  node_type: string
  level: 'info' | 'success' | 'error'
  message: string
  created_at: string
}
