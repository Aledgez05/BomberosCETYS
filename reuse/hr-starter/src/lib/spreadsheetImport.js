import ExcelJS from 'exceljs'
import Papa from 'papaparse'

export function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function parseSpreadsheet(buffer, {
  fileName = '',
  sheetName,
  requiredFields = [],
  validateRow,
} = {}) {
  let selectedSheet = sheetName ?? ''
  let sourceRows
  let sourceRowNumbers = []
  if (/\.csv$/i.test(fileName)) {
    const csvText = new TextDecoder().decode(buffer)
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' })
    if (parsed.errors.length) {
      throw new Error(parsed.errors.map((item) => `Row ${item.row + 1}: ${item.message}`).join('\n'))
    }
    selectedSheet = 'CSV'
    sourceRows = parsed.data
    sourceRowNumbers = sourceRows.map((_row, index) => index + 2)
  } else if (buffer instanceof ArrayBuffer && new Uint8Array(buffer).length) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0]
    if (!sheet) throw new Error('The selected workbook sheet was not found.')
    selectedSheet = sheet.name
    const headers = sheet.getRow(1).values.slice(1).map((value) => String(value ?? '').trim())
    sourceRows = []
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const values = row.values.slice(1)
      if (values.every((value) => value == null || String(value).trim() === '')) return
      sourceRows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
      sourceRowNumbers.push(rowNumber)
    })
  } else {
    throw new Error('The selected file could not be read.')
  }
  if (!sourceRows.length) throw new Error('The selected sheet has no data rows.')

  const columns = new Map()
  for (const header of Object.keys(sourceRows[0])) {
    columns.set(normalizeHeader(header), header)
  }
  const missingFields = requiredFields.filter((field) => !columns.has(normalizeHeader(field)))
  if (missingFields.length) {
    throw new Error(`Missing required column(s): ${missingFields.join(', ')}`)
  }

  const rows = sourceRows.map((source, index) => {
    const normalized = {}
    for (const [key, sourceHeader] of columns) normalized[key] = source[sourceHeader]
    return { sourceRowNumber: sourceRowNumbers[index] ?? index + 2, values: normalized }
  })
  const errors = []

  rows.forEach(({ sourceRowNumber, values }) => {
    for (const field of requiredFields) {
      const value = values[normalizeHeader(field)]
      if (value == null || String(value).trim() === '') {
        errors.push({ sourceRowNumber, field, message: 'Required value is missing.' })
      }
    }

    const rowErrors = validateRow?.(values) ?? []
    for (const error of Array.isArray(rowErrors) ? rowErrors : [rowErrors]) {
      if (!error) continue
      errors.push({
        sourceRowNumber,
        field: error.field ?? '',
        message: error.message ?? String(error),
      })
    }
  })

  return { sheetName: selectedSheet, rows, errors }
}

export function findDuplicateKeys(rows, keyFields) {
  if (!keyFields?.length) return []
  const seen = new Map()
  const duplicates = []

  for (const row of rows ?? []) {
    const keyValues = keyFields.map((field) => String(row.values?.[normalizeHeader(field)] ?? '').trim())
    if (keyValues.some((value) => !value)) continue
    const key = keyValues.join('\u001f').toLocaleLowerCase('es-MX')
    const first = seen.get(key)
    if (first != null) duplicates.push({ sourceRowNumber: row.sourceRowNumber, firstRowNumber: first, keyValues })
    else seen.set(key, row.sourceRowNumber)
  }

  return duplicates
}
