import { useMemo, useState } from 'react'
import { formatCurrency, formatMonthLabel } from '../client/format'
import { findSimilarCategory } from '../client/utils'
import type {
  Category,
  ImportDetailResponse,
  ImportRow,
  PatchCategoryRequest,
} from '../shared/types'
import { ImportForm } from '../components/ImportForm'

interface ImportsPageProps {
  imports: ImportDetailResponse['import'][]
  selectedImport: ImportDetailResponse | null
  draftRows: ImportRow[]
  categories: Category[]
  onUpload: (formData: FormData) => Promise<void>
  onPickImport: (importId: string) => void
  onDeleteImport: (importId: string) => Promise<void>
  onRerunCategorization: () => Promise<void>
  onCommitRows: () => Promise<void>
  onUpdateDraftRow: (
    rowId: string,
    patch: Partial<Pick<ImportRow, 'finalCategoryId' | 'isExcluded' | 'reviewStatus'>>,
  ) => void
  isSavingRows: boolean
  isUploading: boolean
  selectedImportId: string | null
  newCategoryKind: 'expense' | 'income'
  newCategoryName: string
  onNewCategoryKind: (value: 'expense' | 'income') => void
  onNewCategoryName: (value: string) => void
  onSubmitCategory: () => Promise<void>
  onSaveCategory: (payload: PatchCategoryRequest) => Promise<void>
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

export function ImportsPage({
  imports,
  selectedImport,
  draftRows,
  categories,
  onUpload,
  onPickImport,
  onDeleteImport,
  onRerunCategorization,
  onCommitRows,
  onUpdateDraftRow,
  isSavingRows,
  isUploading,
  selectedImportId,
  newCategoryKind,
  newCategoryName,
  onNewCategoryKind,
  onNewCategoryName,
  onSubmitCategory,
  onSaveCategory,
}: ImportsPageProps) {
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

  const similarWarning = useMemo(() => {
    if (!newCategoryName.trim()) return null
    const similar = findSimilarCategory(newCategoryName, categories)
    if (!similar) return null
    return `Similar to "${similar.name}" — make sure this is a different category.`
  }, [newCategoryName, categories])

  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const incomeCategories = categories.filter((c) => c.kind === 'income')

  return (
    <div className="page-grid imports-page">
      <section className="imports-rail">
        <p className="overline" style={{ marginBottom: '14px' }}>Uploads</p>
        <ImportForm onSubmit={onUpload} isUploading={isUploading} />
        <div className="queue-list import-archive">
          {imports.map((item) => (
            <div key={item.id} className={`queue-item-wrap${selectedImportId === item.id ? ' active' : ''}`}>
              <button
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
              {(item.commitStatus === 'draft' || item.rowCount === 0) && (
                <button
                  type="button"
                  className="queue-item-delete"
                  title="Delete this import"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${item.filename}"? This cannot be undone.`)) {
                      void onDeleteImport(item.id)
                    }
                  }}
                >
                  ×
                </button>
              )}
            </div>
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
            ) : null}
          </>
        ) : (
          <div className="empty-panel">
            <p>Select an import to review it.</p>
          </div>
        )}
      </section>

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
