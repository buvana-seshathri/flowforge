import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import TriggerNode from './nodes/TriggerNode'
import ConditionNode from './nodes/ConditionNode'
import ActionNode from './nodes/ActionNode'
import NodeInspector from './NodeInspector'

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
}

const PALETTE: { type: 'trigger' | 'condition' | 'action'; label: string }[] = [
  { type: 'trigger', label: 'Trigger' },
  { type: 'condition', label: 'Condition' },
  { type: 'action', label: 'Action' },
]

interface Props {
  initialNodes: Node[]
  initialEdges: Edge[]
  onChange: (nodes: Node[], edges: Edge[]) => void
}

let idCounter = 0
function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}_${Date.now()}_${idCounter}`
}

function FlowEditorInner({ initialNodes, initialEdges, onChange }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  const propagate = useCallback(
    (n: Node[], e: Edge[]) => {
      onChange(n, e)
    },
    [onChange]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const updated = addEdge({ ...connection, animated: true, style: { stroke: '#7c5cff' } }, eds)
        propagate(nodes, updated)
        return updated
      })
    },
    [nodes, propagate, setEdges]
  )

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
    },
    [onNodesChange]
  )

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
    },
    [onEdgesChange]
  )

  const persistNodes = useCallback(
    (updated: Node[]) => {
      setNodes(updated)
      propagate(updated, edges)
    },
    [edges, propagate, setNodes]
  )

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/flowforge-node', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/flowforge-node') as
        | 'trigger'
        | 'condition'
        | 'action'
      if (!type || !rfInstance || !wrapperRef.current) return

      const bounds = wrapperRef.current.getBoundingClientRect()
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      const newNode: Node = {
        id: nextId(type),
        type,
        position,
        data: {
          label: type === 'trigger' ? 'New Trigger' : type === 'condition' ? 'New Condition' : 'New Action',
          triggerKind: type === 'trigger' ? 'manual' : undefined,
          actionKind: type === 'action' ? 'log' : undefined,
        },
      }
      const updated = nodes.concat(newNode)
      persistNodes(updated)
    },
    [nodes, persistNodes, rfInstance]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const updateSelectedNodeData = (patch: Record<string, any>) => {
    if (!selectedNode) return
    const updated = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, ...patch } } : n
    )
    persistNodes(updated)
    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...patch } } : prev))
  }

  const deleteSelectedNode = () => {
    if (!selectedNode) return
    const updatedNodes = nodes.filter((n) => n.id !== selectedNode.id)
    const updatedEdges = edges.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
    setNodes(updatedNodes)
    setEdges(updatedEdges)
    propagate(updatedNodes, updatedEdges)
    setSelectedNode(null)
  }

  return (
    <div className="flex h-full w-full">
      <aside className="flex w-52 flex-col gap-2 border-r border-forge-border bg-forge-panel p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-forge-muted">
          Add node
        </div>
        {PALETTE.map((p) => (
          <div
            key={p.type}
            draggable
            onDragStart={(e) => onDragStart(e, p.type)}
            className="cursor-grab rounded-md border border-forge-border bg-forge-bg px-3 py-2 text-sm font-medium text-forge-text transition hover:border-forge-accent active:cursor-grabbing"
          >
            {p.label}
          </div>
        ))}
        <div className="mt-4 text-xs text-forge-muted">
          Drag a block onto the canvas, then connect blocks by dragging from the dot on the right edge to the dot on the left edge of another block.
        </div>
      </aside>

      <div className="relative flex-1" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#232837" gap={20} />
          <Controls className="!bottom-4 !left-4" />
          <MiniMap
            pannable
            zoomable
            className="!bottom-4 !right-4 !bg-forge-panel"
            maskColor="rgba(11,13,18,0.7)"
            nodeColor={() => '#7c5cff'}
          />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          onChange={updateSelectedNodeData}
          onDelete={deleteSelectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}

export default function FlowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
