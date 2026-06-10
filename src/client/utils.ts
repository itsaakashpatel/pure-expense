import type { Category } from '../shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ot = (window as any).ot as { toast: (msg: string, title: string, opts?: { variant?: string }) => void } | undefined

export function showToast(msg: string, variant?: 'success' | 'danger' | 'warning') {
  ot?.toast(msg, '', variant ? { variant } : undefined)
}

export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase().replace(/s$/, '').replace(/[^a-z0-9]/g, '')
}

export function findExactDuplicate(name: string, categories: Category[]): Category | null {
  const normalized = normalizeCategoryName(name)
  return categories.find((c) => normalizeCategoryName(c.name) === normalized) ?? null
}

export function findSimilarCategory(name: string, categories: Category[]): Category | null {
  const normalized = normalizeCategoryName(name)
  if (!normalized) return null
  return (
    categories.find((c) => {
      const catNorm = normalizeCategoryName(c.name)
      return catNorm !== normalized && (catNorm.includes(normalized) || normalized.includes(catNorm))
    }) ?? null
  )
}
