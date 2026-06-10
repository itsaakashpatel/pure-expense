import { useState } from 'react'
import { formatCurrency, formatMonthLabel } from '../client/format'
import type {
  BulkDeleteTransactionsRequest,
  BulkUpdateTransactionsRequest,
  Category,
  DashboardResponse,
  ImportDetailResponse,
  TransactionsResponse,
  UpdateTransactionRequest,
} from '../shared/types'
import { ImportForm } from '../components/ImportForm'
import { DashboardCharts } from '../components/DashboardCharts'

interface DashboardPageProps {
  dashboard: DashboardResponse
  pendingImports: ImportDetailResponse['import'][]
  expensesData: TransactionsResponse | null
  categories: Category[]
  selectedMonth: string | null
  onMonthChange: (month: string) => void
  onUpload: (formData: FormData) => Promise<void>
  onOpenImport: (importId: string) => void
  isUploading: boolean
  onUpdateTransaction: (payload: UpdateTransactionRequest) => Promise<void>
  onDeleteTransaction: (id: string) => Promise<void>
  onBulkUpdate: (payload: BulkUpdateTransactionsRequest) => Promise<void>
  onBulkDelete: (payload: BulkDeleteTransactionsRequest) => Promise<void>
}

export function DashboardPage({
  dashboard,
  pendingImports,
  expensesData,
  categories,
  selectedMonth,
  onMonthChange,
  onUpload,
  onOpenImport,
  isUploading,
  onUpdateTransaction,
  onDeleteTransaction,
  onBulkUpdate,
  onBulkDelete,
}: DashboardPageProps) {
  const topCategory = dashboard.categoryBreakdown[0]
  const leadImport = pendingImports[0] ?? null

  // Expenses table state
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCategoryId, setEditCategoryId] = useState('')

  const transactions = expensesData?.transactions ?? []
  const months = expensesData?.months ?? []

  const filtered = transactions.filter((t) => {
    const matchSearch = !search ||
      t.merchantRaw.toLowerCase().includes(search.toLowerCase()) ||
      t.descriptionRaw.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !filterCategory || t.categoryId === filterCategory
    return matchSearch && matchCategory
  })

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((t) => t.id)))
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

  async function applyBulkCategory() {
    if (!bulkCategoryId || !selected.size) return
    await onBulkUpdate({ ids: [...selected], categoryId: bulkCategoryId })
    setSelected(new Set())
    setBulkCategoryId('')
  }

  async function bulkConfirm() {
    await onBulkUpdate({ ids: [...selected], isConfirmed: true })
    setSelected(new Set())
  }

  async function bulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} transaction${count > 1 ? 's' : ''}? This cannot be undone.`)) return
    await onBulkDelete({ ids: [...selected] })
    setSelected(new Set())
  }

  async function saveRowEdit(id: string) {
    await onUpdateTransaction({ id, categoryId: editCategoryId || null })
    setEditingId(null)
  }

  function exportCsv() {
    const rows = [
      ['Date', 'Description', 'Merchant', 'Category', 'Amount', 'Currency', 'Confirmed'],
      ...filtered.map((t) => [
        t.occurredAt ?? '',
        t.descriptionRaw,
        t.merchantRaw,
        t.categoryName ?? '',
        (t.amountCents / 100).toFixed(2),
        t.currency,
        t.isConfirmed ? 'Yes' : 'No',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${expensesData?.selectedMonth ?? 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
              : 'No staged imports waiting. Upload a statement CSV or PDF when ready.'}
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

      <section className="card action-surface">
        <div className="section-heading">
          <div>
            <p className="overline">Import</p>
            <h3>Bring in a statement</h3>
          </div>
        </div>
        <ImportForm onSubmit={onUpload} isUploading={isUploading} compact />
      </section>

      <DashboardCharts trend={dashboard.trend} categoryTrends={dashboard.categoryTrends} />

      <section className="expenses-surface">
        {/* Toolbar */}
        <div className="expenses-toolbar">
          <div className="expenses-filters">
            <input
              className="expenses-search"
              placeholder="Search merchant or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setSelected(new Set())
              }}
            >
              <option value="">All categories</option>
              {categories.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={selectedMonth ?? expensesData?.selectedMonth ?? ''}
              onChange={(e) => {
                onMonthChange(e.target.value)
                setSelected(new Set())
              }}
            >
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {formatMonthLabel(m.month)}
                </option>
              ))}
            </select>
          </div>
          <div className="expenses-toolbar-end">
            <span className="expenses-count">
              {filtered.length} / {transactions.length}
            </span>
            <button type="button" onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bulk-bar">
            <span className="bulk-bar-count">{selected.size} selected</span>
            <div className="bulk-bar-actions">
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
              >
                <option value="">Edit category…</option>
                {categories.filter((c) => c.isActive && c.kind === 'expense').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {bulkCategoryId && (
                <button type="button" data-variant="primary" onClick={() => void applyBulkCategory()}>
                  Apply
                </button>
              )}
              <button type="button" onClick={() => void bulkConfirm()}>
                Confirm
              </button>
              <button type="button" data-variant="danger" onClick={() => void bulkDelete()}>
                Delete
              </button>
              <button type="button" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
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
                <th className="exp-col-date">Date</th>
                <th>Description</th>
                <th className="exp-col-category">Category</th>
                <th className="exp-col-amount">Amount</th>
                <th className="exp-col-status">✓</th>
                <th className="exp-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-panel" style={{ minHeight: '160px' }}>
                      <p>{transactions.length ? 'No results match your filters.' : 'No transactions for this month.'}</p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((t) => {
                const isEditing = editingId === t.id
                return (
                  <tr
                    key={t.id}
                    className={selected.has(t.id) ? 'row-selected' : ''}
                  >
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleRow(t.id)}
                        aria-label={`Select ${t.merchantRaw}`}
                      />
                    </td>
                    <td className="exp-date-cell">
                      <span className="exp-date">{t.occurredAt ? t.occurredAt.slice(0, 10) : '—'}</span>
                    </td>
                    <td>
                      <strong>{t.merchantRaw || 'Unnamed'}</strong>
                      <small>{t.descriptionRaw || '—'}</small>
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          autoFocus
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          onBlur={() => void saveRowEdit(t.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void saveRowEdit(t.id); if (e.key === 'Escape') setEditingId(null) }}
                        >
                          <option value="">Uncategorized</option>
                          {categories.filter((c) => c.isActive && c.kind === 'expense').map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          type="button"
                          className="exp-category-btn"
                          onClick={() => { setEditingId(t.id); setEditCategoryId(t.categoryId ?? '') }}
                          title="Click to change category"
                        >
                          {t.categoryName ? (
                            <span className="badge">{t.categoryName}</span>
                          ) : (
                            <span className="exp-uncat">Uncategorized</span>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="exp-amount-cell">
                      {formatCurrency(t.amountCents, t.currency)}
                    </td>
                    <td className="col-switch exp-confirmed-cell">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={t.isConfirmed}
                        onChange={(e) => void onUpdateTransaction({ id: t.id, isConfirmed: e.target.checked })}
                        title={t.isConfirmed ? 'Confirmed' : 'Unconfirmed'}
                      />
                    </td>
                    <td className="exp-actions-cell">
                      <button
                        type="button"
                        className="exp-delete-btn"
                        title="Delete transaction"
                        onClick={() => {
                          if (confirm('Delete this transaction? This cannot be undone.')) {
                            void onDeleteTransaction(t.id)
                          }
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
