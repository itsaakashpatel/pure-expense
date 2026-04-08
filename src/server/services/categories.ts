import type { D1Database } from '@cloudflare/workers-types'
import type { Category, PatchCategoryRequest } from '../../shared/types'
import { allRows, firstRow, mapCategory, runStatement } from '../db'
import { createId, ensureCategoryKind, slugify } from '../utils'

type CategoryRow = {
  id: string
  name: string
  slug: string
  kind: string
  sort_order: number
  is_active: number
}

export async function listCategories(db: D1Database): Promise<Category[]> {
  const rows = await allRows<CategoryRow>(
    db,
    `SELECT id, name, slug, kind, sort_order, is_active
     FROM categories
     ORDER BY sort_order ASC, name ASC`,
  )

  return rows.map(mapCategory)
}

export async function ensureCategory(
  db: D1Database,
  name: string,
  kind: 'expense' | 'income',
): Promise<Category> {
  const existing = await firstRow<CategoryRow>(
    db,
    `SELECT id, name, slug, kind, sort_order, is_active
     FROM categories
     WHERE name = ? COLLATE NOCASE`,
    name,
  )

  if (existing) {
    return mapCategory(existing)
  }

  const countRow = await firstRow<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM categories')
  const id = createId('cat')
  const slugBase = slugify(name)

  await runStatement(
    db,
    `INSERT INTO categories (id, name, slug, kind, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    name,
    slugBase || id,
    kind,
    (countRow?.total ?? 0) * 10 + 10,
  )

  return {
    id,
    name,
    slug: slugBase || id,
    kind,
    sortOrder: (countRow?.total ?? 0) * 10 + 10,
    isActive: true,
  }
}

export async function createCategory(
  db: D1Database,
  name: string,
  kind: 'expense' | 'income',
): Promise<Category> {
  return ensureCategory(db, name, kind)
}

async function mergeCategories(
  db: D1Database,
  sourceCategoryId: string,
  targetCategoryId: string,
): Promise<void> {
  await runStatement(
    db,
    'UPDATE transactions SET category_id = ? WHERE category_id = ?',
    targetCategoryId,
    sourceCategoryId,
  )
  await runStatement(
    db,
    'UPDATE monthly_snapshots SET category_id = ? WHERE category_id = ?',
    targetCategoryId,
    sourceCategoryId,
  )
  await runStatement(
    db,
    'UPDATE merchant_rules SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?',
    targetCategoryId,
    sourceCategoryId,
  )
  await runStatement(
    db,
    'UPDATE import_rows SET suggested_category_id = ? WHERE suggested_category_id = ?',
    targetCategoryId,
    sourceCategoryId,
  )
  await runStatement(
    db,
    'UPDATE import_rows SET final_category_id = ? WHERE final_category_id = ?',
    targetCategoryId,
    sourceCategoryId,
  )
  await runStatement(
    db,
    'UPDATE ai_suggestions SET category_id = ? WHERE category_id = ?',
    targetCategoryId,
    sourceCategoryId,
  )
  await runStatement(
    db,
    `UPDATE categories
     SET is_active = 0, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    sourceCategoryId,
  )
}

export async function patchCategory(
  db: D1Database,
  payload: PatchCategoryRequest,
): Promise<Category[]> {
  if (payload.mergeIntoCategoryId && payload.mergeIntoCategoryId !== payload.id) {
    await mergeCategories(db, payload.id, payload.mergeIntoCategoryId)
  }

  const existing = await firstRow<CategoryRow>(
    db,
    `SELECT id, name, slug, kind, sort_order, is_active
     FROM categories
     WHERE id = ?`,
    payload.id,
  )

  if (!existing) {
    throw new Error('Category not found.')
  }

  const nextName = payload.name?.trim() || existing.name
  const nextKind = ensureCategoryKind(payload.kind ?? existing.kind)
  const nextSortOrder = payload.sortOrder ?? existing.sort_order
  const nextActive =
    typeof payload.isActive === 'boolean' ? Number(payload.isActive) : existing.is_active

  await runStatement(
    db,
    `UPDATE categories
     SET name = ?, kind = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    nextName,
    nextKind,
    nextSortOrder,
    nextActive,
    payload.id,
  )

  return listCategories(db)
}
