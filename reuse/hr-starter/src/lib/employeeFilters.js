export function filterEmployees(employees, {
  query = '',
  searchableFields = ['employee_number', 'first_name', 'last_name'],
  exactFilters = {},
} = {}) {
  const normalizedQuery = String(query).trim().toLocaleLowerCase('es-MX')

  return (employees ?? []).filter((employee) => {
    for (const [field, allowedValues] of Object.entries(exactFilters)) {
      if (!allowedValues?.size) continue
      if (!allowedValues.has(employee[field])) return false
    }

    if (!normalizedQuery) return true
    return searchableFields
      .map((field) => employee[field])
      .filter((value) => value != null)
      .join(' ')
      .toLocaleLowerCase('es-MX')
      .includes(normalizedQuery)
  })
}

export function buildFacetOptions(records, field, selectedFilters = {}) {
  const counts = new Map()
  for (const record of records ?? []) {
    const value = record[field]
    if (value == null || value === '') continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: String(value), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'es-MX'))
}
