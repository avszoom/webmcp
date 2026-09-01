import {
  useCallback,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useApplication } from '../state/ApplicationContext'
import type { ApplicationState } from '../types'
import { approvedProfileDemoCalls } from './demoCalls'
import type { PrefillToolCall } from './demoCalls'
import { createVisaApplicationTools } from './tools'
import type { WebMcpSupportStatus } from './types'

interface WebMcpContextValue {
  status: WebMcpSupportStatus
  toolCount: number
  error: string | null
  prefillStatus: 'idle' | 'running' | 'complete' | 'error'
  prefillProgress: { completed: number; total: number; label: string }
  prefillError: string | null
  runPrefillPlan: (calls: PrefillToolCall[]) => Promise<void>
}

const WebMcpContext = createContext<WebMcpContextValue>({
  status: 'checking',
  toolCount: 0,
  error: null,
  prefillStatus: 'idle',
  prefillProgress: { completed: 0, total: approvedProfileDemoCalls.length + 1, label: 'Ready' },
  prefillError: null,
  runPrefillPlan: async () => {},
})

export function WebMcpProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApplication()
  const stateRef = useRef(state)
  stateRef.current = state
  const [status, setStatus] = useState<WebMcpSupportStatus>('checking')
  const [toolCount, setToolCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [prefillStatus, setPrefillStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle')
  const [prefillProgress, setPrefillProgress] = useState({
    completed: 0,
    total: approvedProfileDemoCalls.length + 1,
    label: 'Ready',
  })
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const tools = useMemo(() => createVisaApplicationTools({
    getState: () => stateRef.current,
    commitState: (nextState: ApplicationState) => {
      stateRef.current = nextState
      dispatch({ type: 'REPLACE_STATE_FROM_TOOL', state: nextState })
    },
  }), [dispatch])

  useEffect(() => {
    const modelContext = document.modelContext
    if (!modelContext) {
      setStatus('unsupported')
      return
    }

    const controller = new AbortController()
    let active = true
    const register = async () => {
      try {
        for (const tool of tools) {
          await modelContext.registerTool(tool, { signal: controller.signal })
        }
        if (active) {
          setToolCount(tools.length)
          setStatus('registered')
        }
      } catch (registrationError) {
        if (!active || controller.signal.aborted) return
        const message = registrationError instanceof Error
          ? registrationError.message
          : 'WebMCP tool registration failed.'
        setError(message)
        setStatus('error')
      }
    }

    void register()
    return () => {
      active = false
      controller.abort()
    }
  }, [tools])

  const runPrefillPlan = useCallback(async (calls: PrefillToolCall[]) => {
    const modelContext = document.modelContext
    const plannedCalls: PrefillToolCall[] = [
      ...calls,
      { toolName: 'derive_application_insights', label: 'Calculating transparent derived values', input: {} },
    ]
    setPrefillStatus('running')
    setPrefillError(null)
    setPrefillProgress({ completed: 0, total: plannedCalls.length, label: 'Discovering tools' })

    try {
      const registeredTools = modelContext && status === 'registered'
        ? await modelContext.getTools()
        : tools.map(({ name, title, description, inputSchema }) => ({
            name, title, description, inputSchema: JSON.stringify(inputSchema),
          }))
      for (let index = 0; index < plannedCalls.length; index += 1) {
        const call = plannedCalls[index]
        const tool = registeredTools.find((candidate) => candidate.name === call.toolName)
        if (!tool) throw new Error(`Required tool ${call.toolName} is not registered.`)

        setPrefillProgress({ completed: index, total: plannedCalls.length, label: call.label })
        const result = modelContext && status === 'registered'
          ? JSON.parse((await modelContext.executeTool(tool, JSON.stringify(call.input))) ?? '{}') as { isError?: boolean; structuredContent?: { errors?: string[] } }
          : await tools.find((candidate) => candidate.name === call.toolName)!.execute(call.input) as { isError?: boolean; structuredContent?: { errors?: string[] } }
        if (result.isError) {
          throw new Error(result.structuredContent?.errors?.join(' ') || `${call.toolName} rejected the demo data.`)
        }
        setPrefillProgress({ completed: index + 1, total: plannedCalls.length, label: call.label })
        if (import.meta.env.MODE !== 'test') {
          await new Promise((resolve) => window.setTimeout(resolve, 180))
        }
      }
      setPrefillProgress({ completed: plannedCalls.length, total: plannedCalls.length, label: 'Prefill plan applied' })
      setPrefillStatus('complete')
    } catch (runError) {
      setPrefillError(runError instanceof Error ? runError.message : 'The agent prefill could not finish.')
      setPrefillStatus('error')
    }
  }, [status, tools])

  const value = useMemo(
    () => ({
      status,
      toolCount,
      error,
      prefillStatus,
      prefillProgress,
      prefillError,
      runPrefillPlan,
    }),
    [status, toolCount, error, prefillStatus, prefillProgress, prefillError, runPrefillPlan],
  )
  return <WebMcpContext.Provider value={value}>{children}</WebMcpContext.Provider>
}

export function useWebMcp() {
  return useContext(WebMcpContext)
}
