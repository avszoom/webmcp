import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import type { ApplicationState } from '../types'
import {
  applicationReducer,
  createInitialState,
  getApplicationMetrics,
  STORAGE_KEY,
  type ApplicationAction,
} from './applicationState'

interface ApplicationContextValue {
  state: ApplicationState
  dispatch: Dispatch<ApplicationAction>
  metrics: ReturnType<typeof getApplicationMetrics>
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null)

function loadStoredState(): ApplicationState {
  if (typeof window === 'undefined') return createInitialState()

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return createInitialState()
    const parsed = JSON.parse(stored) as Partial<ApplicationState>
    return {
      ...createInitialState(),
      ...parsed,
      answers: parsed.answers ?? {},
      conflicts: parsed.conflicts ?? [],
      activity: parsed.activity ?? [],
      derivedInsights: parsed.derivedInsights ?? [],
      flow: parsed.flow ?? null,
      hasStarted: true,
      startMode: parsed.startMode ?? 'demo',
    }
  } catch {
    return createInitialState()
  }
}

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(applicationReducer, undefined, loadStoredState)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo(
    () => ({ state, dispatch, metrics: getApplicationMetrics(state) }),
    [state],
  )

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>
}

export function useApplication() {
  const context = useContext(ApplicationContext)
  if (!context) {
    throw new Error('useApplication must be used within ApplicationProvider')
  }
  return context
}
