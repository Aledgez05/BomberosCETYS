import { useState } from 'react'
import { findDuplicateKeys, parseSpreadsheet } from '../lib/spreadsheetImport'

export default function EmployeeImportPreview({
  requiredFields = [],
  duplicateKeyFields = [],
  validateRow,
  onImport,
}) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    setPreview(null)
    setError('')
    if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError('Choose an Excel or CSV file.')
      return
    }

    try {
      const result = await parseSpreadsheet(await file.arrayBuffer(), {
        fileName: file.name,
        requiredFields,
        validateRow,
      })
      const duplicates = findDuplicateKeys(result.rows, duplicateKeyFields)
      const errors = [
        ...result.errors,
        ...duplicates.map((item) => ({
          sourceRowNumber: item.sourceRowNumber,
          field: duplicateKeyFields.join(' + '),
          message: `Duplicates row ${item.firstRowNumber}.`,
        })),
      ]
      setPreview({ ...result, errors, fileName: file.name })
    } catch (cause) {
      setError(cause?.message ?? 'Could not read the selected workbook.')
    } finally {
      event.target.value = ''
    }
  }

  async function handleImport() {
    if (!preview || preview.errors.length || !onImport) return
    setBusy(true)
    setError('')
    try {
      await onImport(preview.rows.map((row) => row.values))
    } catch (cause) {
      setError(cause?.message ?? 'Import did not complete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="import-panel">
      <h2>Employee spreadsheet import</h2>
      <label>
        Select Excel or CSV
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
      </label>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <>
          <p>{preview.fileName} · sheet {preview.sheetName} · {preview.rows.length} rows</p>
          {preview.errors.length > 0 && (
            <div role="alert">
              <strong>{preview.errors.length} validation issue(s); import is disabled.</strong>
              <ul>
                {preview.errors.slice(0, 100).map((item, index) => (
                  <li key={`${item.sourceRowNumber}-${item.field}-${index}`}>
                    Row {item.sourceRowNumber}{item.field ? ` · ${item.field}` : ''}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="table-scroll">
            <table>
              <thead><tr>{Object.keys(preview.rows[0]?.values ?? {}).map((field) => <th key={field}>{field}</th>)}</tr></thead>
              <tbody>
                {preview.rows.slice(0, 8).map((row) => (
                  <tr key={row.sourceRowNumber}>
                    {Object.keys(row.values).map((field) => <td key={field}>{String(row.values[field] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={handleImport} disabled={busy || Boolean(preview.errors.length) || !onImport}>
            {busy ? 'Importing…' : 'Validate and continue'}
          </button>
        </>
      )}
    </section>
  )
}
