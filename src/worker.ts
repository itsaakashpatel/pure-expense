import type { D1Database } from '@cloudflare/workers-types'
import type { PatchCategoryRequest } from './shared/types'
import { assertAuthorized } from './server/access'
import { errorResponse, json } from './server/http'
import { getDashboard, getTransactions } from './server/services/dashboard'
import {
  categorizeImportRows,
  commitImport,
  createImportFromFile,
  getImportDetail,
  listImports,
} from './server/services/imports'
import { createCategory, listCategories, patchCategory } from './server/services/categories'

export interface Env {
  ASSETS: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  }
  DB: D1Database
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  ACCESS_EMAIL_ALLOWLIST?: string
  REQUIRE_CLOUDFLARE_ACCESS?: string
}

async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    try {
      assertAuthorized(request, env)

      if (request.method === 'GET' && url.pathname === '/api/categories') {
        return json({ categories: await listCategories(env.DB) })
      }

      if (request.method === 'POST' && url.pathname === '/api/categories') {
        const body = await parseJson<{ name: string; kind: 'expense' | 'income' }>(request)
        return json({ categories: [await createCategory(env.DB, body.name, body.kind)] })
      }

      if (request.method === 'PATCH' && url.pathname === '/api/categories') {
        const body = await parseJson<PatchCategoryRequest>(request)
        return json({ categories: await patchCategory(env.DB, body) })
      }

      if (request.method === 'GET' && url.pathname === '/api/imports') {
        return json({ imports: await listImports(env.DB) })
      }

      if (request.method === 'POST' && url.pathname === '/api/imports') {
        const form = await request.formData()
        const file = form.get('file')
        const mode = form.get('mode')
        if (!(file instanceof File)) {
          return errorResponse('Attach a CSV or PDF file before importing.')
        }

        const detail = await createImportFromFile(
          env.DB,
          env,
          file,
          typeof mode === 'string' ? mode : null,
        )
        return json(detail, { status: 201 })
      }

      const importMatch = url.pathname.match(/^\/api\/imports\/([^/]+)$/)
      if (request.method === 'GET' && importMatch) {
        return json(await getImportDetail(env.DB, importMatch[1]))
      }

      const categorizeMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/categorize$/)
      if (request.method === 'POST' && categorizeMatch) {
        return json(await categorizeImportRows(env.DB, env, categorizeMatch[1], true))
      }

      const commitMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/commit$/)
      if (request.method === 'POST' && commitMatch) {
        const body = await parseJson<{ rows: Array<{ id: string; finalCategoryId: string | null; isExcluded: boolean }> }>(
          request,
        )
        return json(await commitImport(env.DB, commitMatch[1], body))
      }

      if (request.method === 'GET' && url.pathname === '/api/dashboard') {
        return json(await getDashboard(env.DB, url.searchParams.get('month')))
      }

      if (request.method === 'GET' && url.pathname === '/api/transactions') {
        return json(await getTransactions(env.DB, url.searchParams.get('month')))
      }

      return errorResponse('Route not found.', 404)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error.'
      return errorResponse(message, message.toLowerCase().includes('not allowed') ? 403 : 400)
    }
  },
}
