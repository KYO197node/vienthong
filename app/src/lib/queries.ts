import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'

/**
 * Thoi gian cache du lieu (giay). Trang duoc render dong (force-dynamic) nhung
 * du lieu duoc cache o runtime, nen:
 *  - Khong con HTML prerender sai sinh luc `next build` (build dung SQLite,
 *    production dung Postgres -> danh muc khac nhau hoan toan).
 *  - Van giu toc do vi khong goi DB moi request.
 */
const CACHE_TTL = 300

export type CategoryLike = {
  id: number
  name: string
  slug: string
  description?: string | null
  order?: number | null
  parent?: { id: number } | number | null
}

/** Lay id cua parent bat ke depth (depth 0 -> number, depth >=1 -> object). */
export function parentIdOf(cat: CategoryLike): number | null {
  const p = cat.parent
  if (p == null) return null
  if (typeof p === 'number') return p
  if (typeof p === 'object' && typeof p.id === 'number') return p.id
  return null
}

export const getSettings = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'settings', depth: 1 })
  },
  ['settings'],
  { revalidate: CACHE_TTL, tags: ['settings'] },
)

export const getCategories = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'categories',
      limit: 100,
      sort: 'order',
      // depth 1 de field `parent` tra ve object co .id, dung cho menu phan cap.
      depth: 1,
    })
    return docs
  },
  ['categories'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

/** Danh muc goc (khong co parent), da sap theo `order`. */
export async function getRootCategories() {
  const cats = (await getCategories()) as unknown as CategoryLike[]
  return cats.filter((c) => parentIdOf(c) === null)
}

/**
 * So san pham cua tung danh muc (theo id). Chi dem san pham gan TRUC TIEP.
 * Dung de an cac danh muc rong khoi menu/dieu huong.
 */
export const getProductCountByCategory = unstable_cache(
  async (): Promise<Record<number, number>> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({ collection: 'products', limit: 1000, depth: 0 })
    const counts: Record<number, number> = {}
    for (const p of docs) {
      const cat = (p as { category?: { id?: number } | number | null }).category
      const id = cat == null ? null : typeof cat === 'number' ? cat : (cat.id ?? null)
      if (id != null) counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  },
  ['product-counts'],
  { revalidate: CACHE_TTL, tags: ['products', 'categories'] },
)

/**
 * Cay danh muc: moi goc kem danh sach con.
 * Dung cho menu header, footer va trang /shop.
 *
 * `onlyWithProducts` (mac dinh true): bo cac danh muc con khong co san pham va
 * cac danh muc goc rong hoan toan. Menu tro den trang trong la trai nghiem toi.
 */
export async function getCategoryTree(onlyWithProducts = true) {
  const [cats, counts] = await Promise.all([
    getCategories() as unknown as Promise<CategoryLike[]>,
    getProductCountByCategory(),
  ])

  const roots = cats.filter((c) => parentIdOf(c) === null)

  const tree = roots.map((root) => {
    const children = cats.filter((c) => parentIdOf(c) === root.id)
    const visibleChildren = onlyWithProducts ? children.filter((c) => (counts[c.id] ?? 0) > 0) : children
    const totalProducts =
      (counts[root.id] ?? 0) + children.reduce((sum, c) => sum + (counts[c.id] ?? 0), 0)
    return { ...root, children: visibleChildren, totalProducts }
  })

  return onlyWithProducts ? tree.filter((r) => r.totalProducts > 0) : tree
}

/**
 * Tra ve id cua chinh danh muc + toan bo danh muc con (1 cap).
 * Can thiet vi san pham chi gan vao danh muc la; nen neu chi query dung id cua
 * danh muc cha thi trang se trong.
 */
export async function getCategoryIdsWithChildren(catId: number): Promise<number[]> {
  const cats = (await getCategories()) as unknown as CategoryLike[]
  const childIds = cats.filter((c) => parentIdOf(c) === catId).map((c) => c.id)
  return [catId, ...childIds]
}

/**
 * Gom cac danh muc home-* ve 5 muc chuan Digishop cho gon.
 * internet-truyen-hinh hien co 10 con (5 chuan + 5 home-*), hien 10 pill rat roi.
 */
export const HOME_MERGE_MAP: Record<string, string> = {
  'home-internet': 'internet-wifi-mesh',
  'home-mesh': 'internet-wifi-mesh',
  'home-tv': 'internet-truyen-hinh-combo',
  'home-sanh': 'internet-di-dong',
  'home-cam': 'internet-camera',
}

/** Thu tu chuan Digishop cho trang internet-truyen-hinh. */
export const DIGISHOP_ORDER: Record<string, number> = {
  'internet-wifi-mesh': 1,
  'internet-truyen-hinh-combo': 2,
  'internet-di-dong': 3,
  'internet-camera': 4,
  'truyen-hinh-mytv': 5,
}

export type CategorySection = CategoryLike & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[]
  ids: number[]
}

/**
 * Section kieu Digishop cho trang cha: moi danh muc con + 4 san pham.
 * Rieng internet-truyen-hinh chi tra 5 muc chuan, san pham home-* duoc gop vao.
 */
export async function getCategorySections(parentSlug: string, perSection = 4): Promise<{ parent: CategoryLike | null; sections: CategorySection[] }> {
  const payload = await getPayloadClient()
  const cats = (await getCategories()) as unknown as CategoryLike[]
  const parent = cats.find((c) => c.slug === parentSlug) ?? null
  if (!parent) return { parent: null, sections: [] }

  let children = cats.filter((c) => parentIdOf(c) === (parent as CategoryLike).id)

  // Gop home-* ve 5 muc chuan khi o trang internet-truyen-hinh
  if (parentSlug === 'internet-truyen-hinh') {
    children = children.filter((c) => !(c.slug in HOME_MERGE_MAP))
    children.sort(
      (a, b) => (DIGISHOP_ORDER[a.slug] ?? 99) - (DIGISHOP_ORDER[b.slug] ?? 99),
    )
  }

  const sections: CategorySection[] = await Promise.all(
    children.map(async (child) => {
      let ids = [child.id]
      if (parentSlug === 'internet-truyen-hinh') {
        const merged = cats.filter((c) => HOME_MERGE_MAP[c.slug] === child.slug).map((c) => c.id)
        ids = [child.id, ...merged]
      }
      const { docs } = await payload.find({
        collection: 'products',
        where: { category: { in: ids } },
        limit: perSection,
        sort: ['-featured', 'order'],
        depth: 1,
      })
      return { ...child, products: docs, ids }
    }),
  )

  return { parent, sections: sections.filter((s) => s.products.length > 0) }
}

/** Chon variant card kieu Digishop theo danh muc cha, khong doan bang includes. */
export function variantForCategory(parentSlug: string | null | undefined): 'box-internet' | 'pack-item' {
  return parentSlug === 'internet-truyen-hinh' ? 'box-internet' : 'pack-item'
}

/**
 * San pham theo slug danh muc, gom ca san pham cua cac danh muc con.
 */
export async function getProductsByCategory(slug: string, limit = 4) {
  const payload = await getPayloadClient()
  const cats = await payload.find({ collection: 'categories', where: { slug: { equals: slug } }, limit: 1 })
  const cat = cats.docs[0]
  if (!cat) return { category: null, products: [] }

  const ids = await getCategoryIdsWithChildren(cat.id as number)
  const { docs } = await payload.find({
    collection: 'products',
    where: { category: { in: ids } },
    limit,
    // Goi noi bat (featured) dung dau, sau do theo thu tu khai bao.
    // sort array cua Payload hoat dong nhu ORDER BY featured DESC, "order" ASC.
    sort: ['-featured', 'order'],
    depth: 1,
  })
  return { category: cat, products: docs }
}

export const getLatestPosts = unstable_cache(
  async (limit = 3) => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'posts',
      limit,
      sort: '-publishedAt',
      depth: 1,
    })
    return docs
  },
  ['latest-posts'],
  { revalidate: CACHE_TTL, tags: ['posts'] },
)

export async function getPage(slug?: string) {
  if (!slug) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1 })
  return docs[0] ?? null
}
