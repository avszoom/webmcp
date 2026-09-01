import { mkdir, readdir, rename, writeFile } from 'node:fs/promises'

const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response
    const fallback = new URL('/index.html', request.url)
    return env.ASSETS.fetch(new Request(fallback, request))
  },
}\n`

const dist = new URL('../dist/', import.meta.url)
const client = new URL('../dist/client/', import.meta.url)
await mkdir(client, { recursive: true })

for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (['.openai', 'client', 'server'].includes(entry.name)) continue
  await rename(new URL(`../dist/${entry.name}`, import.meta.url), new URL(`../dist/client/${entry.name}`, import.meta.url))
}

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true })
await writeFile(new URL('../dist/server/index.js', import.meta.url), worker)
