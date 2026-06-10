import { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { apiFetch } from './client/api'
import { formatCurrency, formatMonthLabel } from './client/format'
import { showToast } from './client/utils'
import { DashboardPage } from './pages/Dashboard'
import { ImportsPage } from './pages/Imports'
import type {
  BulkDeleteTransactionsRequest,
  BulkUpdateTransactionsRequest,
  Category,
  DashboardResponse,
  ImportDetailResponse,
  ImportRow,
  ImportsListResponse,
  PatchCategoryRequest,
  TransactionRecord,
  TransactionsResponse,
  UpdateTransactionRequest,
} from './shared/types'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [imports, setImports] = useState<ImportDetailResponse['import'][]>([])
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const [selectedImport, setSelectedImport] = useState<ImportDetailResponse | null>(null)
  const [draftRows, setDraftRows] = useState<ImportRow[]>([])
  const [expensesData, setExpensesData] = useState<TransactionsResponse | null>(null)
  const [expensesMonth, setExpensesMonth] = useState<string | null>(null)
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
    let cancelled = false
    void (async () => {
      try {
        const query = expensesMonth ? `?month=${expensesMonth}` : ''
        const detail = await apiFetch<TransactionsResponse>(`/api/transactions${query}`)
        if (!cancelled) setExpensesData(detail)
      } catch (caught) {
        if (!cancelled) showToast(caught instanceof Error ? caught.message : 'Unable to load expenses.', 'danger')
      }
    })()
    return () => { cancelled = true }
  }, [expensesMonth])

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

  async function handleDeleteImport(importId: string) {
    try {
      await apiFetch<{ ok: boolean }>(`/api/imports/${importId}`, { method: 'DELETE' })
      showToast('Import deleted.', 'success')
      setImports((prev) => prev.filter((imp) => imp.id !== importId))
      if (selectedImportId === importId) {
        setSelectedImportId(null)
        setSelectedImport(null)
        setDraftRows([])
      }
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to delete import.', 'danger')
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

  async function handleUpdateTransaction(payload: UpdateTransactionRequest) {
    try {
      const response = await apiFetch<{ transaction: TransactionRecord }>(`/api/transactions/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setExpensesData((prev) =>
        prev
          ? {
              ...prev,
              transactions: prev.transactions.map((t) =>
                t.id === payload.id ? response.transaction : t,
              ),
            }
          : prev,
      )
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to update transaction.', 'danger')
    }
  }

  async function handleDeleteTransaction(id: string) {
    try {
      await apiFetch<{ ok: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' })
      setExpensesData((prev) =>
        prev ? { ...prev, transactions: prev.transactions.filter((t) => t.id !== id) } : prev,
      )
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to delete transaction.', 'danger')
    }
  }

  async function handleBulkUpdateTransactions(payload: BulkUpdateTransactionsRequest) {
    try {
      await apiFetch<{ ok: boolean }>('/api/transactions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const query = expensesMonth ? `?month=${expensesMonth}` : ''
      const detail = await apiFetch<TransactionsResponse>(`/api/transactions${query}`)
      setExpensesData(detail)
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to update transactions.', 'danger')
    }
  }

  async function handleBulkDeleteTransactions(payload: BulkDeleteTransactionsRequest) {
    try {
      await apiFetch<{ ok: boolean }>('/api/transactions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setExpensesData((prev) =>
        prev
          ? { ...prev, transactions: prev.transactions.filter((t) => !payload.ids.includes(t.id)) }
          : prev,
      )
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Unable to delete transactions.', 'danger')
    }
  }

  const pendingImports = imports.filter(
    (item) => item.commitStatus === 'draft',
  )
  const routeTitle = useMemo(() => {
    if (location.pathname.startsWith('/imports')) return 'Imports'
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
          {[
            { to: '/', label: 'Dashboard', hint: 'Charts & transactions' },
            { to: '/imports', label: 'Imports', hint: 'Review & categories' },
          ].map((item) => (
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
                  expensesData={expensesData}
                  categories={categories}
                  selectedMonth={expensesMonth}
                  onMonthChange={setExpensesMonth}
                  onUpload={handleUpload}
                  onOpenImport={(importId) => {
                    setSelectedImportId(importId)
                    navigate('/imports')
                  }}
                  isUploading={isUploading}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onBulkUpdate={handleBulkUpdateTransactions}
                  onBulkDelete={handleBulkDeleteTransactions}
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
                  onDeleteImport={handleDeleteImport}
                  onRerunCategorization={rerunCategorization}
                  onCommitRows={commitDraftRows}
                  onUpdateDraftRow={updateDraftRow}
                  isSavingRows={isSavingRows}
                  isUploading={isUploading}
                  selectedImportId={selectedImportId}
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

export default App
