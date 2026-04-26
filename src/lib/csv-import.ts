export interface CSVRow {
  [key: string]: string
}

export interface CSVParseResult {
  headers: string[]
  rows: CSVRow[]
}

export function parseCSV(text: string): CSVParseResult {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseLine(lines[0])
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: CSVRow = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

function parseLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  result.push(current.trim())
  return result
}

export interface ColumnMapping {
  date: string
  amount: string
  description: string
  category?: string
}

export interface ImportPreview {
  date: string
  time: string | null
  amount: number
  description: string
  category: string
  isIncome: boolean
  mappedCategoryId?: string
  mappedCategoryName?: string
}

export function mapCSVToTransactions(
  rows: CSVRow[],
  mapping: ColumnMapping,
): ImportPreview[] {
  return rows
    .map(row => {
      const rawAmount = parseFloat(row[mapping.amount]?.replace(/[^0-9.\-]/g, '') ?? '')
      if (isNaN(rawAmount)) return null

      const dt = normalizeDatetime(row[mapping.date] ?? '')
      if (!dt) return null

      return {
        date: dt.date,
        time: dt.time,
        amount: Math.abs(rawAmount),
        description: row[mapping.description] ?? '',
        category: mapping.category ? (row[mapping.category] ?? '') : '',
        isIncome: rawAmount > 0,
      }
    })
    .filter((r): r is ImportPreview => r !== null)
}

function normalizeDatetime(raw: string): { date: string; time: string | null } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Extract time component HH:MM before processing date
  const timeMatch = trimmed.match(/(\d{2}:\d{2})(?::\d{2})?/)
  const time = timeMatch ? timeMatch[1] : null

  // Get the date part only (split on T or space)
  const datePart = trimmed.split(/[T ]/, 1)[0]

  // ISO format: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(datePart)) {
    return { date: datePart.substring(0, 10), time }
  }

  // US format: 01/15/2024 or 1/15/2024
  const usMatch = datePart.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (usMatch) {
    const [, m, d, y] = usMatch
    return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, time }
  }

  // EU format: 15/01/2024 (day > 12 disambiguates)
  const euMatch = datePart.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (euMatch) {
    const [, d, m, y] = euMatch
    if (parseInt(d) > 12) {
      return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, time }
    }
  }

  // Try native Date parsing as fallback
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().split('T')[0], time }
  }

  return null
}

export interface CategoryHint {
  id: string
  name: string
  name_key: string | null
  type: string
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  paycheck:       ['salary', 'paycheck', 'wage', 'employer'],
  freelance:      ['freelance', 'consulting', 'contractor'],
  other_income:   ['cashback', 'reward', 'refund', 'reimbursement', 'bonus'],
  groceries:      ['grocery', 'supermarket', 'shufersal', 'rami levy', 'mega', 'glatt', 'market'],
  dining:         ['restaurant', 'cafe', 'coffee', 'pizza', 'sushi', 'burger', 'wolt', 'uber eats', 'roladin', 'bakery', 'falafel', 'shawarma'],
  fuel:           ['gas station', 'fuel', 'petrol', 'delek', 'paz', 'sonol'],
  transportation: ['taxi', 'uber', 'lyft', 'pango', 'parking', 'train', 'bus', 'transit'],
  entertainment:  ['netflix', 'spotify', 'apple tv', 'disney', 'youtube', 'cinema', 'theater', 'streaming'],
  shopping:       ['amazon', 'aliexpress', 'ebay', 'ikea', 'home center'],
  clothing:       ['zara', 'h&m', 'golf', 'clothing', 'adidas', 'nike', 'fashion', 'apparel'],
  health:         ['pharmacy', 'super-pharm', 'doctor', 'clinic', 'hospital', 'dental', 'medical'],
  fitness:        ['gym', 'fitness', 'sport', 'yoga', 'pilates', 'crossfit'],
  utilities:      ['electricity', 'water', 'bezeq', 'hot mobile', 'cellcom', 'partner', 'internet', 'phone bill'],
}

export function guessCategoryId(
  rawCategory: string,
  description: string,
  isIncome: boolean,
  categories: CategoryHint[],
): { id: string; name: string } | null {
  const norm = (s: string) => s.trim().toLowerCase()
  const normRaw = norm(rawCategory)
  const normDesc = norm(description)

  // Filter to matching type
  const typed = isIncome
    ? categories.filter(c => c.type === 'income')
    : categories.filter(c => c.type === 'expense')

  if (typed.length === 0) return null

  // Step 1: exact match on name or name_key
  if (normRaw) {
    for (const cat of typed) {
      if (norm(cat.name) === normRaw || (cat.name_key && norm(cat.name_key) === normRaw)) {
        return { id: cat.id, name: cat.name }
      }
    }
  }

  // Step 2: substring match
  if (normRaw) {
    for (const cat of typed) {
      if (norm(cat.name).includes(normRaw) || normRaw.includes(norm(cat.name))) {
        return { id: cat.id, name: cat.name }
      }
    }
  }

  // Step 3: keyword scoring on combined category + description text
  const searchText = `${normRaw} ${normDesc}`
  let bestId = ''
  let bestName = ''
  let bestScore = 0

  for (const cat of typed) {
    const keywords = cat.name_key ? (CATEGORY_KEYWORDS[cat.name_key] ?? []) : []
    let score = 0
    for (const kw of keywords) {
      if (searchText.includes(kw)) score += kw.length
    }
    if (score > bestScore) {
      bestScore = score
      bestId = cat.id
      bestName = cat.name
    }
  }

  if (bestScore >= 4) return { id: bestId, name: bestName }

  return null
}
