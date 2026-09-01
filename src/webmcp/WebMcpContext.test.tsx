import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { ApplicationProvider } from '../state/ApplicationContext'
import { WebMcpProvider, useWebMcp } from './WebMcpContext'
import type { WebMcpToolDefinition } from './types'

function StatusProbe() {
  const webMcp = useWebMcp()
  return <div>{webMcp.status}:{webMcp.toolCount}</div>
}

function installExecutableModelContext() {
  const definitions: WebMcpToolDefinition[] = []
  const executeTool = vi.fn(async (registeredTool: { name: string }, inputArguments: string) => {
    const definition = definitions.find((tool) => tool.name === registeredTool.name)
    if (!definition) throw new Error(`Unknown tool: ${registeredTool.name}`)
    return JSON.stringify(await definition.execute(JSON.parse(inputArguments)))
  })
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: {
      registerTool: vi.fn(async (tool: WebMcpToolDefinition) => { definitions.push(tool) }),
      getTools: vi.fn(async () => definitions.map(({ name, title, description, inputSchema }) => ({
        name, title, description, inputSchema: JSON.stringify(inputSchema),
      }))),
      executeTool,
    },
  })
  return { definitions, executeTool }
}

afterEach(() => {
  cleanup()
  Object.defineProperty(document, 'modelContext', { configurable: true, value: undefined })
  window.localStorage.clear()
})

describe('WebMcpProvider', () => {
  it('registers all semantic tools and aborts their lifecycle on unmount', async () => {
    const signals: AbortSignal[] = []
    const registerTool = vi.fn(async (_tool, options: { signal: AbortSignal }) => signals.push(options.signal))
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool } })

    const view = render(<ApplicationProvider><WebMcpProvider><StatusProbe /></WebMcpProvider></ApplicationProvider>)

    await waitFor(() => expect(screen.getByText('registered:20')).toBeInTheDocument())
    expect(registerTool).toHaveBeenCalledTimes(20)
    expect(signals.every((signal) => !signal.aborted)).toBe(true)
    view.unmount()
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })

  it('reports unsupported while retaining the same semantic layer for text fallback', async () => {
    Object.defineProperty(document, 'modelContext', { configurable: true, value: undefined })
    render(<ApplicationProvider><WebMcpProvider><StatusProbe /></WebMcpProvider></ApplicationProvider>)
    await waitFor(() => expect(screen.getByText('unsupported:0')).toBeInTheDocument())
  })

  it('updates the visible form immediately when a registered tool writes shared state', async () => {
    const definitions: WebMcpToolDefinition[] = []
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: { registerTool: vi.fn(async (tool: WebMcpToolDefinition) => definitions.push(tool)) },
    })
    render(<ApplicationProvider><WebMcpProvider><App /></WebMcpProvider></ApplicationProvider>)

    await waitFor(() => expect(definitions).toHaveLength(20))
    const identityTool = definitions.find((tool) => tool.name === 'provide_identity_information')!
    await act(async () => {
      await identityTool.execute({
        source: 'approved_profile', given_names: 'Alex Jamie', family_name: 'Morgan',
        other_names: 'None', date_of_birth: '1993-06-18', place_of_birth: 'Pune, India',
        national_id: 'DEMO-4839-2011',
      })
    })

    await waitFor(() => expect(screen.getByRole('region', { name: 'Application status' })).toHaveTextContent('6Completed'))
    expect(screen.getByText('6 of 55 questions')).toBeInTheDocument()
  })

  it('uses conversation answers to select a route and fill fields through WebMCP', async () => {
    const { definitions, executeTool } = installExecutableModelContext()
    render(<ApplicationProvider><WebMcpProvider><App /></WebMcpProvider></ApplicationProvider>)

    await waitFor(() => expect(definitions).toHaveLength(20))
    const assistant = await screen.findByRole('dialog', { name: 'Application assistant' }, { timeout: 1500 })
    fireEvent.click(screen.getByRole('button', { name: 'Type instead' }))
    fireEvent.click(screen.getByRole('button', { name: /Tourism in New York/ }))

    await waitFor(() => expect(assistant).toHaveTextContent('Tourist visitor'), { timeout: 2500 })
    expect(screen.getByRole('region', { name: 'Application path' })).toHaveTextContent('Tourist visitor')
    expect(executeTool.mock.calls.map(([tool]) => tool.name)).toEqual(expect.arrayContaining([
      'select_application_flow', 'provide_travel_information', 'derive_application_insights',
    ]))

    fireEvent.click(screen.getByRole('button', { name: /paying for the trip myself/ }))
    await waitFor(() => expect(assistant).toHaveTextContent('Self-funded'), { timeout: 3000 })
    expect(screen.getByRole('region', { name: 'Application status' })).not.toHaveTextContent('0Completed')
    expect(executeTool.mock.calls.map(([tool]) => tool.name)).toEqual(expect.arrayContaining([
      'provide_identity_information', 'provide_passport_information', 'provide_contact_information', 'provide_address_history',
    ]))
  })

  it('translates the application chrome and visible travel questions', async () => {
    const { definitions } = installExecutableModelContext()
    render(<ApplicationProvider><WebMcpProvider><App /></WebMcpProvider></ApplicationProvider>)
    await waitFor(() => expect(definitions).toHaveLength(20))

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'es' } })
    expect(screen.getByText('Solicitud de visa de no inmigrante en línea', { selector: '.topbar-title' })).toBeInTheDocument()
    expect(screen.getByText('Propósito principal del viaje')).toBeInTheDocument()
  })
})
