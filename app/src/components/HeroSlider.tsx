'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Slide = { title: string; description?: string | null; link?: string | null; buttonText?: string | null }

export type HeroWatermark = { src: string; width: number; height: number; alt: string }

export default function HeroSlider({ slides, watermark }: { slides: Slide[]; watermark?: HeroWatermark | null }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    // Khong chay timer khi chi co 1 slide (hoac khong co) — truoc day
    // (i + 1) % 0 tra ve NaN khi slides rong.
    if (slides.length < 2) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  if (slides.length === 0) return null

  return (
    <section className="vt-hero" aria-label="Ưu đãi nổi bật" aria-roledescription="carousel">
      {/* Logo doi tac lam hinh nen mo. aria-hidden vi day la trang tri:
          thong tin doi tac da co dang text o footer. */}
      {watermark && (
        <div className="vt-hero__watermark" aria-hidden="true">
          <Image
            src={watermark.src}
            alt=""
            width={watermark.width}
            height={watermark.height}
            sizes="(max-width: 767px) 60vw, 420px"
            priority={false}
          />
        </div>
      )}

      {slides.map((s, i) => (
        <div
          key={i}
          className={'vt-slide' + (i === idx ? ' active' : '')}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} / ${slides.length}`}
          aria-hidden={i === idx ? undefined : true}
        >
          <div className="vt-slide-inner">
            <h2>{s.title}</h2>
            {s.description && <p>{s.description}</p>}
            {s.link && (
              <Link className="vt-btn" href={s.link} tabIndex={i === idx ? undefined : -1}>
                {s.buttonText || 'Xem thêm'}
              </Link>
            )}
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <div className="vt-hero-dots">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              className={i === idx ? 'active' : ''}
              aria-label={`Chuyển đến: ${s.title}`}
              aria-current={i === idx ? 'true' : undefined}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
