import { useMemo, useState } from 'react'
import type { Scene } from '@/types/story'
import { GitBranch, CornerDownRight, Circle, Star } from 'lucide-react'

interface Props {
  scenes: Scene[]
  onRestore: (sceneId: string) => void
}

interface LayoutNode {
  scene: Scene
  lane: number   // horizontal column (like git branch lane)
  row: number    // vertical position
  children: string[]
}

/** Assign git-graph lanes via BFS parent-tracking */
function buildGitLayout(scenes: Scene[]): LayoutNode[] {
  if (scenes.length === 0) return []

  const byId: Record<string, Scene> = {}
  const children: Record<string, string[]> = {}
  for (const s of scenes) {
    byId[s.id] = s
    children[s.id] = []
  }
  for (const s of scenes) {
    if (s.parentSceneId && children[s.parentSceneId]) {
      children[s.parentSceneId].push(s.id)
    }
  }

  // BFS ordering
  const root = scenes.find(s => !s.parentSceneId)
  if (!root) return scenes.map((s, i) => ({ scene: s, lane: 0, row: i, children: children[s.id] ?? [] }))

  const ordered: Scene[] = []
  const queue = [root.id]
  const visited = new Set<string>()
  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    ordered.push(byId[id])
    for (const cid of (children[id] ?? [])) queue.push(cid)
  }

  // Lane assignment: main trunk = lane 0, each branch fork spawns next lane
  const laneOf: Record<string, number> = {}
  let nextLane = 1
  laneOf[root.id] = 0

  for (const scene of ordered) {
    const kids = children[scene.id] ?? []
    if (kids.length === 0) continue
    if (kids.length === 1) {
      // single child inherits lane
      laneOf[kids[0]] = laneOf[scene.id] ?? 0
    } else {
      // first child inherits lane, rest get new lanes
      laneOf[kids[0]] = laneOf[scene.id] ?? 0
      for (let i = 1; i < kids.length; i++) {
        laneOf[kids[i]] = nextLane++
      }
    }
  }

  return ordered.map((scene, row) => ({
    scene,
    lane: laneOf[scene.id] ?? 0,
    row,
    children: children[scene.id] ?? [],
  }))
}

const LANE_W = 36   // px per lane
const ROW_H = 52    // px per row
const DOT_R = 7     // dot radius
const LANE_COLORS = [
  '#F5A623', // gold  – main trunk
  '#60a5fa', // blue
  '#34d399', // green
  '#f472b6', // pink
  '#a78bfa', // purple
  '#fb923c', // orange
  '#94a3b8', // slate
]
const laneColor = (i: number) => LANE_COLORS[i % LANE_COLORS.length]

export function GitBranchMap({ scenes, onRestore }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: LayoutNode } | null>(null)

  const nodes = useMemo(() => buildGitLayout(scenes), [scenes])

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#F8F6F0]/30">
        <GitBranch className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No scenes yet — start playing to build branches.</p>
      </div>
    )
  }

  const maxLane = Math.max(...nodes.map(n => n.lane), 0)
  const svgWidth = (maxLane + 1) * LANE_W + 16
  const svgHeight = nodes.length * ROW_H + 24

  // Build SVG path segments
  const lines: React.ReactNode[] = []
  const idToNode: Record<string, LayoutNode> = {}
  for (const n of nodes) idToNode[n.scene.id] = n

  for (const node of nodes) {
    const x = node.lane * LANE_W + DOT_R + 8
    const y = node.row * ROW_H + 12

    for (const childId of node.children) {
      const child = idToNode[childId]
      if (!child) continue
      const cx = child.lane * LANE_W + DOT_R + 8
      const cy = child.row * ROW_H + 12
      const isBranch = child.lane !== node.lane
      const color = laneColor(child.lane)

      const d = isBranch
        // bezier curve for branch-out
        ? `M ${x} ${y} C ${x} ${y + ROW_H * 0.6} ${cx} ${cy - ROW_H * 0.6} ${cx} ${cy}`
        // straight vertical for same-lane
        : `M ${x} ${y} L ${cx} ${cy}`

      lines.push(
        <path
          key={`${node.scene.id}-${childId}`}
          d={d}
          stroke={color}
          strokeWidth={isBranch ? 1.5 : 2}
          strokeDasharray={isBranch ? '4 3' : undefined}
          fill="none"
          opacity={0.5}
        />
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#F8F6F0]/40 flex items-center gap-1.5">
        <CornerDownRight className="w-3.5 h-3.5" />
        Hover a node to inspect · click to restore from that scene
      </p>

      <div className="relative flex overflow-x-auto rounded-xl border border-[#3D3D7A] bg-[#0F0F2A]" style={{ minHeight: svgHeight + 24 }}>
        {/* SVG rail */}
        <svg
          width={svgWidth}
          height={svgHeight}
          className="absolute top-3 left-0 shrink-0"
          style={{ minWidth: svgWidth }}
        >
          {lines}
          {nodes.map(node => {
            const x = node.lane * LANE_W + DOT_R + 8
            const y = node.row * ROW_H + 12
            const color = laneColor(node.lane)
            const isHovered = hovered === node.scene.id
            const isCurrent = !node.children.length && !node.scene.isEnding // leaf (in-progress)

            return (
              <g key={node.scene.id}>
                {/* Outer glow on hover */}
                {isHovered && (
                  <circle cx={x} cy={y} r={DOT_R + 5} fill={color} opacity={0.15} />
                )}
                {/* Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={node.scene.isEnding ? DOT_R + 2 : isCurrent ? DOT_R + 1 : DOT_R}
                  fill={isHovered ? color : '#1A1A3E'}
                  stroke={color}
                  strokeWidth={node.scene.isEnding ? 2.5 : 2}
                  className="cursor-pointer transition-all"
                  onMouseEnter={e => {
                    setHovered(node.scene.id)
                    const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect()
                    setTooltip({ x: rect.left + x, y: rect.top + y, node })
                  }}
                  onMouseLeave={() => { setHovered(null); setTooltip(null) }}
                  onClick={() => onRestore(node.scene.id)}
                />
                {/* Star for endings */}
                {node.scene.isEnding && (
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={color} className="pointer-events-none select-none">★</text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Row labels */}
        <div className="relative flex flex-col" style={{ marginLeft: svgWidth, flex: 1 }}>
          {nodes.map(node => {
            const isHovered = hovered === node.scene.id
            return (
              <div
                key={node.scene.id}
                className={`flex items-center gap-2 px-3 transition-colors cursor-pointer ${
                  isHovered ? 'bg-[#2D2D5E]/50' : ''
                }`}
                style={{ height: ROW_H }}
                onMouseEnter={() => setHovered(node.scene.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onRestore(node.scene.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate transition-colors ${isHovered ? 'text-[#F5A623]' : 'text-[#F8F6F0]/70'}`}>
                    {node.scene.title}
                  </p>
                  {node.scene.choiceMade && (
                    <p className="text-[10px] text-[#F8F6F0]/35 truncate italic">"{node.scene.choiceMade}"</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {node.scene.isEnding && <Star className="w-3 h-3 text-[#F5A623]" />}
                  <span className="text-[10px] text-[#F8F6F0]/25">D{node.scene.depth}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="fixed z-[70] pointer-events-none bg-[#1A1A3E] border border-[#3D3D7A] rounded-xl p-3 shadow-xl max-w-xs"
          style={{ left: tooltip.x + 16, top: tooltip.y - 20 }}
        >
          <p className="font-bold text-[#F8F6F0] text-xs mb-1">{tooltip.node.scene.title}</p>
          {tooltip.node.scene.choiceMade && (
            <p className="text-[10px] text-[#F5A623]/70 italic mb-1">Choice: "{tooltip.node.scene.choiceMade}"</p>
          )}
          <p className="text-[10px] text-[#F8F6F0]/50 line-clamp-3 leading-relaxed mb-2">
            {tooltip.node.scene.content.slice(0, 120)}…
          </p>
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => { setTooltip(null); onRestore(tooltip.node.scene.id) }}
              className="text-[10px] px-2 py-1 bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30 rounded-md hover:bg-[#F5A623]/25 cursor-pointer transition-colors"
            >
              ↩ Restore here
            </button>
            <span className="text-[10px] text-[#F8F6F0]/30 flex items-center">Depth {tooltip.node.scene.depth}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-[#F8F6F0]/30 px-1">
        <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-[#F5A623] text-[#F5A623]" /> main trunk</span>
        <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-[#60a5fa] text-[#60a5fa]" /> branch</span>
        <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5 text-[#F5A623]" /> ending</span>
      </div>
    </div>
  )
}
