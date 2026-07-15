import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from './icons'

export default function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`min-w-[190px] rounded-lg border bg-forge-panel shadow-lg ${
        selected ? 'border-yellow-400' : 'border-forge-border'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-yellow-400" />
      <div className="flex items-center gap-2 border-b border-forge-border px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-yellow-400/20 text-yellow-400">
          <GitBranch size={14} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
          Condition
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium">{data.label || 'New Condition'}</div>
        <div className="mt-0.5 truncate font-mono text-xs text-forge-muted">
          {data.field ? `${data.field} ${data.operator} ${data.value}` : 'not configured'}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-yellow-400" />
    </div>
  )
}
