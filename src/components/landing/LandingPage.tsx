import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ─── Assets ───────────────────────────────────────────────────────────────────
const IMGS = {
  book:    '/images/landing/book.png',
  path:    '/images/landing/path.jpg',
  rise:    '/images/landing/spark.jpeg',
  fall:    '/images/landing/fall.jpg',
  spark:   '/images/landing/arrive.jpeg',
  gate:    '/images/landing/gate.jpg',
  magazine:'/images/landing/magazine.jpg',
} as const

// ─── Narrative scenes — 4 slides, each with a distinct transition type ────────
const SCENES = [
  {
    img:        IMGS.path,
    line:       'Every story begins\nwith a single page.',
    overlay:    'linear-gradient(180deg,rgba(3,3,10,.72) 0%,rgba(6,5,14,.28) 52%,rgba(3,3,10,.88) 100%)',
    transition: 'scale',
    particles:  20,
  },
  {
    img:        IMGS.rise,
    line:       'The spark\nof creation...',
    overlay:    'linear-gradient(180deg,rgba(3,3,10,.70) 0%,rgba(10,6,4,.22) 52%,rgba(3,3,10,.85) 100%)',
    transition: 'slide-up',
    particles:  22,
  },
  {
    img:        IMGS.fall,
    line:       'Every choice leads\nsomewhere new.',
    overlay:    'linear-gradient(180deg,rgba(3,3,10,.66) 0%,rgba(8,6,20,.18) 52%,rgba(3,3,10,.80) 100%)',
    transition: 'slide-left',
    particles:  24,
  },
  {
    img:        IMGS.spark,
    line:       'The destination\ndraws near...',
    overlay:    'linear-gradient(180deg,rgba(3,3,10,.58) 0%,rgba(10,8,22,.20) 52%,rgba(3,3,10,.88) 100%)',
    transition: 'mask',
    particles:  28,
    isLast:     true,
  },
] as const

// ─── Typography ───────────────────────────────────────────────────────────────
const T = {
  serif:   "'Playfair Display', serif",
  sans:    "'Inter', sans-serif",
  hero:    'clamp(3.2rem, 7.5vw, 6.2rem)',
  section: 'clamp(2.4rem, 5vw, 4.4rem)',
  slide:   'clamp(2.2rem, 5vw, 4.2rem)',
  body:    'clamp(1rem, 1.8vw, 1.2rem)',
  small:   '0.875rem',
  eyebrow: '0.72rem',
} as const

// ─── helpers ─────────────────────────────────────────────────────────────────
const bgImg = (img: string, ovl: string): React.CSSProperties => ({
  backgroundImage: `${ovl}, url(${img})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
})

// ─── Particles ────────────────────────────────────────────────────────────────
function Particles({ n }: { n: number }) {
  const [pts] = useState(() =>
    Array.from({ length: n }, (_, i) => ({
      id:   i,
      x:    (i * 137.5 + 17) % 100,
      y:    (i * 97.3 + 11) % 100,
      sz:   1.2 + (i % 5) * 0.45,
      dur:  3.8 + (i % 7) * 0.55,
      del:  (i % 11) * 0.42,
      gold: i % 3 !== 0,
    }))
  )
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map(p => (
        <span key={p.id} className="absolute rounded-full" style={{
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.sz, height: p.sz,
          background: p.gold ? '#F5A623' : '#c4b5fd',
          opacity: 0,
          animation: `lp-spark ${p.dur}s ${p.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const update = () => {
      if (!ref.current) return
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100
      ref.current.style.width = `${Math.min(pct, 100)}%`
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return (
    <div className="fixed top-0 inset-x-0 h-[2px] z-[600]"
      style={{ background: 'rgba(255,255,255,.05)' }}>
      <div ref={ref} style={{ width: '0%', height: '100%',
        background: 'linear-gradient(90deg,#F5A623,#F7C05A)',
        transition: 'width .04s linear' }} />
    </div>
  )
}

// ─── Header — logo only, no Sign In button ────────────────────────────────────
function Header() {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const h = () => setSolid(window.scrollY > 60)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <header className="fixed inset-x-0 top-0 z-[500] flex items-center justify-between"
      style={{
        padding: '18px 28px',
        background: solid ? 'rgba(5,5,16,.88)' : 'transparent',
        backdropFilter: solid ? 'blur(20px)' : 'none',
        borderBottom: solid ? '1px solid rgba(245,166,35,.09)' : '1px solid transparent',
        transition: 'background .4s, border-color .4s',
      }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 select-none">
        <img src="/logo-scribis.png" alt="Scribis" width={32} height={32}
          style={{ objectFit: 'contain' }} />
        <span className="font-bold tracking-wide text-white"
          style={{ fontFamily: T.serif, fontSize: '1.1rem' }}>
          Scribis
        </span>
      </div>
      {/* Subtle CTA link — not a full Sign In button */}
    </header>
  )
}

// ─── Gold CTA button ──────────────────────────────────────────────────────────
function GoldButton({ onClick, children, large = false }: {
  onClick: () => void; children: React.ReactNode; large?: boolean
}) {
  return (
    <button onClick={onClick} className="cursor-pointer font-bold"
      style={{
        padding: large ? '16px 48px' : '13px 34px',
        borderRadius: 999,
        background: '#F5A623',
        color: '#0c0c1e',
        fontFamily: T.sans,
        fontSize: large ? 16 : 14,
        border: 'none',
        animation: 'lp-pulse 2.8s ease-in-out infinite',
        transition: 'background .2s',
        letterSpacing: '.01em',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F7C05A')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#F5A623')}
    >
      {children}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// §1  HERO — book.png, fade-in + scale reveal on text
// ══════════════════════════════════════════════════════════════════════════════
function Hero({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const els = ref.current.querySelectorAll('.hl')
    gsap.fromTo(els,
      { opacity: 0, scale: 0.94, y: 32 },
      { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.16, delay: 0.2 },
    )
  }, [])
  return (
    <section ref={ref}
      className="relative h-screen flex items-center justify-center overflow-hidden"
      style={bgImg(IMGS.book, 'linear-gradient(180deg,rgba(3,3,10,.80) 0%,rgba(5,4,12,.32) 50%,rgba(3,3,10,.94) 100%)')}
    >
      {/* radial vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 76% at 50% 50%, transparent 28%, rgba(3,3,10,.65) 100%)',
        zIndex: 1,
      }} />
      {/* glow pulse behind book light */}
      <div className="absolute pointer-events-none" style={{
        width: '38vw', height: '38vw', maxWidth: 480, maxHeight: 480,
        borderRadius: '50%', left: '50%', top: '42%', transform: 'translate(-50%,-50%)',
        background: 'radial-gradient(ellipse, rgba(245,166,35,.11) 0%, transparent 68%)',
        animation: 'lp-glow 4s ease-in-out infinite', zIndex: 1,
      }} />
      <Particles n={34} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
        <p className="hl mb-5 font-semibold tracking-[.34em] uppercase"
          style={{ fontFamily: T.sans, fontSize: T.eyebrow, color: 'rgba(245,166,35,.84)', opacity: 0 }}>
          AI‑powered interactive storytelling
        </p>
        <h1 className="hl font-bold leading-[1.04] mb-7"
          style={{ fontFamily: T.serif, fontSize: T.hero, color: '#fff',
            textShadow: '0 3px 52px rgba(0,0,0,.95)', opacity: 0 }}>
          Every story begins<br />
          <em style={{ color: '#F5A623', fontStyle: 'italic' }}>with a single page.</em>
        </h1>
        <p className="hl mb-11 leading-relaxed"
          style={{ fontFamily: T.sans, fontSize: T.body,
            color: 'rgba(255,255,255,.58)', maxWidth: 520, opacity: 0 }}>
          Craft interactive narratives that branch beyond imagination.<br />
          AI-powered, infinite possibilities.
        </p>
        <div className="hl flex flex-col items-center gap-4" style={{ opacity: 0 }}>
          <GoldButton onClick={onStart} large>Start Your Story →</GoldButton>
          <button onClick={onSignIn} className="cursor-pointer"
            style={{ background: 'none', border: 'none', fontFamily: T.sans, fontSize: 13,
              color: 'rgba(255,255,255,.36)', transition: 'color .2s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.68)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.36)')}
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// §2  BRAND INTRO — editorial asymmetric layout, magazine.jpg on right
//     Headline reveals word-by-word (split text effect via spans + stagger)
// ══════════════════════════════════════════════════════════════════════════════
function BrandIntro() {
  const ref     = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const imgRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !textRef.current || !imgRef.current) return

    const trigger = { trigger: ref.current, start: 'top 62%', toggleActions: 'play none none reverse' }

    // Eyebrow + divider line
    gsap.fromTo(ref.current.querySelectorAll('.bi-top'),
      { opacity: 0, x: -28 },
      { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out', stagger: 0.1, scrollTrigger: trigger },
    )
    // Word-by-word headline reveal
    gsap.fromTo(ref.current.querySelectorAll('.bi-word'),
      { opacity: 0, y: '110%' },
      { opacity: 1, y: '0%', duration: 0.55, ease: 'power3.out', stagger: 0.045,
        scrollTrigger: { ...trigger, start: 'top 58%' } },
    )
    // Body + decorative line
    gsap.fromTo(ref.current.querySelectorAll('.bi-body'),
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out', stagger: 0.12,
        scrollTrigger: { ...trigger, start: 'top 52%' } },
    )
    // Magazine image slides in from right
    gsap.fromTo(imgRef.current,
      { opacity: 0, x: 56, scale: 0.97 },
      { opacity: 1, x: 0, scale: 1, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { ...trigger, start: 'top 60%' } },
    )
  }, [])

  // Split headline into word spans for the reveal
  const headline = 'Built for stories that breathe and branch.'
  const words = headline.split(' ')

  return (
    <section ref={ref}
      className="relative overflow-hidden"
      style={{
        background: '#0d0d24',
        padding: 'clamp(5rem,10vw,9rem) clamp(1.5rem,5vw,4rem)',
      }}
    >
      {/* very subtle texture overlay — represented as a noise-like gradient */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        backgroundImage: `url(${IMGS.magazine})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.04, zIndex: 0,
      }} />

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

        {/* Left — editorial text */}
        <div ref={textRef} className="flex flex-col">
          {/* eyebrow + rule */}
          <div className="flex items-center gap-4 mb-8">
            <div className="bi-top h-[1px] w-10"
              style={{ background: '#F5A623', opacity: 0 }} />
            <p className="bi-top font-semibold tracking-[.32em] uppercase"
              style={{ fontFamily: T.sans, fontSize: T.eyebrow,
                color: 'rgba(245,166,35,.82)', opacity: 0 }}>
              What we build
            </p>
          </div>

          {/* headline — each word wrapped for slide-up reveal */}
          <h2 className="font-bold leading-[1.08] mb-10 overflow-hidden"
            style={{ fontFamily: T.serif, fontSize: T.section, color: '#fff' }}>
            {words.map((w, i) => (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden',
                marginRight: '0.3em', verticalAlign: 'bottom' }}>
                <span className="bi-word" style={{ display: 'inline-block', opacity: 0 }}>
                  {w === 'breathe' || w === 'branch.'
                    ? <em style={{ color: '#F5A623', fontStyle: 'italic' }}>{w}</em>
                    : w}
                </span>
              </span>
            ))}
          </h2>

          {/* pull-quote divider */}
          <div className="bi-body h-[1px] mb-8"
            style={{
              width: '100%', maxWidth: 320,
              background: 'linear-gradient(90deg,rgba(245,166,35,.5),transparent)',
              opacity: 0,
            }} />

          {/* body */}
          <p className="bi-body leading-[1.85]"
            style={{ fontFamily: T.sans, fontSize: T.body,
              color: 'rgba(255,255,255,.54)', maxWidth: 480, opacity: 0 }}>
            Scribis is an AI-powered narrative studio. Every choice you make creates a new
            branch. Every branch opens a new path. Infinite stories, one vision — entirely yours.
          </p>

          {/* pull quote */}
          <blockquote className="bi-body mt-10 pl-6"
            style={{
              borderLeft: '2px solid rgba(245,166,35,.4)',
              fontFamily: T.serif,
              fontSize: 'clamp(1.1rem,2vw,1.3rem)',
              color: 'rgba(255,255,255,.42)',
              fontStyle: 'italic',
              lineHeight: 1.6,
              opacity: 0,
            }}>
            "The page is not the limit — the branching is."
          </blockquote>
        </div>

        {/* Right — magazine image */}
        <div ref={imgRef}
          className="relative rounded-2xl overflow-hidden"
          style={{ opacity: 0, aspectRatio: '4/5' }}
        >
          <img src={IMGS.magazine} alt="Editorial visual"
            style={{ width: '100%', height: '100%', objectFit: 'cover',
              objectPosition: 'center', display: 'block' }} />
          {/* editorial corner label */}
          <div className="absolute bottom-0 left-0 right-0 p-6"
            style={{ background: 'linear-gradient(0deg,rgba(3,3,10,.88) 0%,transparent 100%)' }}>
            <p style={{ fontFamily: T.sans, fontSize: T.eyebrow,
              color: 'rgba(245,166,35,.7)', letterSpacing: '.24em', textTransform: 'uppercase' }}>
              Scribis Studio
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// §3  NARRATIVE SLIDE — 5 scenes, each with a UNIQUE transition
//
//  Transition types:
//   'scale'      — scale 0.88→1 + fade in (book)
//   'slide-up'   — translate Y +80px → 0 (fae_rise)
//   'slide-left' — translate X -80px → 0 (fae_glide)
//   'mask'       — clipPath circle expands from center (fae_arrive)
//   'bloom'      — filter blur(12px)→0 + scale 1.06→1 (gate)
//
//  All use pin:true, end:"+=200%", scrub:1.5, anticipatePin:1
// ══════════════════════════════════════════════════════════════════════════════
type TransitionType = 'scale' | 'slide-up' | 'slide-left' | 'mask'

interface SceneProps {
  img:        string
  line:       string
  overlay:    string
  transition: TransitionType
  particles:  number
  isLast?:    boolean
}

function NarrativeScene({ img, line, overlay, transition, particles, isLast }: SceneProps) {
  const secRef  = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const imgRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sec  = secRef.current
    const text = textRef.current
    const imgEl = imgRef.current
    if (!sec || !text || !imgEl) return

    const items = text.querySelectorAll('.sl')
    const tl = gsap.timeline({ paused: true })

    // ── Phase 1: entrance (0.0 → 0.40) — unique per transition type ──────────
    if (transition === 'scale') {
      tl.fromTo(items,
        { opacity: 0, scale: 0.88, y: 24 },
        { opacity: 1, scale: 1, y: 0, ease: 'power2.out', stagger: 0.06, duration: 0.38 },
        0,
      )
    } else if (transition === 'slide-up') {
      tl.fromTo(items,
        { opacity: 0, y: 80 },
        { opacity: 1, y: 0, ease: 'power3.out', stagger: 0.07, duration: 0.38 },
        0,
      )
    } else if (transition === 'slide-left') {
      tl.fromTo(items,
        { opacity: 0, x: -80 },
        { opacity: 1, x: 0, ease: 'power3.out', stagger: 0.07, duration: 0.38 },
        0,
      )
    } else if (transition === 'mask') {
      // Clip-path circle expands from center
      tl.fromTo(text,
        { clipPath: 'circle(0% at 50% 50%)', opacity: 0 },
        { clipPath: 'circle(100% at 50% 50%)', opacity: 1, ease: 'power2.inOut', duration: 0.42 },
        0,
      )
      // individual items fade in after mask opens
      tl.fromTo(items,
        { opacity: 0 },
        { opacity: 1, ease: 'power1.out', stagger: 0.05, duration: 0.22 },
        0.08,
      )
    }

    // ── Phase 2: exit (0.65 → 1.0) — standard slide-up exit, skip on last ────
    if (!isLast) {
      tl.to(items,
        { opacity: 0, y: -38, ease: 'power2.in', stagger: 0.05, duration: 0.32 },
        0.66,
      )
    }

    tl.totalDuration(1)

    const st = ScrollTrigger.create({
      trigger:          sec,
      start:            'top top',
      end:              '+=200%',
      pin:              true,
      pinSpacing:       true,
      anticipatePin:    1,
      scrub:            1.5,
      animation:        tl,
      invalidateOnRefresh: true,
    })

    return () => { st.kill(); tl.kill() }
  }, [transition, isLast])

  return (
    <section ref={secRef}
      className="relative h-screen flex items-center justify-center overflow-hidden"
    >
      {/* image layer — isolated div so bloom filter only affects this, not text */}
      <div ref={imgRef} className="absolute inset-0" aria-hidden style={{
        backgroundImage: `${overlay}, url(${img})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        willChange: 'filter',
      }} />
      {/* vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 88% 82% at 50% 50%, transparent 26%, rgba(3,3,10,.60) 100%)',
        zIndex: 2,
      }} />
      <Particles n={particles} />

      <div ref={textRef}
        className="relative flex flex-col items-center text-center px-6 max-w-4xl mx-auto"
        style={{ zIndex: 10 }}
      >
        <p className="sl font-bold italic leading-[1.10]"
          style={{ fontFamily: T.serif, fontSize: T.slide, color: '#fff',
            textShadow: '0 3px 54px rgba(0,0,0,.97)', maxWidth: 700,
            whiteSpace: 'pre-line', opacity: 0 }}>
          {line}
        </p>
        <div className="sl mt-8 h-[1px]" style={{
          width: 180,
          background: 'linear-gradient(90deg,transparent,rgba(245,166,35,.52),transparent)',
          opacity: 0,
        }} />
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// §6  FINAL CTA — gate.jpg, bloom reveal (blur→focus, strong entrance)
// ══════════════════════════════════════════════════════════════════════════════
function FinalCTA({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const ref    = useRef<HTMLElement>(null)
  const bgRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !bgRef.current) return
    const trigger = { trigger: ref.current, start: 'top 68%', toggleActions: 'play none none reverse' }
    // Bloom: background comes into focus
    gsap.fromTo(bgRef.current,
      { filter: 'blur(16px) brightness(.45)', scale: 1.08 },
      { filter: 'blur(0px) brightness(1)', scale: 1, duration: 1.4, ease: 'power2.out',
        scrollTrigger: trigger },
    )
    // Text stagger fade-in
    gsap.fromTo(ref.current.querySelectorAll('.rv'),
      { opacity: 0, y: 44 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.14,
        scrollTrigger: { ...trigger, start: 'top 60%' } },
    )
  }, [])

  return (
    <section ref={ref}
      className="relative h-screen flex items-center justify-center overflow-hidden"
    >
      {/* bloomable background layer */}
      <div ref={bgRef} className="absolute inset-0"
        style={bgImg(IMGS.gate,
          'linear-gradient(180deg,rgba(3,3,10,.72) 0%,rgba(8,6,20,.20) 46%,rgba(3,3,10,.86) 100%)')} />

      {/* golden arch glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 62% at 50% 44%, rgba(245,166,35,.10) 0%, transparent 68%)',
        zIndex: 2,
      }} />
      <Particles n={48} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
        <p className="rv mb-5 font-semibold tracking-[.34em] uppercase"
          style={{ fontFamily: T.sans, fontSize: T.eyebrow, color: 'rgba(245,166,35,.84)', opacity: 0 }}>
          The beginning awaits
        </p>
        <h2 className="rv font-bold leading-[1.06] mb-6"
          style={{ fontFamily: T.serif, fontSize: T.section, color: '#fff',
            textShadow: '0 3px 56px rgba(0,0,0,.97)', opacity: 0 }}>
          Your story<br />
          <em style={{ color: '#F5A623', fontStyle: 'italic' }}>starts here.</em>
        </h2>
        <p className="rv leading-relaxed mb-11"
          style={{ fontFamily: T.sans, fontSize: T.body, color: 'rgba(255,255,255,.50)',
            maxWidth: 420, opacity: 0 }}>
          Start crafting infinite narratives today.<br />
          No credit card required.
        </p>
        <div className="rv flex flex-col items-center gap-4" style={{ opacity: 0 }}>
          <GoldButton onClick={onStart} large>Begin Your Journey →</GoldButton>
          <button onClick={onSignIn} className="cursor-pointer"
            style={{ background: 'none', border: 'none', fontFamily: T.sans, fontSize: 13,
              color: 'rgba(255,255,255,.34)', transition: 'color .2s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.68)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.34)')}
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// §7  FOOTER
// ══════════════════════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer
      className="flex flex-col md:flex-row items-center justify-between gap-5 px-8 md:px-14 py-9"
      style={{ background: '#03030a', borderTop: '1px solid rgba(255,255,255,.05)' }}
    >
      <div className="flex items-center gap-2.5">
        <img src="/logo-scribis.png" alt="Scribis" width={28} height={28}
          style={{ objectFit: 'contain' }} />
        <span className="font-semibold"
          style={{ color: 'rgba(255,255,255,.54)', fontFamily: T.serif, fontSize: '1rem' }}>
          Scribis
        </span>
      </div>
      <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 13, fontFamily: T.sans }}>
        Co-write your world with AI.
      </p>
      <nav className="flex gap-6">
        {['Privacy', 'Terms', 'Contact'].map(l => (
          <a key={l} href="#"
            style={{ color: 'rgba(255,255,255,.22)', fontSize: 13,
              fontFamily: T.sans, transition: 'color .2s' }}
            onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,.62)')}
            onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,.22)')}
          >
            {l}
          </a>
        ))}
      </nav>
    </footer>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE ROOT
// ══════════════════════════════════════════════════════════════════════════════
export function LandingPage() {
  const navigate  = useNavigate()
  const goToApp   = () => navigate('/app')
  const goToLogin = () => navigate('/app')  // swap to '/login' when route exists

  // Disable browser smooth-scroll so GSAP scrub isn't fighting it
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'
    return () => { document.documentElement.style.scrollBehavior = prev }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;500;600&display=swap');

        @keyframes lp-spark {
          0%   { transform: translateY(0)     scale(.68); opacity: 0;   }
          42%  {                                           opacity: .85; }
          100% { transform: translateY(-38px) scale(1.25); opacity: 0;  }
        }
        @keyframes lp-pulse {
          0%,100% { box-shadow: 0 0 16px 2px  rgba(245,166,35,.32); }
          50%     { box-shadow: 0 0 40px 10px rgba(245,166,35,.62); }
        }
        @keyframes lp-glow {
          0%,100% { opacity: .7;  transform: translate(-50%,-50%) scale(.96); }
          50%     { opacity: 1.0; transform: translate(-50%,-50%) scale(1.08); }
        }

        /* timeline active node */
        .tn-active > div:first-child > div {
          background: rgba(245,166,35,.18) !important;
          border-color: rgba(245,166,35,.55) !important;
        }

        /* mobile: reset horizontal layout */
        @media (max-width: 767px) {
          .tn { min-width: 0 !important; width: 100% !important; }
        }
      `}</style>

      <div style={{ background: '#04040c', color: '#fff', overflowX: 'hidden' }}>
        <ProgressBar />
        <Header />

        {/* §1 Hero — book.png */}
        <Hero onStart={goToApp} onSignIn={goToLogin} />

        {/* §2 Brand Intro — editorial, magazine.jpg */}
        <BrandIntro />

        {/* §3 Narrative Journey — 4 uniquely-animated pinned scenes */}
        {SCENES.map((s, i) => (
          <NarrativeScene
            key={i}
            img={s.img}
            line={s.line}
            overlay={s.overlay}
            transition={s.transition as TransitionType}
            particles={s.particles}
            isLast={'isLast' in s && !!s.isLast}
          />
        ))}

        {/* §6 Final CTA — gate.jpg bloom */}
        <FinalCTA onStart={goToApp} onSignIn={goToLogin} />

        {/* §7 Footer */}
        <Footer />
      </div>
    </>
  )
}
