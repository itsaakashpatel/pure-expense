import type { Category } from '../../shared/types'
import { normalizeMerchant } from '../utils'

export interface CategorizationInput {
  rowId: string
  merchantRaw: string
  descriptionRaw: string
  amountCents: number
}

export interface CategorizationSuggestion {
  rowId: string
  categoryId: string | null
  confidence: number
  reasoning: string
  provider: 'openai' | 'heuristic'
  model: string
  rawJson: string
}

interface OpenAiEnv {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
}

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; slugHint: string }> = [
  { keywords: ['coffee', 'latte', 'cafe', 'starbucks', 'tim hortons', 'second cup'], slugHint: 'coffee' },
  { keywords: ['grocery', 'superstore', 'whole foods', 'freshco', 'loblaws', 'metro', 'no frills', 'sobeys', 't t ', 'farm boy', 'costco'], slugHint: 'groceries' },
  { keywords: ['uber', 'lyft', 'ferry', 'transit', 'bus ', 'sky train', 'taxi', 'parking', 'gas ', 'petro', 'esso', 'shell ', 'flight', 'airline', 'hotel'], slugHint: 'travelling' },
  { keywords: ['rent', 'landlord', 'e transfer'], slugHint: 'rent' },
  { keywords: ['hydro', 'internet', 'telus', 'rogers', 'bell ', 'shaw', 'bc hydro', 'fortis', 'enbridge', 'water', 'gas bill'], slugHint: 'utilities' },
  { keywords: ['mobile', 'wireless', 'cellular', 'koodo', 'fido', 'freedom'], slugHint: 'mobile' },
  { keywords: ['dinner', 'restaurant', 'eat', 'pizza', 'sushi', 'burger', 'mcdonalds', 'subway', 'kfc', 'doordash', 'skip', 'uber eats', 'grubhub', 'bar '], slugHint: 'dinners' },
  { keywords: ['ikea', 'bed bath', 'canadian tire', 'home depot', 'rona', 'hardware', 'home goods', 'the bay', 'winners'], slugHint: 'household-items' },
  { keywords: ['amazon', 'walmart', 'target', 'zara', 'h m', 'uniqlo', 'sport chek', 'bestbuy', 'apple store'], slugHint: 'shopping' },
  { keywords: ['netflix', 'spotify', 'apple', 'google', 'microsoft', 'adobe', 'subscription', 'prime', 'hulu', 'disney', 'youtube'], slugHint: 'subscriptions' },
  { keywords: ['gift', 'flowers', '1 800'], slugHint: 'gifts' },
  { keywords: ['salon', 'spa', 'pharmacy', 'shoppers', 'rexall', 'london drugs', 'barber', 'haircut', 'gym', 'fitness', 'yoga', 'doctor', 'dental', 'optom'], slugHint: 'personal' },
]

function heuristicSuggestion(
  row: CategorizationInput,
  categories: Category[],
): CategorizationSuggestion {
  const haystack = normalizeMerchant(`${row.merchantRaw} ${row.descriptionRaw}`)
  const scoreById = new Map<string, number>()

  const activeCategories = categories.filter((c) => c.kind === 'expense' && c.isActive)
  const slugToCategory = new Map<string, Category>()
  for (const cat of activeCategories) {
    slugToCategory.set(cat.slug, cat)
  }

  for (const group of CATEGORY_KEYWORDS) {
    const matched = group.keywords.some((kw) => haystack.includes(kw))
    if (!matched) continue

    const category = activeCategories.find(
      (c) => c.slug === group.slugHint || c.slug.includes(group.slugHint) || group.slugHint.includes(c.slug),
    )
    if (category) {
      scoreById.set(category.id, (scoreById.get(category.id) ?? 0) + 5)
    }
  }

  const fallback = categories.find((category) => category.slug === 'miscellaneous') ?? categories[0] ?? null
  const winner = activeCategories
    .filter((category) => (scoreById.get(category.id) ?? 0) > 0)
    .sort((left, right) => (scoreById.get(right.id) ?? 0) - (scoreById.get(left.id) ?? 0))[0]

  const categoryId = (winner?.id ?? fallback?.id) ?? null

  return {
    rowId: row.rowId,
    categoryId,
    confidence: winner ? 0.68 : 0.42,
    reasoning: winner
      ? `Keyword heuristic matched "${winner.name}".`
      : 'No strong merchant pattern matched, so the fallback category was used.',
    provider: 'heuristic',
    model: 'local-heuristic-v1',
    rawJson: JSON.stringify({ haystack, scores: Object.fromEntries(scoreById) }),
  }
}

function extractResponseText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string') {
    return payload.output_text
  }

  const output = Array.isArray(payload.output) ? payload.output : []
  const textParts: string[] = []

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : []

    for (const piece of content) {
      if (piece && typeof piece === 'object' && 'text' in piece) {
        const text = (piece as { text?: unknown }).text
        if (typeof text === 'string') {
          textParts.push(text)
        }
      }
    }
  }

  return textParts.join('\n')
}

export async function suggestCategoriesWithAI(
  env: OpenAiEnv,
  rows: CategorizationInput[],
  categories: Category[],
): Promise<CategorizationSuggestion[]> {
  if (!rows.length) {
    return []
  }

  const activeExpenseCategories = categories.filter(
    (category) => category.kind === 'expense' && category.isActive,
  )

  if (!env.OPENAI_API_KEY) {
    return rows.map((row) => heuristicSuggestion(row, activeExpenseCategories))
  }

  const model = env.OPENAI_MODEL || 'gpt-4.1-mini'
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rowId: { type: 'string' },
            categoryName: { type: 'string' },
            confidence: { type: 'number' },
            reasoning: { type: 'string' },
          },
          required: ['rowId', 'categoryName', 'confidence', 'reasoning'],
        },
      },
    },
    required: ['items'],
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You categorize personal credit card transactions into one of the provided categories. Choose the closest expense category and return conservative confidence values between 0 and 1.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                categories: activeExpenseCategories.map((category) => category.name),
                rows,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'categorization_batch',
          strict: true,
          schema,
        },
      },
    }),
  })

  if (!response.ok) {
    return rows.map((row) => heuristicSuggestion(row, activeExpenseCategories))
  }

  const payload = (await response.json()) as Record<string, unknown>
  const text = extractResponseText(payload)

  try {
    const parsed = JSON.parse(text) as {
      items: Array<{
        rowId: string
        categoryName: string
        confidence: number
        reasoning: string
      }>
    }

    return rows.map((row) => {
      const matched = parsed.items.find((item) => item.rowId === row.rowId)
      if (!matched) {
        return heuristicSuggestion(row, activeExpenseCategories)
      }

      const category = activeExpenseCategories.find(
        (item) => item.name.toLowerCase() === matched.categoryName.toLowerCase(),
      )

      return {
        rowId: row.rowId,
        categoryId: category?.id ?? heuristicSuggestion(row, activeExpenseCategories).categoryId,
        confidence: Math.max(0, Math.min(1, matched.confidence)),
        reasoning: matched.reasoning,
        provider: 'openai',
        model,
        rawJson: text,
      }
    })
  } catch {
    return rows.map((row) => heuristicSuggestion(row, activeExpenseCategories))
  }
}
