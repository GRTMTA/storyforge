// Domain types for StoryForge

export interface Character {
  id?: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting'
  description: string
  traits: string[]
  backstory: string
}

export interface ProjectSetup {
  title: string
  genre: string
  setting: string
  tone: string
  guardrails: string[]
  characters: Character[]
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
