import type { Transaction, Category } from '@/types/database'

interface ExportTransaction {
  date: string
  type: string
  category: string
  description: string
  amount: number
  currency: string
  convertedAmount: number | null
}

function buildExportRows(
  transactions: Transaction[],
  categories: Category[],
): ExportTransaction[] {
  return transactions.map(tx => {
    const cat = categories.find(c => c.id === tx.category_id)
    return {
      date: tx.transaction_date,
      type: cat?.type ?? 'expense',
      category: cat?.name ?? '—',
      description: tx.description ?? '',
      amount: tx.amount,
      currency: tx.currency,
      convertedAmount: tx.converted_amount,
    }
  })
}

export function exportToCSV(
  transactions: Transaction[],
  categories: Category[],
  periodLabel: string,
): void {
  const rows = buildExportRows(transactions, categories)
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Currency', 'Converted Amount']

  const csvContent = [
    headers.join(','),
    ...rows.map(r =>
      [
        r.date,
        r.type,
        `"${r.category.replace(/"/g, '""')}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.amount.toFixed(2),
        r.currency,
        r.convertedAmount?.toFixed(2) ?? '',
      ].join(',')
    ),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `balancetrack-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToPDF(
  transactions: Transaction[],
  categories: Category[],
  periodLabel: string,
  totals: { income: number; expenses: number; net: number },
  currency: string,
  locale: string,
): void {
  const rows = buildExportRows(transactions, categories)
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>BalanceTrack - ${periodLabel}</title>
<style>
  body { font-family: 'Inter', -apple-system, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .period { color: #666; margin-bottom: 24px; }
  .summary { display: flex; gap: 32px; margin-bottom: 32px; }
  .summary-item { padding: 16px; border-radius: 8px; background: #f5f5f5; min-width: 140px; }
  .summary-item .label { font-size: 12px; color: #666; text-transform: uppercase; }
  .summary-item .value { font-size: 20px; font-weight: 600; margin-top: 4px; }
  .income { color: #059669; }
  .expense { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
  tr:hover { background: #fafafa; }
  .amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  @media print { body { margin: 20px; } .no-print { display: none; } }
</style></head><body>
<h1>BalanceTrack</h1>
<p class="period">${periodLabel}</p>
<div class="summary">
  <div class="summary-item"><div class="label">Income</div><div class="value income">${fmt(totals.income)}</div></div>
  <div class="summary-item"><div class="label">Expenses</div><div class="value expense">${fmt(totals.expenses)}</div></div>
  <div class="summary-item"><div class="label">Net</div><div class="value" style="color:${totals.net >= 0 ? '#059669' : '#dc2626'}">${fmt(totals.net)}</div></div>
</div>
<table>
<thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th class="amount">Amount</th></tr></thead>
<tbody>
${rows.map(r => `<tr><td>${r.date}</td><td>${r.type}</td><td>${r.category}</td><td>${r.description}</td><td class="amount ${r.type === 'income' ? 'income' : 'expense'}">${fmt(r.convertedAmount ?? r.amount)}</td></tr>`).join('\n')}
</tbody></table>
<script>window.onload = () => { window.print(); }</script>
</body></html>`

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
