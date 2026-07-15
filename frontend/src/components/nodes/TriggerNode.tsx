import { Handle, Position, NodeProps } from 'reactflow'
import { Zap } from './icons'

export default function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`min-w-[190px] rounded-lg border bg-forge-panel shadow-lg ${
        selected ? 'border-forge-accent2' : 'border-forge-border'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-forge-border px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-forge-accent2/20 text-forge-accent2">
          <Zap size={14} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-forge-accent2">
          Trigger
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium">{data.label || 'New Trigger'}</div>
        <div className="mt-0.5 text-xs text-forge-muted">{data.triggerKind || 'manual'}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-forge-accent2" />
    </div>
  )
}
