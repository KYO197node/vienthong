/**
 * Xoa cache runtime mot cach an toan.
 *
 * `revalidateTag` cua Next.js chi hoat dong trong ngu canh request/render cua
 * Next. Cac hook Payload con duoc goi tu moi truong khac — vi du script seed
 * chay bang `tsx` luc `docker build` — va o do `revalidateTag` se throw, lam
 * ca qua trinh build thap bai. Boc lai de hook khong bao gio pha vo thao tac
 * ghi du lieu; neu khong xoa duoc cache thi cung tu het han theo TTL 300s.
 */
export function safeRevalidateTag(tag: string): void {
  try {
    // Import dong: tranh keo runtime cua next/cache vao script CLI.
    const { revalidateTag } = require('next/cache') as { revalidateTag: (t: string) => void }
    revalidateTag(tag)
  } catch {
    // Ngoai ngu canh Next (seed, migration, CLI) — bo qua.
  }
}
