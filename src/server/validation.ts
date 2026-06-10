import type { CategoryKind, ImportMode } from '../shared/types'

export function validateCategoryName(value: unknown): { valid: true; name: string } | { valid: false; error: string } {
  if (typeof value !== 'string' || !value.trim()) {
    return { valid: false, error: 'Category name is required.' }
  }
  const trimmed = value.trim()
  if (trimmed.length > 120) {
    return { valid: false, error: 'Category name must be 120 characters or fewer.' }
  }
  return { valid: true, name: trimmed }
}

export function validateCategoryKind(value: unknown): { valid: true; kind: CategoryKind } | { valid: false; error: string } {
  if (value === 'expense' || value === 'income') {
    return { valid: true, kind: value }
  }
  return { valid: false, error: 'Category kind must be "expense" or "income".' }
}

export function validateImportMode(value: unknown): { valid: true; mode: ImportMode } | { valid: false; error: string } {
  if (value === 'statement') {
    return { valid: true, mode: value }
  }
  return { valid: false, error: 'Import mode must be "statement".' }
}

export function validatePatchCategory(body: Record<string, unknown>): {
  valid: true
  id: string
  payload: { name?: string; kind?: CategoryKind; sortOrder?: number; isActive?: boolean; mergeIntoCategoryId?: string }
} | { valid: false; error: string } {
  if (typeof body.id !== 'string' || !body.id) {
    return { valid: false, error: 'Category id is required.' }
  }

  const payload: Record<string, unknown> = {}

  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return { valid: false, error: 'Invalid category name.' }
    }
    payload.name = body.name.trim()
  }

  if ('kind' in body) {
    const kindResult = validateCategoryKind(body.kind)
    if (!kindResult.valid) return kindResult
    payload.kind = kindResult.kind
  }

  if ('sortOrder' in body) {
    if (typeof body.sortOrder !== 'number' || !Number.isFinite(body.sortOrder)) {
      return { valid: false, error: 'sort_order must be a number.' }
    }
    payload.sortOrder = body.sortOrder
  }

  if ('isActive' in body) {
    if (typeof body.isActive !== 'boolean') {
      return { valid: false, error: 'is_active must be a boolean.' }
    }
    payload.isActive = body.isActive
  }

  if ('mergeIntoCategoryId' in body) {
    if (typeof body.mergeIntoCategoryId === 'string' && body.mergeIntoCategoryId) {
      payload.mergeIntoCategoryId = body.mergeIntoCategoryId
    }
  }

  return {
    valid: true,
    id: body.id,
    payload: payload as { name?: string; kind?: CategoryKind; sortOrder?: number; isActive?: boolean; mergeIntoCategoryId?: string },
  }
}

export function validateCommitImport(body: unknown): {
  valid: true
  rows: Array<{ id: string; finalCategoryId: string | null; isExcluded: boolean }>
} | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' }
  }

  const obj = body as Record<string, unknown>
  if (!Array.isArray(obj.rows)) {
    return { valid: false, error: 'rows must be an array.' }
  }

  const rows: Array<{ id: string; finalCategoryId: string | null; isExcluded: boolean }> = []

  for (let i = 0; i < obj.rows.length; i++) {
    const row = obj.rows[i]
    if (!row || typeof row !== 'object') {
      return { valid: false, error: `rows[${i}] must be an object.` }
    }
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || !r.id) {
      return { valid: false, error: `rows[${i}].id is required.` }
    }
    rows.push({
      id: r.id,
      finalCategoryId: typeof r.finalCategoryId === 'string' ? r.finalCategoryId : null,
      isExcluded: Boolean(r.isExcluded),
    })
  }

  return { valid: true, rows }
}

export function validateBulkTransactionRequest(body: unknown): {
  valid: true
  ids: string[]
  categoryId?: string | null
  isConfirmed?: boolean
} | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' }
  }

  const obj = body as Record<string, unknown>
  if (!Array.isArray(obj.ids)) {
    return { valid: false, error: 'ids must be an array.' }
  }

  const ids: string[] = []
  for (let i = 0; i < obj.ids.length; i++) {
    if (typeof obj.ids[i] !== 'string' || !obj.ids[i]) {
      return { valid: false, error: `ids[${i}] must be a non-empty string.` }
    }
    ids.push(obj.ids[i])
  }

  if (ids.length === 0) {
    return { valid: false, error: 'ids must not be empty when performing a bulk operation.' }
  }

  const result: { ids: string[]; categoryId?: string | null; isConfirmed?: boolean } = { ids }

  if ('categoryId' in obj) {
    result.categoryId = typeof obj.categoryId === 'string' ? obj.categoryId : null
  }

  if ('isConfirmed' in obj) {
    if (typeof obj.isConfirmed !== 'boolean') {
      return { valid: false, error: 'is_confirmed must be a boolean.' }
    }
    result.isConfirmed = obj.isConfirmed
  }

  return { valid: true, ...result }
}
