import { Node } from 'reactflow'

interface Props {
  node: Node
  onChange: (patch: Record<string, any>) => void
  onDelete: () => void
  onClose: () => void
}

export default function NodeInspector({ node, onChange, onDelete, onClose }: Props) {
  const data = node.data || {}

  return (
    <aside className="flex w-72 flex-col gap-4 border-l border-forge-border bg-forge-panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-forge-muted">
          {node.type} settings
        </div>
        <button onClick={onClose} className="text-forge-muted hover:text-forge-text">
          ✕
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Label
        <input
          className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 text-sm outline-none focus:border-forge-accent"
          value={data.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </label>

      {node.type === 'trigger' && (
        <label className="flex flex-col gap-1 text-sm">
          Trigger kind
          <select
            className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 text-sm outline-none focus:border-forge-accent"
            value={data.triggerKind || 'manual'}
            onChange={(e) => onChange({ triggerKind: e.target.value })}
          >
            <option value="manual">Manual</option>
            <option value="webhook">Webhook</option>
            <option value="schedule">Schedule (cron)</option>
          </select>
        </label>
      )}

      {node.type === 'condition' && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Field (from trigger input)
            <input
              className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 font-mono text-sm outline-none focus:border-forge-accent"
              placeholder="e.g. status"
              value={data.field || ''}
              onChange={(e) => onChange({ field: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Operator
            <select
              className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 text-sm outline-none focus:border-forge-accent"
              value={data.operator || 'equals'}
              onChange={(e) => onChange({ operator: e.target.value })}
            >
              <option value="equals">equals</option>
              <option value="not_equals">not equals</option>
              <option value="contains">contains</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Value
            <input
              className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 font-mono text-sm outline-none focus:border-forge-accent"
              value={data.value || ''}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </label>
        </>
      )}

      {node.type === 'action' && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Action kind
            <select
              className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 text-sm outline-none focus:border-forge-accent"
              value={data.actionKind || 'log'}
              onChange={(e) => onChange({ actionKind: e.target.value })}
            >
              <option value="log">Log message</option>
              <option value="http_request">HTTP request</option>
              <option value="delay">Delay</option>
            </select>
          </label>

          {data.actionKind === 'http_request' && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Method
                <select
                  className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 text-sm outline-none focus:border-forge-accent"
                  value={data.method || 'GET'}
                  onChange={(e) => onChange({ method: e.target.value })}
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                URL
                <input
                  className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 font-mono text-sm outline-none focus:border-forge-accent"
                  placeholder="https://api.example.com/notify"
                  value={data.url || ''}
                  onChange={(e) => onChange({ url: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Body (JSON)
                <textarea
                  className="h-20 rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 font-mono text-xs outline-none focus:border-forge-accent"
                  value={data.body || ''}
                  onChange={(e) => onChange({ body: e.target.value })}
                />
              </label>
            </>
          )}

          {data.actionKind === 'log' && (
            <label className="flex flex-col gap-1 text-sm">
              Message
              <textarea
                className="h-20 rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 text-sm outline-none focus:border-forge-accent"
                value={data.message || ''}
                onChange={(e) => onChange({ message: e.target.value })}
              />
            </label>
          )}

          {data.actionKind === 'delay' && (
            <label className="flex flex-col gap-1 text-sm">
              Delay (ms)
              <input
                type="number"
                className="rounded-md border border-forge-border bg-forge-bg px-2 py-1.5 text-sm outline-none focus:border-forge-accent"
                value={data.delayMs || 500}
                onChange={(e) => onChange({ delayMs: Number(e.target.value) })}
              />
            </label>
          )}
        </>
      )}

      <button
        onClick={onDelete}
        className="mt-auto rounded-md border border-forge-danger/50 px-3 py-2 text-sm font-medium text-forge-danger transition hover:bg-forge-danger/10"
      >
        Delete node
      </button>
    </aside>
  )
}
