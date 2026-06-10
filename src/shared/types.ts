export type CategoryKind = 'expense' | 'income'
export type ImportMode = 'statement'
export type SourceType = 'statement_csv' | 'statement_pdf'
export type ParsingStatus =
  | 'parsed'
  | 'review_ready'
  | 'imported'
  | 'needs_attention'
  | 'awaiting_template'
export type CommitStatus = 'draft' | 'committed'
export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'edited'
  | 'excluded'
  | 'learned-rule'

export interface Category {
  id: string
  name: string
  slug: string
  kind: CategoryKind
  sortOrder: number
  isActive: boolean
}

export interface ImportSummary {
  id: string
  filename: string
  importMode: ImportMode
  sourceType: SourceType
  statementMonth: string | null
  currency: string
  parsingStatus: ParsingStatus
  commitStatus: CommitStatus
  rowCount: number
  createdAt: string
  updatedAt: string
  metadata: ImportMetadata
}

export interface ImportMetadata {
  parser: string
  notes: string[]
  warnings: string[]
}

export interface ImportRow {
  id: string
  importId: string
  occurredAt: string | null
  merchantRaw: string
  descriptionRaw: string
  amountCents: number
  currency: string
  sourceType: SourceType
  statementMonth: string | null
  suggestedCategoryId: string | null
  suggestionConfidence: number | null
  finalCategoryId: string | null
  reviewStatus: ReviewStatus
  isExcluded: boolean
  parserLabel: string
  rawLine: string
  aiReasoning: string
}

export interface ImportDetailResponse {
  import: ImportSummary
  rows: ImportRow[]
  categories: Category[]
}

export interface ImportsListResponse {
  imports: ImportSummary[]
}

export interface DashboardCategorySummary {
  categoryId: string | null
  categoryName: string
  amountCents: number
  source: 'transactions'
}

export interface DashboardMonthSummary {
  month: string
  totalCents: number
  source: 'transactions'
}

export interface CategoryTrendPoint {
  month: string
  amountCents: number
}

export interface CategoryTrend {
  categoryId: string
  categoryName: string
  monthlyAmounts: CategoryTrendPoint[]
}

export interface DashboardResponse {
  currentMonth: string
  totalCents: number
  source: 'transactions'
  categoryBreakdown: DashboardCategorySummary[]
  trend: DashboardMonthSummary[]
  categoryTrends: CategoryTrend[]
  recentImports: ImportSummary[]
}

export interface TransactionRecord {
  id: string
  occurredAt: string | null
  merchantRaw: string
  descriptionRaw: string
  amountCents: number
  currency: string
  statementMonth: string | null
  categoryId: string | null
  categoryName: string | null
  sourceType: SourceType
  isConfirmed: boolean
  createdAt: string
}

export interface UpdateTransactionRequest {
  id: string
  categoryId?: string | null
  isConfirmed?: boolean
}

export interface BulkDeleteTransactionsRequest {
  ids: string[]
}

export interface BulkUpdateTransactionsRequest {
  ids: string[]
  categoryId?: string | null
  isConfirmed?: boolean
}

export interface TransactionsResponse {
  selectedMonth: string
  months: DashboardMonthSummary[]
  transactions: TransactionRecord[]
  total?: number
  offset?: number
  limit?: number
}

export interface CommitImportRequest {
  rows: Array<{
    id: string
    finalCategoryId: string | null
    isExcluded: boolean
    reviewStatus?: ReviewStatus
  }>
}

export interface CreateCategoryRequest {
  name: string
  kind: CategoryKind
}

export interface PatchCategoryRequest {
  id: string
  name?: string
  kind?: CategoryKind
  sortOrder?: number
  isActive?: boolean
  mergeIntoCategoryId?: string
}
