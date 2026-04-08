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

function heuristicSuggestion(
  row: CategorizationInput,
  categories: Category[],
): CategorizationSuggestion {
  const haystack = normalizeMerchant(`${row.merchantRaw} ${row.descriptionRaw}`)
  const scoreBySlug = new Map<string, number>()

  const boost = (slug: string, amount: number) => {
    scoreBySlug.set(slug, (scoreBySlug.get(slug) ?? 0) + amount)
  }

  // Coffee
  if (haystack.includes('coffee') || haystack.includes('latte') || haystack.includes('cafe') ||
      haystack.includes('starbucks') || haystack.includes('tim hortons') || haystack.includes('second cup')) {
    boost('coffee', 5)
  }
  // Groceries
  if (haystack.includes('grocery') || haystack.includes('superstore') || haystack.includes('whole foods') ||
      haystack.includes('freshco') || haystack.includes('loblaws') || haystack.includes('metro') ||
      haystack.includes('no frills') || haystack.includes('sobeys') || haystack.includes('t t ') ||
      haystack.includes('farm boy') || haystack.includes('costco')) {
    boost('groceries', 5)
  }
  // Travelling
  if (haystack.includes('uber') || haystack.includes('lyft') || haystack.includes('ferry') ||
      haystack.includes('transit') || haystack.includes('bus ') || haystack.includes('sky train') ||
      haystack.includes('taxi') || haystack.includes('parking') || haystack.includes('gas ') ||
      haystack.includes('petro') || haystack.includes('esso') || haystack.includes('shell ') ||
      haystack.includes('flight') || haystack.includes('airline') || haystack.includes('hotel')) {
    boost('travelling', 5)
  }
  // Rent
  if (haystack.includes('rent') || haystack.includes('landlord') || haystack.includes('e transfer')) {
    boost('rent', 6)
  }
  // Utilities
  if (haystack.includes('hydro') || haystack.includes('internet') || haystack.includes('telus') ||
      haystack.includes('rogers') || haystack.includes('bell ') || haystack.includes('shaw') ||
      haystack.includes('bc hydro') || haystack.includes('fortis') || haystack.includes('enbridge') ||
      haystack.includes('water') || haystack.includes('gas bill')) {
    boost('utilities', 5)
  }
  // Mobile
  if (haystack.includes('mobile') || haystack.includes('wireless') || haystack.includes('cellular') ||
      haystack.includes('koodo') || haystack.includes('fido') || haystack.includes('freedom')) {
    boost('mobile', 5)
  }
  // Dinners / restaurants
  if (haystack.includes('dinner') || haystack.includes('restaurant') || haystack.includes('eat') ||
      haystack.includes('pizza') || haystack.includes('sushi') || haystack.includes('burger') ||
      haystack.includes('mcdonalds') || haystack.includes('subway') || haystack.includes('kfc') ||
      haystack.includes('doordash') || haystack.includes('skip') || haystack.includes('uber eats') ||
      haystack.includes('grubhub') || haystack.includes('bar ')) {
    boost('dinners', 5)
  }
  // Household items
  if (haystack.includes('ikea') || haystack.includes('bed bath') || haystack.includes('canadian tire') ||
      haystack.includes('home depot') || haystack.includes('rona') || haystack.includes('hardware') ||
      haystack.includes('home goods') || haystack.includes('the bay') || haystack.includes('winners')) {
    boost('household-items', 5)
  }
  // Shopping / clothing
  if (haystack.includes('amazon') || haystack.includes('walmart') || haystack.includes('target') ||
      haystack.includes('zara') || haystack.includes('h m') || haystack.includes('uniqlo') ||
      haystack.includes('sport chek') || haystack.includes('bestbuy') || haystack.includes('apple store')) {
    boost('shopping', 5)
  }
  // Subscriptions / streaming
  if (haystack.includes('netflix') || haystack.includes('spotify') || haystack.includes('apple') ||
      haystack.includes('google') || haystack.includes('microsoft') || haystack.includes('adobe') ||
      haystack.includes('subscription') || haystack.includes('prime') || haystack.includes('hulu') ||
      haystack.includes('disney') || haystack.includes('youtube')) {
    boost('subscriptions', 5)
  }
  // Gifts
  if (haystack.includes('gift') || haystack.includes('flowers') || haystack.includes('1 800')) {
    boost('gifts', 5)
  }
  // Personal care
  if (haystack.includes('salon') || haystack.includes('spa') || haystack.includes('pharmacy') ||
      haystack.includes('shoppers') || haystack.includes('rexall') || haystack.includes('london drugs') ||
      haystack.includes('barber') || haystack.includes('haircut') || haystack.includes('gym') ||
      haystack.includes('fitness') || haystack.includes('yoga') || haystack.includes('doctor') ||
      haystack.includes('dental') || haystack.includes('optom')) {
    boost('personal', 5)
  }
  // Fallback ambiguous
  if (haystack.includes('amazon') || haystack.includes('walmart')) {
    boost('miscellaneous', 2)
  }

  const fallback = categories.find((category) => category.slug === 'miscellaneous') ?? categories[0] ?? null
  const winner = categories
    .filter((category) => category.kind === 'expense' && category.isActive)
    .sort((left, right) => (scoreBySlug.get(right.slug) ?? 0) - (scoreBySlug.get(left.slug) ?? 0))[0]

  const categoryId =
    (winner && (scoreBySlug.get(winner.slug) ?? 0) > 0 ? winner.id : fallback?.id) ?? null

  return {
    rowId: row.rowId,
    categoryId,
    confidence: winner ? 0.68 : 0.42,
    reasoning: winner
      ? `Keyword heuristic matched "${winner.name}".`
      : 'No strong merchant pattern matched, so the fallback category was used.',
    provider: 'heuristic',
    model: 'local-heuristic-v1',
    rawJson: JSON.stringify({ haystack, scores: Object.fromEntries(scoreBySlug) }),
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
