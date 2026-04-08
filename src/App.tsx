import { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { apiFetch } from './client/api'
import { formatCurrency, formatMonthLabel } from './client/format'
import type {
  Category,
  DashboardResponse,
  HistoricalEntry,
  ImportDetailResponse,
  ImportRow,
  ImportsListResponse,
  PatchCategoryRequest,
  TransactionsResponse,
} from './shared/types'

const navItems = [
  { to: '/', label: 'Dashboard', hint: 'Month view' },
  { to: '/imports', label: 'Imports', hint: 'Review' },
  { to: '/categories', label: 'Categories', hint: 'Manage' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ot = (window as any).ot as { toast: (msg: string, title: string, opts?: { variant?: string }) => void } | undefined

function showToast(msg: string, variant?: 'success' | 'danger' | 'warning') {
  ot?.toast(msg, '', variant ? { variant } : undefined)
}

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase().replace(/s$/, '').replace(/[^a-z0-9]/g, '')
}

function findExactDuplicate(name: string, categories: Category[]): Category | null {
  const normalized = normalizeCategoryName(name)
  return categories.find((c) => normalizeCategoryName(c.name) === normalized) ?? null
}

function findSimilarCategory(name: string, categories: Category[]): Category | null {
  const normalized = normalizeCategoryName(name)
  if (!normalized) return null
  return (
    categories.find((c) => {
      const catNorm = normalizeCategoryName(c.name)
      return catNorm !== normalized && (catNorm.includes(normalized) || normalized.includes(catNorm))
    }) ?? null
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [imports, setImports] = useState<ImportDetailResponse['import'][]>([])
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const [selectedImport, setSelectedImport] = useState<ImportDetailResponse | null>(null)
  const [draftRows, setDraftRows] = useState<ImportRow[]>([])
  const [historyData, setHistoryData] = useState<TransactionsResponse | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingRows, setIsSavingRows] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryKind, setNewCategoryKind] = useState<'expense' | 'income'>('expense')

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    if (!selectedImportId) {
      setSelectedImport(null)
      setDraftRows([])
      return
    }
    void loadImportDetail(selectedImportId)
  }, [selectedImportId])

  useEffect(() => {
    const selected = dashboard?.currentMonth
    if (!selected) return

    let cancelled = false
    void (async () => {
      try {
        const detail = await apiFetch<TransactionsResponse>(`/api/transactions?month=${selected}`)
        if (!cancelled) {
          setHistoryData(detail)
        }
      } catch (caught) {
        if (!cancelled) {
          showToast(caught instanceof Error ? caught.message : 'Unable to load history.', 'danger')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dashboard?.currentMonth])

  useEffect(() => {
    if (location.pathname === '/imports' && !selectedImportId && imports.length) {
      setSelectedImportId(imports[0].id)
    }
  }, [imports, location.pathname, selectedImportId])

  async function refreshAll() {
    setIsRefreshing(true)

    try {
      const [dashboardResponse, categoriesResponse, importsResponse] = await Promise.all([
        apiFetch<DashboardResponse>('/api/dashboard'),
        apiFetch<{ categories: Category[] }>('/api/categories'),
        apiFetch<ImportsListResponse>('/api/imports'),
      ])

      setDashboard(dashboardResponse)
      setCategories(categoriesResponse.categories)
      setImports(importsResponse.imports)
      setSelectedImportId((current) => current ?? importsResponse.imports[0]?.id ?? null)
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to load app data.', 'danger')
    } finally {
      setIsRefreshing(false)
    }
  }

  async function loadImportDetail(importId: string) {
    try {
      const detail = await apiFetch<ImportDetailResponse>(`/api/imports/${importId}`)
      setSelectedImport(detail)
      setDraftRows(detail.rows)
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to load the import.', 'danger')
    }
  }

  async function handleUpload(formData: FormData) {
    setIsUploading(true)

    try {
      const detail = await apiFetch<ImportDetailResponse>('/api/imports', {
        method: 'POST',
        body: formData,
      })
      showToast(`Imported ${detail.import.filename}.`, 'success')
      await refreshAll()
      setSelectedImportId(detail.import.id)
      navigate('/imports')
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Import failed.', 'danger')
    } finally {
      setIsUploading(false)
    }
  }

  async function rerunCategorization() {
    if (!selectedImport) return

    try {
      const detail = await apiFetch<ImportDetailResponse>(
        `/api/imports/${selectedImport.import.id}/categorize`,
        { method: 'POST' },
      )
      setSelectedImport(detail)
      setDraftRows(detail.rows)
      showToast('AI categorization refreshed.', 'success')
      await refreshAll()
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to rerun categorization.', 'danger')
    }
  }

  async function commitDraftRows() {
    if (!selectedImport) return

    setIsSavingRows(true)
    try {
      const detail = await apiFetch<ImportDetailResponse>(
        `/api/imports/${selectedImport.import.id}/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: draftRows.map((row) => ({
              id: row.id,
              finalCategoryId: row.finalCategoryId,
              isExcluded: row.isExcluded,
            })),
          }),
        },
      )
      setSelectedImport(detail)
      setDraftRows(detail.rows)
      showToast('Approved rows committed to your ledger.', 'success')
      await refreshAll()
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to commit this import.', 'danger')
    } finally {
      setIsSavingRows(false)
    }
  }

  function updateDraftRow(
    rowId: string,
    patch: Partial<Pick<ImportRow, 'finalCategoryId' | 'isExcluded' | 'reviewStatus'>>,
  ) {
    setDraftRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )
  }

  async function submitCategory() {
    const name = newCategoryName.trim()
    if (!name) return

    const exact = findExactDuplicate(name, categories)
    if (exact) {
      showToast(`"${exact.name}" already exists in your ${exact.kind} categories.`, 'danger')
      return
    }

    try {
      const response = await apiFetch<{ categories: Category[] }>('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind: newCategoryKind }),
      })
      setCategories((current) =>
        [...current, ...response.categories].sort((a, b) => a.sortOrder - b.sortOrder),
      )
      setNewCategoryName('')
      showToast('Category created.', 'success')
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to create category.', 'danger')
    }
  }

  async function saveCategory(payload: PatchCategoryRequest) {
    try {
      const response = await apiFetch<{ categories: Category[] }>('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setCategories(response.categories)
      showToast('Category saved.', 'success')
      await refreshAll()
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to save category changes.', 'danger')
    }
  }

  const pendingImports = imports.filter(
    (item) => item.importMode === 'statement' && item.commitStatus === 'draft',
  )
  const latestTransactions = historyData?.transactions.slice(0, 5) ?? []
  const routeTitle = useMemo(() => {
    if (location.pathname.startsWith('/imports')) return 'Imports'
    if (location.pathname.startsWith('/categories')) return 'Categories'
    return 'Dashboard'
  }, [location.pathname])

  return (
    <div data-sidebar-layout>
      <aside data-sidebar>
        <div className="brand-block">
          <p className="brand-mark">PE</p>
          <div>
            <h1>Pure Expense</h1>
            <span>Private monthly ledger</span>
          </div>
        </div>

        <nav aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-month">
          <p className="overline">This month</p>
          <strong>{dashboard ? formatCurrency(dashboard.totalCents) : '$0.00'}</strong>
          <span>{dashboard ? formatMonthLabel(dashboard.currentMonth) : 'Waiting for data'}</span>
        </div>
      </aside>

      <main>
        <header className="workspace-header">
          <div>
            <p className="overline">Expense tracker</p>
            <h2>{routeTitle}</h2>
          </div>
          <div className="header-meta">
            <span>{dashboard ? formatMonthLabel(dashboard.currentMonth) : 'No month selected'}</span>
            <button type="button" onClick={() => void refreshAll()}>
              Refresh
            </button>
          </div>
        </header>

        {isRefreshing && !dashboard ? (
          <div className="app-loading" aria-busy="true" data-spinner>
            Loading your dashboard…
          </div>
        ) : null}

        {!isRefreshing && dashboard && (
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  dashboard={dashboard}
                  pendingImports={pendingImports}
                  latestTransactions={latestTransactions}
                  onUpload={handleUpload}
                  onOpenImport={(importId) => {
                    setSelectedImportId(importId)
                    navigate('/imports')
                  }}
                  isUploading={isUploading}
                />
              }
            />
            <Route
              path="/imports"
              element={
                <ImportsPage
                  imports={imports}
                  selectedImport={selectedImport}
                  draftRows={draftRows}
                  categories={categories}
                  onUpload={handleUpload}
                  onPickImport={setSelectedImportId}
                  onRerunCategorization={rerunCategorization}
                  onCommitRows={commitDraftRows}
                  onUpdateDraftRow={updateDraftRow}
                  isSavingRows={isSavingRows}
                  isUploading={isUploading}
                  selectedImportId={selectedImportId}
                />
              }
            />
            <Route
              path="/categories"
              element={
                <CategoriesPage
                  categories={categories}
                  newCategoryKind={newCategoryKind}
                  newCategoryName={newCategoryName}
                  onNewCategoryKind={setNewCategoryKind}
                  onNewCategoryName={setNewCategoryName}
                  onSubmitCategory={submitCategory}
                  onSaveCategory={saveCategory}
                />
              }
            />
          </Routes>
        )}
      </main>
    </div>
  )
}

function DashboardPage({
  dashboard,
  pendingImports,
  latestTransactions,
  onUpload,
  onOpenImport,
  isUploading,
}: {
  dashboard: DashboardResponse
  pendingImports: ImportDetailResponse['import'][]
  latestTransactions: TransactionsResponse['transactions']
  onUpload: (formData: FormData) => Promise<void>
  onOpenImport: (importId: string) => void
  isUploading: boolean
}) {
  const topCategory = dashboard.categoryBreakdown[0]
  const trendMax = Math.max(...dashboard.trend.slice(0, 6).map((value) => value.totalCents), 1)
  const categoryMax = Math.max(...dashboard.categoryBreakdown.map((value) => value.amountCents), 1)
  const leadImport = pendingImports[0] ?? null

  return (
    <div className="page-grid dashboard-page">
      <section className="hero-surface">
        <div className="hero-main">
          <div className="hero-copy">
            <p className="overline">Month summary</p>
            <h3>{formatMonthLabel(dashboard.currentMonth)} spending</h3>
            <p>
              See the month at a glance, then drop into whichever task needs attention: reviewing
              imports or checking category concentration.
            </p>
          </div>

          <div className="hero-total">
            <span>Tracked this month</span>
            <strong>{formatCurrency(dashboard.totalCents)}</strong>
          </div>
        </div>

        <div className="hero-metrics">
          <article>
            <span>Top category</span>
            <strong>{topCategory ? topCategory.categoryName : 'No data'}</strong>
            <small>{topCategory ? formatCurrency(topCategory.amountCents) : 'No spend tracked yet'}</small>
          </article>
          {pendingImports.length > 0 && (
            <article>
              <span>Pending review</span>
              <strong>{pendingImports.length}</strong>
              <small>{pendingImports.length === 1 ? 'import awaiting approval' : 'imports awaiting approval'}</small>
            </article>
          )}
        </div>

        <div className="hero-spotlight">
          <div className="spotlight-head">
            <p className="overline">Next action</p>
            <strong>{leadImport ? 'Review staged import' : 'Month is in a good state'}</strong>
          </div>
          <p>
            {leadImport
              ? `${leadImport.filename} is staged and waiting for category approval before it can land in your ledger.`
              : 'No staged imports waiting. Upload a statement or historical CSV when ready.'}
          </p>
          {leadImport ? (
            <button
              type="button"
              data-variant="primary"
              className="spotlight-link"
              onClick={() => onOpenImport(leadImport.id)}
            >
              Open review desk
            </button>
          ) : null}
        </div>
      </section>

      <section className="card insights-surface">
        <div className="section-heading">
          <div className="hero-copy">
            <p className="overline">Spend map</p>
            <h3>Where the month is concentrated</h3>
          </div>
          <span className="section-microcopy">Largest categories first.</span>
        </div>

        <div className="spend-map">
          {dashboard.categoryBreakdown.length ? (
            dashboard.categoryBreakdown.map((item, index) => (
              <article key={`${item.categoryId}-${item.categoryName}`} className="spend-row">
                <div className="spend-row-main">
                  <div className="spend-rank">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <strong>{item.categoryName}</strong>
                  </div>
                </div>
                <div className="spend-row-bar">
                  <span
                    className="spend-row-fill"
                    style={{ width: `${Math.max(12, (item.amountCents / categoryMax) * 100)}%` }}
                  />
                </div>
                <span>{formatCurrency(item.amountCents)}</span>
              </article>
            ))
          ) : (
            <p className="muted-copy">Import a month to start seeing category concentration.</p>
          )}
        </div>
      </section>

      <section className="card action-surface">
        <div className="section-heading">
          <div>
            <p className="overline">Import</p>
            <h3>Bring in a statement</h3>
          </div>
        </div>
        <ImportForm onSubmit={onUpload} isUploading={isUploading} compact />
      </section>

      <section className="card chart-surface">
        <div className="section-heading">
          <div>
            <p className="overline">Trend</p>
            <h3>Month run</h3>
          </div>
        </div>
        <div className="trend-bars">
          {dashboard.trend.slice(0, 6).reverse().map((item) => (
            <article key={item.month}>
              <span
                className="bar"
                style={{ height: `${Math.max(16, (item.totalCents / trendMax) * 100)}%` }}
              />
              <strong>{formatMonthLabel(item.month)}</strong>
              <small>{formatCurrency(item.totalCents)}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="card activity-surface">
        <div className="section-heading">
          <div>
            <p className="overline">Recent activity</p>
            <h3>Latest reviewed transactions</h3>
          </div>
        </div>
        <div className="activity-list">
          {latestTransactions.length ? (
            latestTransactions.map((transaction) => (
              <article key={transaction.id} className="activity-row">
                <div>
                  <strong>{transaction.merchantRaw}</strong>
                  <small>{transaction.categoryName || 'Uncategorized'}</small>
                </div>
                <span>{formatCurrency(transaction.amountCents, transaction.currency)}</span>
              </article>
            ))
          ) : (
            <p className="muted-copy">No committed transactions yet for this month.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function ImportsPage({
  imports,
  selectedImport,
  draftRows,
  categories,
  onUpload,
  onPickImport,
  onRerunCategorization,
  onCommitRows,
  onUpdateDraftRow,
  isSavingRows,
  isUploading,
  selectedImportId,
}: {
  imports: ImportDetailResponse['import'][]
  selectedImport: ImportDetailResponse | null
  draftRows: ImportRow[]
  categories: Category[]
  onUpload: (formData: FormData) => Promise<void>
  onPickImport: (importId: string) => void
  onRerunCategorization: () => Promise<void>
  onCommitRows: () => Promise<void>
  onUpdateDraftRow: (
    rowId: string,
    patch: Partial<Pick<ImportRow, 'finalCategoryId' | 'isExcluded' | 'reviewStatus'>>,
  ) => void
  isSavingRows: boolean
  isUploading: boolean
  selectedImportId: string | null
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [syncedImportId, setSyncedImportId] = useState<string | undefined>(undefined)

  // Reset selection when the active import changes (render-phase pattern)
  const currentImportId = selectedImport?.import.id
  if (currentImportId !== syncedImportId) {
    setSyncedImportId(currentImportId)
    setSelected(new Set())
    setBulkCategory('')
  }

  const groupedHistoricalEntries = groupHistoricalEntries(selectedImport?.historicalEntries ?? [])
  const approvedCount = draftRows.filter((row) => !row.isExcluded && row.finalCategoryId).length
  const excludedCount = draftRows.filter((row) => row.isExcluded).length
  const uncategorizedCount = draftRows.filter((row) => !row.isExcluded && !row.finalCategoryId).length

  const allSelected = draftRows.length > 0 && selected.size === draftRows.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(draftRows.map((r) => r.id)))
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyBulkCategory() {
    if (!bulkCategory) return
    for (const id of selected) {
      onUpdateDraftRow(id, { finalCategoryId: bulkCategory, isExcluded: false })
    }
    setSelected(new Set())
    setBulkCategory('')
  }

  function bulkConfirm() {
    for (const id of selected) {
      const row = draftRows.find((r) => r.id === id)
      if (row) onUpdateDraftRow(id, { isExcluded: false, reviewStatus: 'approved' })
    }
    setSelected(new Set())
  }

  function bulkExclude() {
    for (const id of selected) {
      onUpdateDraftRow(id, { isExcluded: true, reviewStatus: 'excluded' })
    }
    setSelected(new Set())
  }

  return (
    <div className="page-grid imports-page">
      <section className="imports-rail">
        <p className="overline" style={{ marginBottom: '14px' }}>Uploads</p>
        <ImportForm onSubmit={onUpload} isUploading={isUploading} />
        <div className="queue-list import-archive">
          {imports.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selectedImportId === item.id ? 'queue-item active' : 'queue-item'}
              onClick={() => onPickImport(item.id)}
            >
              <div className="queue-item-body">
                <strong title={item.filename}>{item.filename}</strong>
                <small>
                  {item.statementMonth ? formatMonthLabel(item.statementMonth) : item.importMode}{' '}
                  · {item.commitStatus}
                </small>
              </div>
              <span>{item.rowCount}</span>
            </button>
          ))}
          {!imports.length && (
            <p className="muted-copy" style={{ marginTop: '12px' }}>No imports yet.</p>
          )}
        </div>
      </section>

      <section className="import-detail-surface">
        {selectedImport ? (
          <>
            <div className="import-header">
              <div className="section-heading import-title">
                <div>
                  <p className="overline">Selected import</p>
                  <h3 className="import-filename-heading">{selectedImport.import.filename}</h3>
                </div>
                <span className="section-microcopy">
                  {selectedImport.import.statementMonth
                    ? formatMonthLabel(selectedImport.import.statementMonth)
                    : 'No month inferred'}
                </span>
              </div>
              <div className="import-status-row">
                <span className="badge">{selectedImport.import.importMode}</span>
                <span className="badge">{selectedImport.import.parsingStatus}</span>
                <span className="badge">{selectedImport.import.commitStatus}</span>
              </div>
            </div>

            <div className="import-meta-row">
              <article><span>Mode</span><strong>{selectedImport.import.importMode}</strong></article>
              <article><span>Status</span><strong>{selectedImport.import.parsingStatus}</strong></article>
              <article><span>Rows</span><strong>{selectedImport.import.rowCount}</strong></article>
            </div>

            {selectedImport.import.metadata.warnings.length > 0 && (
              <div role="alert" data-variant="warning" className="import-warning">
                {selectedImport.import.metadata.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}

            {selectedImport.import.importMode === 'statement' ? (
              <>
                <div className="review-toolbar">
                  <div className="review-metrics">
                    <article>
                      <span>Categorized</span>
                      <strong>{approvedCount}</strong>
                    </article>
                    <article>
                      <span>Uncategorized</span>
                      <strong>{uncategorizedCount}</strong>
                    </article>
                    <article>
                      <span>Excluded</span>
                      <strong>{excludedCount}</strong>
                    </article>
                    <article>
                      <span>Total rows</span>
                      <strong>{draftRows.length}</strong>
                    </article>
                  </div>
                  <div className="section-actions">
                    <button type="button" onClick={() => void onRerunCategorization()}>
                      Re-run AI
                    </button>
                    <button
                      type="button"
                      data-variant="primary"
                      onClick={() => void onCommitRows()}
                      disabled={isSavingRows}
                    >
                      {isSavingRows ? 'Committing…' : 'Commit approved rows'}
                    </button>
                  </div>
                </div>

                {/* Bulk action bar — only visible when rows are selected */}
                {selected.size > 0 && (
                  <div className="bulk-bar">
                    <span className="bulk-bar-count">{selected.size} selected</span>
                    <div className="bulk-bar-actions">
                      <select
                        value={bulkCategory}
                        onChange={(e) => setBulkCategory(e.target.value)}
                      >
                        <option value="">Set category…</option>
                        {categories
                          .filter((c) => c.isActive && c.kind === 'expense')
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                      {bulkCategory && (
                        <button type="button" data-variant="primary" onClick={applyBulkCategory}>
                          Apply
                        </button>
                      )}
                      <button type="button" onClick={bulkConfirm}>
                        Confirm selected
                      </button>
                      <button type="button" onClick={bulkExclude}>
                        Exclude selected
                      </button>
                      <button type="button" onClick={() => setSelected(new Set())}>
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="col-check">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected }}
                            onChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </th>
                        <th>Merchant</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Category</th>
                        <th>Confirmed</th>
                        <th>Exclude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRows.map((row) => {
                        const isConfirmed = !row.isExcluded && row.reviewStatus === 'approved'
                        return (
                          <tr
                            key={row.id}
                            className={[
                              row.isExcluded ? 'row-excluded' : '',
                              selected.has(row.id) ? 'row-selected' : '',
                            ].filter(Boolean).join(' ')}
                          >
                            <td className="col-check">
                              <input
                                type="checkbox"
                                checked={selected.has(row.id)}
                                onChange={() => toggleRow(row.id)}
                                aria-label={`Select ${row.merchantRaw || 'row'}`}
                              />
                            </td>
                            <td>
                              <strong>{row.merchantRaw || 'Unnamed merchant'}</strong>
                              <small>{row.aiReasoning || row.descriptionRaw || '—'}</small>
                            </td>
                            <td>{row.occurredAt || '—'}</td>
                            <td>{formatCurrency(row.amountCents, row.currency)}</td>
                            <td>
                              <select
                                value={row.finalCategoryId ?? ''}
                                onChange={(e) =>
                                  onUpdateDraftRow(row.id, {
                                    finalCategoryId: e.target.value || null,
                                    isExcluded: false,
                                  })
                                }
                              >
                                <option value="">Uncategorized</option>
                                {categories
                                  .filter((c) => c.isActive && c.kind === 'expense')
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                              </select>
                            </td>
                            <td className="col-switch">
                              <input
                                type="checkbox"
                                role="switch"
                                checked={isConfirmed}
                                disabled={row.isExcluded}
                                onChange={(e) =>
                                  onUpdateDraftRow(row.id, {
                                    reviewStatus: e.target.checked ? 'approved' : 'pending',
                                  })
                                }
                                title="Mark as confirmed"
                              />
                            </td>
                            <td className="col-switch">
                              <input
                                type="checkbox"
                                role="switch"
                                checked={row.isExcluded}
                                onChange={(e) =>
                                  onUpdateDraftRow(row.id, {
                                    isExcluded: e.target.checked,
                                    reviewStatus: e.target.checked ? 'excluded' : 'pending',
                                  })
                                }
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="historical-layout">
                <section className="mini-surface mini-surface-totals">
                  <div className="section-heading">
                    <div>
                      <p className="overline">Monthly totals</p>
                      <h3>Category snapshots</h3>
                    </div>
                  </div>
                  <div className="category-strips">
                    {selectedImport.snapshots.map((snapshot) => (
                      <article className="strip-row" key={snapshot.id}>
                        <div>
                          <strong>
                            {categories.find((c) => c.id === snapshot.categoryId)?.name || 'Unmapped'}
                          </strong>
                          <small>{snapshot.section}</small>
                        </div>
                        <span>{formatCurrency(snapshot.amountCents, snapshot.currency)}</span>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mini-surface mini-surface-entries">
                  <div className="section-heading">
                    <div>
                      <p className="overline">Stored entries</p>
                      <h3>Every imported amount</h3>
                    </div>
                  </div>
                  {Object.entries(groupedHistoricalEntries).length ? (
                    <div className="historical-groups historical-columns">
                      {Object.entries(groupedHistoricalEntries).map(([categoryName, entries]) => (
                        <article key={categoryName} className="historical-group">
                          <div className="group-header">
                            <strong>{categoryName}</strong>
                            <span>{entries.length} entries</span>
                          </div>
                          {entries.map((entry) => (
                            <div key={entry.id} className="historical-entry">
                              <div>
                                <strong>{entry.rowNote || entry.entryLabel}</strong>
                                <small>
                                  row {entry.sourceRowIndex + 1} · cell {entry.sourceColumnIndex + 1}
                                </small>
                              </div>
                              <span>{formatCurrency(entry.amountCents, entry.currency)}</span>
                            </div>
                          ))}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-panel">
                      <strong>No per-entry items stored for this import.</strong>
                      <p>
                        Historical monthly totals were imported, but this file did not contribute
                        additional line-level entries.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        ) : (
          <div className="empty-panel">
            <p>Select an import to review it.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function CategoriesPage({
  categories,
  newCategoryKind,
  newCategoryName,
  onNewCategoryKind,
  onNewCategoryName,
  onSubmitCategory,
  onSaveCategory,
}: {
  categories: Category[]
  newCategoryKind: 'expense' | 'income'
  newCategoryName: string
  onNewCategoryKind: (value: 'expense' | 'income') => void
  onNewCategoryName: (value: string) => void
  onSubmitCategory: () => Promise<void>
  onSaveCategory: (payload: PatchCategoryRequest) => Promise<void>
}) {
  const similarWarning = useMemo(() => {
    if (!newCategoryName.trim()) return null
    const similar = findSimilarCategory(newCategoryName, categories)
    if (!similar) return null
    return `Similar to "${similar.name}" — make sure this is a different category.`
  }, [newCategoryName, categories])

  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const incomeCategories = categories.filter((c) => c.kind === 'income')

  return (
    <div className="page-grid categories-page">
      <section className="cat-page-full">
        <div className="cat-page-header">
          <div>
            <p className="overline">Categories</p>
            <h3>Manage taxonomy</h3>
          </div>
          <div className="cat-add-form">
            <input
              value={newCategoryName}
              onChange={(event) => onNewCategoryName(event.target.value)}
              placeholder="New category name"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void onSubmitCategory()
              }}
            />
            <select
              value={newCategoryKind}
              onChange={(event) => onNewCategoryKind(event.target.value as 'expense' | 'income')}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <button type="button" data-variant="primary" onClick={() => void onSubmitCategory()}>
              Add
            </button>
          </div>
        </div>

        {similarWarning && (
          <div role="alert" data-variant="warning" className="cat-warning">
            <p>{similarWarning}</p>
          </div>
        )}

        <p className="overline cat-section-label">
          Expense <span>— {expenseCategories.length}</span>
        </p>
        <div className="cat-list">
          {expenseCategories.map((category) => (
            <CategoryRow
              key={`${category.id}-${category.name}-${category.isActive ? '1' : '0'}`}
              category={category}
              categories={categories}
              onSave={onSaveCategory}
            />
          ))}
        </div>

        <p className="overline cat-section-label">
          Income <span>— {incomeCategories.length}</span>
        </p>
        <div className="cat-list">
          {incomeCategories.map((category) => (
            <CategoryRow
              key={`${category.id}-${category.name}-${category.isActive ? '1' : '0'}`}
              category={category}
              categories={categories}
              onSave={onSaveCategory}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function CategoryRow({
  category,
  categories,
  onSave,
}: {
  category: Category
  categories: Category[]
  onSave: (payload: PatchCategoryRequest) => Promise<void>
}) {
  const [name, setName] = useState(category.name)
  const [isActive, setIsActive] = useState(category.isActive)
  const [mergeInto, setMergeInto] = useState('')
  const isDirty = name !== category.name || isActive !== category.isActive

  return (
    <div className={`cat-row${isActive ? '' : ' cat-row-inactive'}`}>
      <input
        className="cat-row-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && isDirty)
            void onSave({ id: category.id, name, isActive })
        }}
      />
      <label className="cat-row-toggle">
        <input
          type="checkbox"
          role="switch"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        <span>{isActive ? 'Active' : 'Inactive'}</span>
      </label>
      <div className="cat-row-actions">
        {isDirty && (
          <button
            type="button"
            data-variant="primary"
            onClick={() => void onSave({ id: category.id, name, isActive })}
          >
            Save
          </button>
        )}
        <select value={mergeInto} onChange={(event) => setMergeInto(event.target.value)}>
          <option value="">Merge into…</option>
          {categories
            .filter((candidate) => candidate.id !== category.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
        </select>
        {mergeInto && (
          <button
            type="button"
            onClick={() => void onSave({ id: category.id, mergeIntoCategoryId: mergeInto })}
          >
            Merge
          </button>
        )}
      </div>
    </div>
  )
}

function ImportForm({
  onSubmit,
  isUploading,
  compact = false,
}: {
  onSubmit: (formData: FormData) => Promise<void>
  isUploading: boolean
  compact?: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState('statement')

  return (
    <form
      className={compact ? 'upload-form compact' : 'upload-form'}
      onSubmit={async (event) => {
        event.preventDefault()
        if (!file) return

        const formData = new FormData()
        formData.set('file', file)
        formData.set('mode', mode)
        await onSubmit(formData)
        event.currentTarget.reset()
        setFile(null)
      }}
    >
      <label>
        <span>Import mode</span>
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="statement">Statement import</option>
          <option value="historical-summary">Historical summary CSV</option>
        </select>
      </label>
      <label>
        <span>Upload file</span>
        <input
          type="file"
          accept=".csv,.pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button type="submit" data-variant="primary" disabled={!file || isUploading}>
        {isUploading ? 'Uploading…' : compact ? 'Start import' : 'Create import batch'}
      </button>
    </form>
  )
}

function groupHistoricalEntries(
  entries: HistoricalEntry[],
  categories: Category[] = [],
): Record<string, HistoricalEntry[]> {
  return entries.reduce<Record<string, HistoricalEntry[]>>((groups, entry) => {
    const categoryName =
      categories.find((c) => c.id === entry.categoryId)?.name || entry.entryLabel || 'Unmapped'
    groups[categoryName] = [...(groups[categoryName] ?? []), entry]
    return groups
  }, {})
}

export default App
