import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

function generatedLabel(date) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export async function exportTableExcel({
  organization = 'Dirección de Bomberos de Tijuana',
  title,
  subtitle = '',
  sheetName = 'Report',
  columns,
  rows,
  filename,
}) {
  if (!title || !Array.isArray(columns) || !Array.isArray(rows)) {
    throw new Error('Report title, columns, and rows are required.')
  }
  return writeExcelReport({ organization, title, subtitle, sheetName, columns, rows, filename })
}

async function writeExcelReport({ organization, title, subtitle, sheetName, columns, rows, filename }) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(String(sheetName).slice(0, 31))
  sheet.addRow([organization])
  sheet.addRow([title])
  if (subtitle) sheet.addRow([subtitle])
  sheet.addRow([`Generated: ${generatedLabel(new Date())}`])
  sheet.addRow([])
  sheet.addRow(columns)
  rows.forEach((row) => sheet.addRow(row))
  sheet.columns = columns.map((column, index) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[index] ?? '').length), String(column).length)
    return { width: Math.min(Math.max(longest + 2, 12), 42) }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'hr-report.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

export function exportTablePdf({
  organization = 'Dirección de Bomberos de Tijuana',
  title,
  subtitle = '',
  columns,
  rows,
  filename,
  summary,
}) {
  if (!title || !Array.isArray(columns) || !Array.isArray(rows)) {
    throw new Error('Report title, columns, and rows are required.')
  }
  const pdf = new jsPDF({ orientation: 'landscape' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  pdf.setFillColor(99, 39, 40)
  pdf.rect(0, 0, pageWidth, 18, 'F')
  pdf.setFontSize(11)
  pdf.setTextColor(255, 255, 255)
  pdf.text(organization, 14, 12)
  pdf.setTextColor(31, 41, 55)
  pdf.setFontSize(15)
  pdf.text(title, 14, 28)
  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated: ${generatedLabel(new Date())}`, pageWidth - 14, 12, { align: 'right' })
  if (subtitle) {
    pdf.setFontSize(9)
    pdf.text(subtitle, 14, 35)
  }
  autoTable(pdf, {
    head: [columns],
    body: rows,
    startY: subtitle ? 41 : 34,
    theme: 'striped',
    headStyles: { fillColor: [99, 39, 40] },
    styles: { fontSize: 8, overflow: 'linebreak' },
    margin: { left: 14, right: 14 },
  })
  if (summary && Object.keys(summary).length) {
    let y = pdf.lastAutoTable.finalY + 8
    if (y > pdf.internal.pageSize.getHeight() - 18) {
      pdf.addPage('landscape')
      y = 16
    }
    pdf.setFontSize(9)
    for (const [label, value] of Object.entries(summary)) {
      pdf.text(`${label}: ${String(value)}`, 14, y)
      y += 5
    }
  }
  pdf.save(filename || 'hr-report.pdf')
}
