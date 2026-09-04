'use client'

import { useEffect, useState } from 'react'

/**
 * Cac nut noi: goi / zalo / messenger + len dau trang.
 * Chi render nut khi Settings co gia tri that — truoc day fallback '#' tao ra
 * link chet dan nguoi dung den trang trong.
 */
export default function FloatingButtons({
  hotline,
  zalo,
  messenger,
}: {
  hotline: string
  zalo: string
  messenger: string
}) {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const tel = hotline.replace(/[^0-9]/g, '')
  const isValidLink = (u: string) => Boolean(u) && u !== '#' && /^https?:\/\//.test(u)

  return (
    <>
      <div className="vt-float">
        {tel && (
          <a className="vt-float__btn vt-f-call" href={`tel:${tel}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M6.6 10.8c1.2 2.3 3.1 4.2 5.4 5.4l1.8-1.8c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-1.8 1.8Z"
              />
            </svg>
            <span className="sr-only">Gọi hotline {hotline}</span>
          </a>
        )}

        {isValidLink(zalo) && (
          <a className="vt-float__btn vt-f-zalo" href={zalo} target="_blank" rel="noopener noreferrer">
            <span className="vt-float__text" aria-hidden="true">
              Zalo
            </span>
            <span className="sr-only">Chat Zalo (mở tab mới)</span>
          </a>
        )}

        {isValidLink(messenger) && (
          <a className="vt-float__btn vt-f-msg" href={messenger} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M12 2C6.4 2 2 6.2 2 11.4c0 2.9 1.4 5.5 3.6 7.2v3.2l3.1-1.7c1 .3 2.1.4 3.3.4 5.6 0 10-4.2 10-9.4S17.6 2 12 2Zm1.1 12.3-2.5-2.7-4.7 2.7 5.2-5.5 2.6 2.6 4.6-2.6-5.2 5.5Z"
              />
            </svg>
            <span className="sr-only">Nhắn Messenger (mở tab mới)</span>
          </a>
        )}
      </div>

      {showTop && (
        <button
          className="vt-backtop"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span aria-hidden="true">↑</span>
          <span className="sr-only">Lên đầu trang</span>
        </button>
      )}
    </>
  )
}
