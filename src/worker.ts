import type { D1Database } from '@cloudflare/workers-types'
import type { UpdateTransactionRequest } from './shared/types'
import { assertAuthorized } from './server/access'
import { errorResponse, json } from './server/http'
import { getDashboard } from './server/services/dashboard'
import {
  categorizeImportRows,
  commitImport,
  createImportFromFile,
  deleteImport,
  getImportDetail,
  listImports,
} from './server/services/imports'
import { createCategory, listCategories, patchCategory } from './server/services/categories'
import {
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from './server/services/transactions'
import {
  validateBulkTransactionRequest,
  validatePatchCategory,
  validateCommitImport,
} from './server/validation'

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
        const name = (body.name ?? '').trim()
        if (!name) return errorResponse('Category name is required.', 400)
        const result = await createCategory(env.DB, name, body.kind)
        if (result.wasExisting) {
          return errorResponse(`A ${result.category.kind} category named "${result.category.name}" already exists.`, 409)
        }
        return json({ categories: [result.category] }, { status: 201 })
      }

      if (request.method === 'PATCH' && url.pathname === '/api/categories') {
        const body = await parseJson<Record<string, unknown>>(request)
        const patchResult = validatePatchCategory(body)
        if (!patchResult.valid) return errorResponse(patchResult.error, 400)
        return json({ categories: await patchCategory(env.DB, { id: patchResult.id, ...patchResult.payload }) })
      }

      if (request.method === 'GET' && url.pathname === '/api/imports') {
        return json({ imports: await listImports(env.DB) })
      }

      if (request.method === 'POST' && url.pathname === '/api/imports') {
        const form = await request.formData()
        const file = form.get('file')
        if (!(file instanceof File)) {
          return errorResponse('Attach a CSV or PDF file before importing.')
        }

        const detail = await createImportFromFile(
          env.DB,
          env,
          file,
        )
        return json(detail, { status: 201 })
      }

      const importMatch = url.pathname.match(/^\/api\/imports\/([^/]+)$/)
      if (request.method === 'GET' && importMatch) {
        return json(await getImportDetail(env.DB, importMatch[1]))
      }

      if (request.method === 'DELETE' && importMatch) {
        await deleteImport(env.DB, importMatch[1])
        return json({ ok: true })
      }

      const categorizeMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/categorize$/)
      if (request.method === 'POST' && categorizeMatch) {
        return json(await categorizeImportRows(env.DB, env, categorizeMatch[1], true))
      }

      const commitMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/commit$/)
      if (request.method === 'POST' && commitMatch) {
        const rawBody = await request.json()
        const commitResult = validateCommitImport(rawBody)
        if (!commitResult.valid) return errorResponse(commitResult.error, 400)
        return json(await commitImport(env.DB, commitMatch[1], { rows: commitResult.rows }))
      }

      if (request.method === 'GET' && url.pathname === '/api/dashboard') {
        return json(await getDashboard(env.DB, url.searchParams.get('month')))
      }

      if (request.method === 'GET' && url.pathname === '/api/transactions') {
        const offset = url.searchParams.get('offset')
        const limit = url.searchParams.get('limit')
        return json(await listTransactions(
          env.DB,
          url.searchParams.get('month'),
          offset ? Number(offset) : undefined,
          limit ? Number(limit) : undefined,
        ))
      }

      // Bulk routes must be checked before the :id pattern
      if (request.method === 'PATCH' && url.pathname === '/api/transactions/bulk') {
        const rawBody = await request.json()
        const bulkResult = validateBulkTransactionRequest(rawBody)
        if (!bulkResult.valid) return errorResponse(bulkResult.error, 400)
        await bulkUpdateTransactions(env.DB, {
          ids: bulkResult.ids,
          categoryId: bulkResult.categoryId,
          isConfirmed: bulkResult.isConfirmed,
        })
        return json({ ok: true })
      }

      if (request.method === 'DELETE' && url.pathname === '/api/transactions/bulk') {
        const rawBody = await request.json()
        const bulkResult = validateBulkTransactionRequest(rawBody)
        if (!bulkResult.valid) return errorResponse(bulkResult.error, 400)
        await bulkDeleteTransactions(env.DB, { ids: bulkResult.ids })
        return json({ ok: true })
      }

      const txnMatch = url.pathname.match(/^\/api\/transactions\/([^/]+)$/)
      if (request.method === 'PATCH' && txnMatch) {
        const body = await parseJson<UpdateTransactionRequest>(request)
        return json({ transaction: await updateTransaction(env.DB, { ...body, id: txnMatch[1] }) })
      }

      if (request.method === 'DELETE' && txnMatch) {
        await deleteTransaction(env.DB, txnMatch[1])
        return json({ ok: true })
      }

      return errorResponse('Route not found.', 404)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error.'
      if (message.toLowerCase().includes('not found')) return errorResponse(message, 404)
      if (message.toLowerCase().includes('not allowed')) return errorResponse(message, 403)
      if (message.toLowerCase().includes('unsupported')) return errorResponse(message, 400)
      return errorResponse('Internal server error.', 500)
    }
  },
}
