export type CategoryKind = 'expense' | 'income'
export type ImportMode = 'historical-summary' | 'statement'
export type SourceType = 'historical_summary_csv' | 'statement_csv' | 'statement_pdf'
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

export interface MonthlySnapshot {
  id: string
  importId: string
  month: string
  categoryId: string | null
  amountCents: number
  currency: string
  section: CategoryKind
  note: string
}

export interface HistoricalEntry {
  id: string
  importId: string
  snapshotId: string | null
  month: string
  categoryId: string | null
  amountCents: number
  currency: string
  section: CategoryKind
  displayOrder: number
  entryLabel: string
  rowNote: string
  sourceRowIndex: number
  sourceColumnIndex: number
}

export interface ImportDetailResponse {
  import: ImportSummary
  rows: ImportRow[]
  snapshots: MonthlySnapshot[]
  historicalEntries: HistoricalEntry[]
  categories: Category[]
}

export interface ImportsListResponse {
  imports: ImportSummary[]
}

export interface DashboardCategorySummary {
  categoryId: string | null
  categoryName: string
  amountCents: number
  source: 'transactions' | 'snapshots'
}

export interface DashboardMonthSummary {
  month: string
  totalCents: number
  source: 'transactions' | 'snapshots'
}

export interface DashboardResponse {
  currentMonth: string
  totalCents: number
  source: 'transactions' | 'snapshots'
  categoryBreakdown: DashboardCategorySummary[]
  trend: DashboardMonthSummary[]
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
  createdAt: string
}

export interface TransactionsResponse {
  selectedMonth: string
  months: DashboardMonthSummary[]
  transactions: TransactionRecord[]
  snapshots: MonthlySnapshot[]
  historicalEntries: HistoricalEntry[]
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
