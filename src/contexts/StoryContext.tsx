import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { AppStep, ProjectSetup, Scene, Choice, StoryState } from '@/types/story'

interface StoryStore {
  step: AppStep
  projectId: string | null
  setup: ProjectSetup | null
  scenes: Scene[]
  currentScene: Scene | null
  currentChoices: Choice[]
  storyState: StoryState | null
  generating: boolean
  error: string | null
}

type Action =
  | { type: 'SET_STEP'; payload: AppStep }
  | { type: 'SET_PROJECT'; payload: { projectId: string; setup: ProjectSetup } }
  | { type: 'ADD_SCENE'; payload: { scene: Scene; choices: Choice[] } }
  | { type: 'LOAD_HISTORY'; payload: { scenes: Scene[]; currentChoices: Choice[] } }
  | { type: 'SET_CURRENT_SCENE'; payload: Scene }
  | { type: 'SET_STORY_STATE'; payload: StoryState }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' }

const initialState: StoryStore = {
  step: 'dashboard',
  projectId: null,
  setup: null,
  scenes: [],
  currentScene: null,
  currentChoices: [],
  storyState: null,
  generating: false,
  error: null,
}

function reducer(state: StoryStore, action: Action): StoryStore {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'SET_PROJECT':
      return { ...state, ...action.payload, scenes: [], currentScene: null, currentChoices: [] }
    case 'ADD_SCENE':
      return {
        ...state,
        scenes: [...state.scenes, action.payload.scene],
        currentScene: action.payload.scene,
        currentChoices: action.payload.choices,
      }
    case 'LOAD_HISTORY': {
      const last = action.payload.scenes[action.payload.scenes.length - 1] ?? null
      return {
        ...state,
        scenes: action.payload.scenes,
        currentScene: last,
        currentChoices: action.payload.currentChoices,
      }
    }
    case 'SET_CURRENT_SCENE':
      return { ...state, currentScene: action.payload }
    case 'SET_STORY_STATE':
      return { ...state, storyState: action.payload }
    case 'SET_GENERATING':
      return { ...state, generating: action.payload, error: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload, generating: false }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface StoryContextValue {
  state: StoryStore
  dispatch: Dispatch<Action>
}

const StoryContext = createContext<StoryContextValue | null>(null)

export function StoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <StoryContext.Provider value={{ state, dispatch }}>
      {children}
    </StoryContext.Provider>
  )
}

export function useStory() {
  const ctx = useContext(StoryContext)
  if (!ctx) throw new Error('useStory must be used inside StoryProvider')
  return ctx
}
