export const formatValue = (value: unknown, prefix = ''): string => {
  if (value === null || value === undefined || value === '') return 'N/A'
  if (typeof value === 'number') return `${prefix}${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  return `${prefix}${String(value)}`
}

export const formatPrice = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'N/A'
  return typeof value === 'number' ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `₹${String(value)}`
}
