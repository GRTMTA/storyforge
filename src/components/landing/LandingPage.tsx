/**
 * Scribis — Cinematic scroll-based landing page
 *
 * Architecture:
 *  - Every section is `position: fixed` and `height: 100vh`, stacked on top of
 *    each other in the DOM. The page height is set by a tall scroll-track div.
 *  - GSAP ScrollTrigger scrubs opacity / y transforms as the user scrolls,
 *    creating a seamless "one section fades into the next" cinematic feel.
 *  - Images are CSS background-image with background-size: cover — never <img>.
 *  - All GSAP instances are cleaned up on unmount.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BookOpen } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** How many vh of scroll-room each section gets */
const SCROLL_PER_SECTION = 120 // 120vh per section feels deliberate

const SECTIONS = [
  {
    id: 'hero',
    image: '/images/landing/book.png',
    eyebrow: 'AI-powered interactive storytelling',
    headline: 'Every story begins\nwith a single page.',
    sub: 'Write, branch, and explore — co-authored by AI,\nshaped entirely by you.',
    overlay: 'linear-gradient(to bottom, rgba(8,8,20,.72) 0%, rgba(12,12,30,.38) 50%, rgba(8,8,20,.88) 100%)',
    particles: 40,
    isCta: false,
  },
  {
    id: 'scene1',
    image: '/images/landing/fae_rise.png',
    eyebrow: null,
    headline: 'The spark of creation...',
    sub: null,
    overlay: 'linear-gradient(to bottom, rgba(8,8,20,.65) 0%, rgba(18,12,8,.22) 55%, rgba(8,8,20,.72) 100%)',
    particles: 28,
    isCta: false,
  },
  {
    id: 'scene2',
    image: '/images/landing/fae_glide.png',
    eyebrow: null,
    headline: 'Every choice leads\nsomewhere new.',
    sub: null,
    overlay: 'linear-gradient(to bottom, rgba(8,8,20,.62) 0%, rgba(10,8,28,.18) 50%, rgba(8,8,20,.68) 100%)',
    particles: 22,
    isCta: false,
  },
  {
    id: 'scene3',
    image: '/images/landing/fae_arrive.png',
    eyebrow: null,
    headline: 'The destination\ndraws near...',
    sub: null,
    overlay: 'linear-gradient(to bottom, rgba(8,8,20,.55) 0%, rgba(14,10,30,.22) 55%, rgba(8,8,20,.85) 100%)',
    particles: 30,
    isCta: false,
  },
  {
    id: 'ending',
    image: '/images/landing/gate.png',
    eyebrow: 'The beginning awaits',
    headline: 'Your story\nstarts here.',
    sub: 'Step through the gate. Every choice you make\nwrites the next chapter.',
    overlay: 'linear-gradient(to bottom, rgba(8,8,20,.68) 0%, rgba(12,10,28,.20) 48%, rgba(8,8,20,.82) 100%)',
    particles: 55,
    isCta: true,
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Floating particles (CSS-only, no JS animation per-frame)
// ─────────────────────────────────────────────────────────────────────────────

interface Particle { id: number; x: number; y: number; size: number; dur: number; delay: number; gold: boolean }

function makeParticles(n: number): Particle[] {
  // Stable seed — generated once per mount so particles don't re-randomise on re-render
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: (i * 137.5 + 17) % 100,          // pseudo-random spread via golden ratio
    y: (i * 97.3  + 11) % 100,
    size: 1.2 + (i % 5) * 0.55,
    dur:  3.5 + (i % 7) * 0.6,
    delay: (i % 9) * 0.55,
    gold: i % 3 !== 0,
  }))
}

function Particles({ count }: { count: number }) {
  const [pts] = useState(() => makeParticles(count))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map(p => (
        <span
          key={p.id}
          className="absolute rounded-full will-change-transform"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width:  p.size,
            height: p.size,
            background: p.gold ? '#F5A623' : '#c4b5fd',
            opacity: 0,
            animation: `spark ${p.dur}s ${p.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixed header — solidifies on scroll
// ─────────────────────────────────────────────────────────────────────────────

function Header({ onEnterApp }: { onEnterApp: () => void }) {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-6 md:px-14 py-5"
      style={{
        background: solid ? 'rgba(8,8,20,0.85)' : 'transparent',
        backdropFilter: solid ? 'blur(14px)' : 'none',
        borderBottom: solid ? '1px solid rgba(245,166,35,0.10)' : '1px solid transparent',
        transition: 'background 0.45s ease, border-color 0.45s ease',
      }}
    >
      <div className="flex items-center gap-2.5 select-none cursor-default">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.28)' }}
        >
          <BookOpen className="w-4 h-4 text-[#F5A623]" />
        </div>
        <span
          className="text-white font-bold text-lg tracking-wide"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Scribis
        </span>
      </div>

      <button
        onClick={onEnterApp}
        className="text-sm font-medium cursor-pointer transition-colors"
        style={{
          color: 'rgba(255,255,255,0.68)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 999,
          padding: '8px 20px',
          fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.color = '#F5A623'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(245,166,35,0.5)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.68)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'
        }}
      >
        Open App →
      </button>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress dots (right side, desktop only)
// ─────────────────────────────────────────────────────────────────────────────

function ProgressDots({ active }: { active: number }) {
  const scrollToSection = (i: number) => {
    const target = i * SCROLL_PER_SECTION * window.innerHeight / 100
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-[200] hidden md:flex flex-col gap-3">
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => scrollToSection(i)}
          title={s.id}
          className="cursor-pointer rounded-full transition-all duration-300"
          style={{
            width:  i === active ? 8 : 5,
            height: i === active ? 8 : 5,
            background: i === active ? '#F5A623' : 'rgba(255,255,255,0.22)',
            border: i === active ? '1px solid rgba(245,166,35,0.55)' : '1px solid rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      className="relative z-[150] flex flex-col md:flex-row items-center justify-between gap-5 px-8 md:px-14 py-9"
      style={{ background: '#07070f', borderTop: '1px solid rgba(255,255,255,0.055)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,166,35,0.10)', border: '1px solid rgba(245,166,35,0.22)' }}
        >
          <BookOpen className="w-3.5 h-3.5 text-[#F5A623]" />
        </div>
        <span
          className="font-semibold text-base"
          style={{ color: 'rgba(255,255,255,0.62)', fontFamily: "'Playfair Display', serif" }}
        >
          Scribis
        </span>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
        Co-write your world with AI.
      </p>
      <nav className="flex gap-6">
        {['Privacy', 'Terms', 'Contact'].map(l => (
          <a
            key={l}
            href="#"
            style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontFamily: "'Inter', sans-serif" }}
            onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.65)')}
            onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.25)')}
          >
            {l}
          </a>
        ))}
      </nav>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LandingPage
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate   = useNavigate()
  const wrapRef    = useRef<HTMLDivElement>(null)
  const trackRef   = useRef<HTMLDivElement>(null)
  const sectRefs   = useRef<(HTMLDivElement | null)[]>([])
  const textRefs   = useRef<(HTMLDivElement | null)[]>([])
  const [active, setActive] = useState(0)

  const goToApp = () => navigate('/app')

  // ── GSAP setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {

      // ── 1. Hero: immediate load animation (no scroll trigger) ──────────────
      const heroText = textRefs.current[0]
      if (heroText) {
        gsap.fromTo(
          heroText.querySelectorAll('.reveal-line'),
          { opacity: 0, y: 38 },
          {
            opacity: 1,
            y: 0,
            duration: 1.1,
            ease: 'power3.out',
            stagger: 0.18,
            delay: 0.25,
          },
        )
      }

      // ── 2. Each scene section: fade in bg + slide up text as section enters ─
      //    We set initial opacity: 0 on sections 1-4 in the DOM; hero (#0) starts visible.
      SECTIONS.forEach((_, i) => {
        if (i === 0) return // hero is always visible

        const section = sectRefs.current[i]
        const text    = textRefs.current[i]
        if (!section || !text) return

        // Build a timeline for this section's reveal
        const tl = gsap.timeline({ paused: true })

        // Section fades in
        tl.fromTo(section,
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: 'power2.out' },
          0,
        )

        // Text lines slide up and fade in, staggered
        tl.fromTo(
          text.querySelectorAll('.reveal-line'),
          { opacity: 0, y: 42 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.16 },
          0.15,
        )

        // Decorative gold line draws in (if present)
        const goldLine = text.querySelector('.gold-line') as HTMLElement | null
        if (goldLine) {
          tl.fromTo(goldLine,
            { scaleX: 0, opacity: 0 },
            { scaleX: 1, opacity: 1, duration: 0.7, ease: 'power2.out', transformOrigin: 'center' },
            0.5,
          )
        }

        // Attach ScrollTrigger — scrub keeps it in sync with scroll position
        ScrollTrigger.create({
          trigger: trackRef.current,
          start: `${i * SCROLL_PER_SECTION - 30}vh top`,
          end:   `${i * SCROLL_PER_SECTION + 60}vh top`,
          scrub: 1.2,
          animation: tl,
          onEnter:      () => setActive(i),
          onEnterBack:  () => setActive(i),
          onLeaveBack:  () => i > 1 && setActive(i - 1),
        })
      })

      // ── 3. Hero leaves: fade hero out as scene-1 approaches ────────────────
      const heroSection = sectRefs.current[0]
      if (heroSection) {
        gsap.to(heroSection, {
          opacity: 0,
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: trackRef.current,
            start: `${SCROLL_PER_SECTION * 0.5}vh top`,
            end:   `${SCROLL_PER_SECTION * 0.9}vh top`,
            scrub: 1.2,
            onLeave:     () => setActive(1),
            onEnterBack: () => setActive(0),
          },
        })
      }

    }, wrapRef)

    return () => {
      ctx.revert()
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Inline styles (no Tailwind for layout-critical values to avoid purging)
  // ─────────────────────────────────────────────────────────────────────────

  const totalScrollHeight = `${SECTIONS.length * SCROLL_PER_SECTION + 100}vh`

  return (
    <>
      {/* ── Global keyframes injected once ─────────────────────────────────── */}
      <style>{`
        @keyframes spark {
          0%   { transform: translateY(0)   scale(0.7); opacity: 0; }
          40%  { opacity: 0.9; }
          100% { transform: translateY(-32px) scale(1.15); opacity: 0; }
        }
        @keyframes ctaPulse {
          0%,100% { box-shadow: 0 0 22px 4px rgba(245,166,35,0.38); }
          50%      { box-shadow: 0 0 44px 10px rgba(245,166,35,0.68); }
        }
        html { scroll-behavior: auto; }   /* let GSAP own scrolling */
      `}</style>

      <div ref={wrapRef} style={{ background: '#07070f', color: '#fff' }}>

        <Header onEnterApp={goToApp} />
        <ProgressDots active={active} />

        {/* ── Sticky viewport viewport stack ─────────────────────────────────
             The outer div is the true scroll track (tall).
             The inner wrapper is sticky so it stays in view — sections are
             absolutely positioned inside it, all occupying the same 100vh slot.
        ────────────────────────────────────────────────────────────────────── */}
        <div
          ref={trackRef}
          style={{ height: totalScrollHeight }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflow: 'hidden',
            }}
          >
            {SECTIONS.map((sec, i) => {
              const isHero   = i === 0
              const isEnding = sec.isCta

              return (
                <div
                  key={sec.id}
                  ref={el => { sectRefs.current[i] = el }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    // Hero starts fully visible; all others start hidden
                    opacity: isHero ? 1 : 0,
                    // Stack order: later sections on top so they reveal over earlier ones
                    zIndex: i + 1,
                  }}
                >
                  {/* ── Background image ─────────────────────────────────── */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${sec.image})`,
                      backgroundSize:     'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat:   'no-repeat',
                    }}
                  />

                  {/* ── Dark gradient overlay ─────────────────────────────── */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: sec.overlay,
                      zIndex: 1,
                    }}
                  />

                  {/* ── Particles ────────────────────────────────────────── */}
                  <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                    <Particles count={sec.particles} />
                  </div>

                  {/* ── Text content ─────────────────────────────────────── */}
                  <div
                    ref={el => { textRefs.current[i] = el }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: isEnding ? 'center' : 'center',
                      textAlign: 'center',
                      padding: '0 24px',
                    }}
                  >
                    {/* Eyebrow */}
                    {sec.eyebrow && (
                      <p
                        className="reveal-line"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 12,
                          fontWeight: 500,
                          letterSpacing: '0.28em',
                          textTransform: 'uppercase',
                          color: 'rgba(245,166,35,0.78)',
                          marginBottom: 22,
                        }}
                      >
                        {sec.eyebrow}
                      </p>
                    )}

                    {/* Headline */}
                    <h2
                      className="reveal-line"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: isHero
                          ? 'clamp(2.2rem, 6.5vw, 5.2rem)'
                          : 'clamp(1.9rem, 4.8vw, 4rem)',
                        fontWeight: 700,
                        fontStyle: isHero ? 'normal' : 'italic',
                        lineHeight: 1.07,
                        color: '#fff',
                        textShadow: '0 2px 40px rgba(0,0,0,0.9)',
                        maxWidth: 780,
                        whiteSpace: 'pre-line',
                        marginBottom: 0,
                      }}
                    >
                      {/* Gold-tinted last word/phrase on hero + ending */}
                      {isHero ? (
                        <>
                          Every story begins{'\n'}
                          <em style={{ color: '#F5A623', fontStyle: 'italic' }}>
                            with a single page.
                          </em>
                        </>
                      ) : isEnding ? (
                        <>
                          Your story{'\n'}
                          <em style={{ color: '#F5A623', fontStyle: 'italic' }}>
                            starts here.
                          </em>
                        </>
                      ) : (
                        sec.headline
                      )}
                    </h2>

                    {/* Gold decorative line (scene sections only) */}
                    {!isHero && !isEnding && (
                      <div
                        className="gold-line"
                        style={{
                          width: '52%',
                          height: 1,
                          margin: '28px auto 0',
                          background: 'linear-gradient(to right, transparent, rgba(245,166,35,0.55), transparent)',
                          transformOrigin: 'center',
                        }}
                      />
                    )}

                    {/* Sub-headline */}
                    {sec.sub && (
                      <p
                        className="reveal-line"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)',
                          color: 'rgba(255,255,255,0.58)',
                          lineHeight: 1.7,
                          maxWidth: 480,
                          marginTop: 22,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {sec.sub}
                      </p>
                    )}

                    {/* CTAs — hero */}
                    {isHero && (
                      <div
                        className="reveal-line"
                        style={{ marginTop: 38, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
                      >
                        <button
                          onClick={goToApp}
                          style={{
                            padding: '14px 36px',
                            borderRadius: 999,
                            background: '#F5A623',
                            color: '#1A1A3E',
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: 'pointer',
                            animation: 'ctaPulse 2.8s ease-in-out infinite',
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F7C05A')}
                          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F5A623')}
                        >
                          Begin Your Story
                        </button>
                        <button
                          onClick={goToApp}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.52)',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 14,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: 4,
                            textDecorationColor: 'rgba(255,255,255,0.22)',
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#fff')}
                          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.52)')}
                        >
                          Sign in →
                        </button>
                      </div>
                    )}

                    {/* CTAs — ending */}
                    {isEnding && (
                      <>
                        <p
                          className="reveal-line"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)',
                            color: 'rgba(255,255,255,0.52)',
                            lineHeight: 1.7,
                            maxWidth: 440,
                            marginTop: 20,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {sec.sub}
                        </p>
                        <div
                          className="reveal-line"
                          style={{ marginTop: 36, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
                        >
                          <button
                            onClick={goToApp}
                            style={{
                              padding: '14px 40px',
                              borderRadius: 999,
                              background: 'linear-gradient(135deg, #F5A623, #F7C05A)',
                              color: '#1A1A3E',
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 700,
                              fontSize: 15,
                              border: 'none',
                              cursor: 'pointer',
                              animation: 'ctaPulse 2.4s ease-in-out infinite',
                            }}
                            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.08)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.filter = 'none')}
                          >
                            Start Writing Free
                          </button>
                          <button
                            onClick={goToApp}
                            style={{
                              padding: '14px 28px',
                              borderRadius: 999,
                              background: 'transparent',
                              color: 'rgba(255,255,255,0.52)',
                              border: '1px solid rgba(255,255,255,0.20)',
                              fontFamily: "'Inter', sans-serif",
                              fontSize: 14,
                              cursor: 'pointer',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.color = '#fff'
                              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.5)'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.52)'
                              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.20)'
                            }}
                          >
                            Sign in →
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer sits below the scroll track ─────────────────────────── */}
        <Footer />
      </div>
    </>
  )
}
