import { useMemo, useCallback } from 'react'
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { Scene } from '@/types/story'
import { Badge } from '@/components/ui/Badge'

function SceneNode({ data }: NodeProps) {
  const scene = data.scene as Scene
  return (
    <div
      className={`w-52 rounded-xl border px-3 py-2.5 text-xs shadow-lg cursor-pointer transition-all ${
        scene.isEnding
          ? 'bg-[#F5A623]/15 border-[#F5A623]/60 text-[#F8F6F0]'
          : data.isCurrent
          ? 'bg-[#3D3D7A] border-[#F5A623] text-[#F8F6F0]'
          : 'bg-[#2D2D5E] border-[#3D3D7A] text-[#F8F6F0]/80'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#F5A623]" />
      <div className="font-bold text-[#F8F6F0] mb-1 truncate">{scene.title}</div>
      {scene.choiceMade && (
        <div className="text-[#F5A623]/70 italic mb-1 truncate">"{scene.choiceMade}"</div>
      )}
      <div className="text-[#F8F6F0]/50 line-clamp-2 leading-snug">
        {scene.content.slice(0, 80)}…
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        {scene.isEnding && <Badge variant="gold" className="text-[10px] px-1.5">End</Badge>}
        <Badge variant="default" className="text-[10px] px-1.5">D{scene.depth}</Badge>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#F5A623]" />
    </div>
  )
}

const nodeTypes = { scene: SceneNode }

const HORIZONTAL_GAP = 230
const VERTICAL_GAP = 160

function buildLayout(scenes: Scene[]): { nodes: Node[]; edges: Edge[] } {
  // BFS layout
  const idToScene: Record<string, Scene> = {}
  for (const s of scenes) idToScene[s.id] = s

  // Group by depth
  const byDepth: Record<number, Scene[]> = {}
  for (const s of scenes) {
    byDepth[s.depth] = byDepth[s.depth] ?? []
    byDepth[s.depth].push(s)
  }

  const posMap: Record<string, { x: number; y: number }> = {}

  for (const [depth, group] of Object.entries(byDepth).map(([d, g]) => [Number(d), g] as [number, Scene[]])) {
    const startX = -(((group.length - 1) * HORIZONTAL_GAP) / 2)
    group.forEach((scene, i) => {
      posMap[scene.id] = { x: startX + i * HORIZONTAL_GAP, y: depth * VERTICAL_GAP }
    })
  }

  const nodes: Node[] = scenes.map(scene => ({
    id: scene.id,
    type: 'scene',
    position: posMap[scene.id] ?? { x: 0, y: 0 },
    data: { scene },
  }))

  const edges: Edge[] = scenes
    .filter(s => s.parentSceneId)
    .map(s => ({
      id: `e-${s.parentSceneId}-${s.id}`,
      source: s.parentSceneId!,
      target: s.id,
      label: s.choiceMade ?? undefined,
      labelStyle: { fontSize: 10, fill: '#F5A623' },
      labelBgStyle: { fill: '#1A1A3E', opacity: 0.7 },
      style: { stroke: '#3D3D7A', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3D3D7A' },
    }))

  return { nodes, edges }
}

interface StoryMapProps {
  scenes: Scene[]
  currentSceneId?: string
}

export function StoryMap({ scenes, currentSceneId }: StoryMapProps) {
  const { nodes, edges } = useMemo(() => {
    const layout = buildLayout(scenes)
    // Mark current node
    const markedNodes = layout.nodes.map(n => ({
      ...n,
      data: { ...n.data, isCurrent: n.id === currentSceneId },
    }))
    return { nodes: markedNodes, edges: layout.edges }
  }, [scenes, currentSceneId])

  const onInit = useCallback((instance: { fitView: () => void }) => {
    instance.fitView()
  }, [])

  if (scenes.length === 0) return (
    <div className="flex items-center justify-center h-64 text-[#F8F6F0]/30 text-sm">
      No scenes yet
    </div>
  )

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-[#3D3D7A]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onInit={onInit}
        minZoom={0.2}
        maxZoom={1.5}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3D3D7A" gap={20} size={0.5} />
        <MiniMap
          style={{ background: '#2D2D5E', border: '1px solid #3D3D7A' }}
          nodeColor={n => (n.data.isCurrent ? '#F5A623' : '#3D3D7A')}
        />
        <Controls style={{ background: '#2D2D5E', border: '1px solid #3D3D7A', borderRadius: 8 }} />
      </ReactFlow>
    </div>
  )
}
