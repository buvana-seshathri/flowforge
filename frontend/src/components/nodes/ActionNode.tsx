import { Handle, Position, NodeProps } from 'reactflow'
import { Bolt } from './icons'

export default function ActionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`min-w-[190px] rounded-lg border bg-forge-panel shadow-lg ${
        selected ? 'border-forge-accent' : 'border-forge-border'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-forge-accent" />
      <div className="flex items-center gap-2 border-b border-forge-border px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-forge-accent/20 text-forge-accent">
          <Bolt size={14} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-forge-accent">
          Action
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium">{data.label || 'New Action'}</div>
        <div className="mt-0.5 text-xs text-forge-muted">{data.actionKind || 'log'}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-forge-accent" />
    </div>
  )
}
