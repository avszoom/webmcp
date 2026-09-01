export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
}

export interface WebMcpExecuteOptions {
  signal?: AbortSignal
}

export interface WebMcpToolDefinition {
  name: string
  title?: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: WebMcpToolAnnotations
  execute: (input?: unknown, options?: WebMcpExecuteOptions) => unknown | Promise<unknown>
}

export interface RegisteredWebMcpTool {
  name: string
  title?: string
  description: string
  inputSchema?: string
  origin?: string
}

export interface WebModelContext extends EventTarget {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>
  getTools(options?: { fromOrigins?: string[] }): Promise<RegisteredWebMcpTool[]>
  executeTool(
    tool: RegisteredWebMcpTool,
    inputArguments?: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>
}

declare global {
  interface Document {
    readonly modelContext?: WebModelContext
  }
}

export type WebMcpSupportStatus = 'checking' | 'registered' | 'unsupported' | 'error'
