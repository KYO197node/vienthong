'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export type NavCategory = {
  id: number
  name: string
  slug: string
  children: { id: number; name: string; slug: string }[]
}
export type NavItem = { href: string; label: string; mega?: boolean }

export default function SiteNav({ items, categories }: { items: NavItem[]; categories: NavCategory[] }) {
  const [open, setOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  // Danh muc goc dang duoc tro vao. `null` = chua tro vao cai nao, chi hien
  // danh sach 3 danh muc goc, chua bung bang ngang.
  const [activeRoot, setActiveRoot] = useState<number | null>(null)
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) closeAll()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function closeAll() {
    setOpen(false)
    setCatOpen(false)
    setActiveRoot(null)
  }

  const active = categories.find((c) => c.id === activeRoot) ?? null
  const childHref = (rSlug: string, cSlug: string) =>
    rSlug === 'internet-truyen-hinh' ? `/danh-muc/${rSlug}#${cSlug}` : `/danh-muc/${cSlug}`

  return (
    <nav className="vt-nav" ref={navRef} aria-label="Menu chính">
      <div className="vt-container vt-nav-bar">
        <button
          className="vt-burger"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          aria-controls="vt-nav-list"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>

        <div className={'vt-nav-panel' + (open ? ' open' : '')} id="vt-nav-list">
          <form className="vt-nav-search" action="/tim-kiem" role="search" onSubmit={closeAll}>
            <label className="sr-only" htmlFor="vt-nav-q">
              Tìm kiếm
            </label>
            <input id="vt-nav-q" type="search" name="q" placeholder="Tìm gói internet, camera, sim..." />
            <button type="submit">Tìm</button>
          </form>

          <ul className="vt-nav-list">
            {items.map((m) => {
              const hasMenu = Boolean(m.mega) && categories.length > 0
              if (!hasMenu) {
                return (
                  <li key={m.href}>
                    <span className="vt-nav-row">
                      <Link href={m.href} onClick={closeAll}>
                        {m.label}
                      </Link>
                    </span>
                  </li>
                )
              }

              return (
                <li
                  key={m.href}
                  className="vt-nav-hascat"
                  onMouseEnter={() => setCatOpen(true)}
                  onMouseLeave={() => {
                    setCatOpen(false)
                    setActiveRoot(null)
                  }}
                >
                  <span className="vt-nav-row">
                    <Link href={m.href} onClick={closeAll}>
                      {m.label}
                    </Link>
                    <button
                      type="button"
                      className="vt-nav-caret"
                      aria-label={catOpen ? 'Đóng danh mục' : 'Mở danh mục'}
                      aria-expanded={catOpen}
                      onClick={() => {
                        setCatOpen((v) => !v)
                        setActiveRoot(null)
                      }}
                    >
                      <span aria-hidden="true">▾</span>
                    </button>
                  </span>

                  {/* Tang 1: chi 3 danh muc goc. Tang 2 (bang ngang chua danh
                      muc con) chi bung ra khi tro vao mot danh muc goc. */}
                  <div className={'vt-catmenu' + (catOpen ? ' open' : '')}>
                    <ul className="vt-catmenu__roots">
                      {categories.map((r) => {
                        const isActive = r.id === activeRoot
                        return (
                          <li
                            key={r.id}
                            className={isActive ? 'active' : undefined}
                            onMouseEnter={() => setActiveRoot(r.id)}
                          >
                            <Link href={`/danh-muc/${r.slug}`} onClick={closeAll} onFocus={() => setActiveRoot(r.id)}>
                              <span>{r.name}</span>
                              {r.children.length > 0 && (
                                <span className="vt-catmenu__arrow" aria-hidden="true">
                                  ›
                                </span>
                              )}
                            </Link>

                            {/* Tren mobile: danh muc con hien inline ngay duoi
                                danh muc goc (khong the bung sang ben). */}
                            {r.children.length > 0 && (
                              <>
                                <button
                                  type="button"
                                  className="vt-catmenu__toggle"
                                  aria-label={isActive ? `Đóng ${r.name}` : `Mở ${r.name}`}
                                  aria-expanded={isActive}
                                  onClick={() => setActiveRoot(isActive ? null : r.id)}
                                >
                                  <span aria-hidden="true">{isActive ? '−' : '+'}</span>
                                </button>
                                <ul className={'vt-catmenu__sub' + (isActive ? ' open' : '')}>
                                  {r.children.map((s) => (
                                    <li key={s.id}>
                                      <Link href={childHref(r.slug, s.slug)} onClick={closeAll}>
                                        {s.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>

                    {/* Bang ngang: danh muc con cua danh muc goc dang tro vao. */}
                    {active && active.children.length > 0 && (
                      <div className="vt-catmenu__panel">
                        <p className="vt-catmenu__panel-head">
                          <Link href={`/danh-muc/${active.slug}`} onClick={closeAll}>
                            {active.name}
                          </Link>
                        </p>
                        <ul className="vt-catmenu__grid">
                          {active.children.map((s) => (
                            <li key={s.id}>
                              <Link href={childHref(active.slug, s.slug)} onClick={closeAll}>
                                {s.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <p className="vt-catmenu__panel-foot">
                          <Link href={`/danh-muc/${active.slug}`} onClick={closeAll}>
                            Xem tất cả {active.name} →
                          </Link>
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}
