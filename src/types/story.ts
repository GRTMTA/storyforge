// Domain types for StoryForge

export type RelationType = 'Ally' | 'Enemy' | 'Family' | 'Love' | 'Rival' | 'Mentor'

export interface CharacterRelation {
  targetId: string
  type: RelationType
  description?: string
}

export interface Character {
  id?: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  description: string
  traits: string[]
  biography?: string
  customFields?: Record<string, string>
  relations?: CharacterRelation[]
  portraitUrl?: string          // optional, defaults to initials placeholder
  charGuardrails?: string[]     // per-character behavior rules
  isActive?: boolean            // inactive characters are excluded from generation
}

export interface CharacterGuardrail {
  id: string
  characterId: string
  projectId: string
  rule: string
  createdAt: string
}

export interface ProjectSetup {
  title: string
  genre: string
  setting: string
  tone: string
  guardrails: string[]
  characters: Character[]
}

export interface ProjectStats {
  sceneCount: number
  characterCount: number
  branchCount: number   // scenes with >1 child
  endingCount: number
  turnCount: number
  lastPlayedAt: string | null
}

export interface Scene {
  id: string
  projectId: string
  parentSceneId: string | null
  title: string
  content: string
  choiceMade: string | null
  sceneOrder: number
  depth: number
  isEnding: boolean
  createdAt: string
}

export interface Choice {
  id: string
  sceneId: string
  label: string
  description: string
  consequenceHint: string
  leadsToSceneId: string | null
}

export interface StoryState {
  id: string
  projectId: string
  currentSceneId: string
  plotThreads: Record<string, string>
  cluesDiscovered: string[]
  characterStates: Record<string, Record<string, unknown>>
  turnCount: number
}

export interface SceneWithChoices extends Scene {
  choices: Choice[]
}

export type AppStep = 'dashboard' | 'setup' | 'play' | 'review'
export type PlayTab = 'play' | 'scenes' | 'branches'

export interface GenerateScenePayload {
  projectId: string
  setup: ProjectSetup
  parentSceneId?: string
  choiceLabel?: string
  storyState?: StoryState
}

export interface GenerateSceneResponse {
  scene: Scene
  choices: Choice[]
  stateUpdates: Partial<StoryState>
  guardrailViolations: string[]
}
