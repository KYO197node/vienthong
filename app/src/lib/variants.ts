export function baseTitle(title: string): string {
  let t = title.trim()
  // Remove suffix like " (Mesh)", " (2 Mesh)", " - 6T", "_6T", " - 12T" etc for grouping
  // Keep core like "HOME 1", "TG249", "D159V"
  // Remove variant markers
  t = t.replace(/\s*\(.*Mesh.*\)/gi, '')
  t = t.replace(/\s*\(.*\)/, '')
  t = t.replace(/[-_]\s*\d+T\b/gi, '')
  t = t.replace(/\s+\d+T\b/gi, '')
  t = t.replace(/\s*—.*$/, '')
  t = t.replace(/\s*-\s*.*$/, '')
  // For HOME, keep "HOME 1", "HOME 2" etc
  const m = t.match(/^(HOME\s*\d+|HOMETV\s*\d+|HOME\s*CAM\s*\d+|TG\d+|D\d+V?|VB\d+|BÙM.*)/i)
  if (m) return m[1].trim().toUpperCase()
  return t.split(' ')[0].toUpperCase()
}

export function getVariantLabel(title: string, base: string): string {
  const t = title.trim()
  // Extract variant part
  if (t.toUpperCase().includes('MESH')) {
    if (t.includes('2 Mesh') || t.includes('2 mesh') || t.toUpperCase().includes('2 MESH')) return '2 Mesh'
    return 'Mesh'
  }
  const m = t.match(/[-_]\s*(\d+T)\b/i) || t.match(/\s+(\d+T)\b/i)
  if (m) return m[1].toUpperCase()
  // For HOME without mesh
  if (t.toUpperCase().startsWith(base) && t.toUpperCase() !== base) {
    // Return remaining
    return t.slice(base.length).trim() || 'Chuẩn'
  }
  return 'Chuẩn'
}

export type VariantGroup = {
  base: string
  products: any[]
  minPrice: number
  maxPrice: number
  hasVariants: boolean
}

export function groupByBase(products: any[]): VariantGroup[] {
  const map = new Map<string, any[]>()
  for (const p of products) {
    const base = baseTitle(p.title)
    if (!map.has(base)) map.set(base, [])
    map.get(base)!.push(p)
  }
  const groups: VariantGroup[] = []
  for (const [base, list] of map) {
    const sorted = [...list].sort((a,b)=>a.price-b.price)
    const prices = sorted.map(x=>x.price)
    groups.push({
      base,
      products: sorted,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      hasVariants: list.length > 1
    })
  }
  // Sort groups by minPrice or by base
  return groups.sort((a,b)=> a.base.localeCompare(b.base))
}
