import { describe, expect, it } from 'vitest'
import type { Category } from '../../shared/types'
import { suggestCategoriesWithAI } from '../services/ai'

const categories: Category[] = [
  {
    id: 'cat_coffee',
    name: 'Coffee',
    slug: 'coffee',
    kind: 'expense',
    sortOrder: 10,
    isActive: true,
  },
  {
    id: 'cat_groceries',
    name: 'Groceries/Veggies',
    slug: 'groceries-veggies',
    kind: 'expense',
    sortOrder: 20,
    isActive: true,
  },
  {
    id: 'cat_misc',
    name: 'Miscellaneous',
    slug: 'miscellaneous',
    kind: 'expense',
    sortOrder: 30,
    isActive: true,
  },
]

describe('categorization fallback', () => {
  it('uses merchant keywords when no OpenAI key is configured', async () => {
    const [coffee, grocery] = await suggestCategoriesWithAI(
      {},
      [
        {
          rowId: 'row_1',
          merchantRaw: 'Blenz Coffee',
          descriptionRaw: '',
          amountCents: 640,
        },
        {
          rowId: 'row_2',
          merchantRaw: 'Whole Foods',
          descriptionRaw: '',
          amountCents: 4218,
        },
      ],
      categories,
    )

    expect(coffee.categoryId).toBe('cat_coffee')
    expect(grocery.categoryId).toBe('cat_groceries')
    expect(coffee.provider).toBe('heuristic')
  })
})
