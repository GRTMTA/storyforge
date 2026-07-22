import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  type Variants,
} from 'framer-motion'
import { BookOpen } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  color: 'gold' | 'lavender'
}

// ── Particles ─────────────────────────────────────────────────────────────────
function useParticles(count: number): Particle[] {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 5,
      color: Math.random() > 0.5 ? 'gold' : 'lavender',
    }))
  )
  return particles
}

function ParticleField({ count = 30 }: { count?: number }) {
  const particles = useParticles(count)
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color === 'gold' ? '#F5A623' : '#c4b5fd',
            filter: `blur(${p.size > 2.5 ? 0.5 : 0}px)`,
          }}
          animate={{
            y: [0, -24, 0],
            opacity: [0, p.color === 'gold' ? 0.85 : 0.55, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ── Animation variants ────────────────────────────────────────────────────────
const revealVariants: Variants = {
  hidden:  { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: 'easeOut' },
  },
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
}

const lineReveal: Variants = {
  hidden:  { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.8, delay: 0.4, ease: 'easeOut' },
  },
}

// ── Parallax background image ─────────────────────────────────────────────────
function ParallaxBg({
  src,
  alt,
  strength = 0.12,
  eager = false,
}: {
  src: string
  alt: string
  strength?: number
  eager?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  // shift up to +shift on scroll: gives depth without showing empty edges
  const y = useTransform(scrollYProgress, [0, 1], [
    `-${strength * 100}%`,
    `${strength * 100}%`,
  ])

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        loading={eager ? 'eager' : 'lazy'}
        // scale slightly to prevent empty edge reveal during parallax movement
        className="absolute inset-0 w-full h-full object-cover scale-[1.18] will-change-transform"
      />
    </div>
  )
}

// ── Fixed header ──────────────────────────────────────────────────────────────
function Header({ onEnterApp }: { onEnterApp: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5"
      style={{
        background: scrolled ? 'rgba(12,12,30,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(245,166,35,0.12)' : '1px solid transparent',
        transition: 'background 0.4s, border-color 0.4s',
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
    >
      <div className="flex items-center gap-2.5 cursor-default select-none">
        <div className="w-8 h-8 rounded-lg bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center">
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
        className="text-sm font-medium text-white/70 hover:text-[#F5A623] transition-colors border border-white/20 hover:border-[#F5A623]/50 px-4 py-2 rounded-full"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        Open App →
      </button>
    </motion.header>
  )
}

// ── Hero section ──────────────────────────────────────────────────────────────
function HeroSection({ onEnterApp }: { onEnterApp: () => void }) {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      <ParallaxBg src="/images/landing/book.png" alt="Mystical open book" eager strength={0.08} />

      {/* Multi-layer gradient for depth and text readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#0c0c1e]/70 via-[#1A1A3E]/35 to-[#0c0c1e]/90" />
      {/* Subtle radial darkening at corners */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(8,8,20,0.55) 100%)' }}
      />

      <div className="absolute inset-0 z-[2]">
        <ParticleField count={40} />
      </div>

      <motion.div
        className="relative z-[3] flex flex-col items-center text-center px-6 max-w-4xl mx-auto"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={revealVariants}
          className="text-[#F5A623]/80 text-sm font-medium tracking-[0.25em] uppercase mb-6"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          AI-powered interactive storytelling
        </motion.p>

        <motion.h1
          variants={revealVariants}
          className="text-white font-bold leading-[1.05] mb-6"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.4rem, 7vw, 5.5rem)',
            textShadow: '0 2px 40px rgba(0,0,0,0.9)',
          }}
        >
          Every story begins<br />
          <span style={{ color: '#F5A623', fontStyle: 'italic' }}>with a single page.</span>
        </motion.h1>

        <motion.p
          variants={revealVariants}
          className="text-white/65 text-lg md:text-xl mb-10 max-w-xl leading-relaxed"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Write, branch, and explore — co-authored by AI, shaped entirely by you.
        </motion.p>

        <motion.div variants={revealVariants} className="flex flex-col sm:flex-row items-center gap-4">
          <motion.button
            onClick={onEnterApp}
            className="relative px-8 py-4 rounded-full font-semibold text-[#1A1A3E] text-base cursor-pointer"
            style={{ background: '#F5A623', fontFamily: "'Inter', sans-serif" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            animate={{
              boxShadow: [
                '0 0 24px rgba(245,166,35,0.4)',
                '0 0 48px rgba(245,166,35,0.72)',
                '0 0 24px rgba(245,166,35,0.4)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            Begin Your Story
          </motion.button>

          <button
            onClick={onEnterApp}
            className="text-white/55 hover:text-white text-sm font-medium transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/60 cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Sign in →
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[3] flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        <span
          className="text-white/35 text-xs tracking-[0.2em] uppercase"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Scroll to explore
        </span>
        <motion.div
          className="w-5 h-8 rounded-full border border-white/25 flex items-start justify-center pt-1.5"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-2 rounded-full bg-[#F5A623]"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}

// ── Scene section (1–3) ───────────────────────────────────────────────────────
interface SceneSectionProps {
  image: string
  alt: string
  text: string
  overlayVariant?: 'dark-bottom' | 'dark-center' | 'dark-top'
  particleCount?: number
  textPosition?: 'center' | 'bottom'
}

function SceneSection({
  image, alt, text,
  overlayVariant = 'dark-center',
  particleCount = 22,
  textPosition = 'center',
}: SceneSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-20% 0px -20% 0px' })

  const overlayGradient = {
    'dark-bottom':  'bg-gradient-to-b from-[#0c0c1e]/30 via-transparent to-[#0c0c1e]/90',
    'dark-center':  'bg-gradient-to-b from-[#0c0c1e]/65 via-[#1A1A3E]/20 to-[#0c0c1e]/65',
    'dark-top':     'bg-gradient-to-b from-[#0c0c1e]/85 via-[#1A1A3E]/30 to-[#0c0c1e]/35',
  }[overlayVariant]

  return (
    <section
      ref={ref}
      className={`relative h-screen w-full overflow-hidden flex justify-center ${
        textPosition === 'bottom' ? 'items-end pb-28' : 'items-center'
      }`}
    >
      <ParallaxBg src={image} alt={alt} strength={0.1} />
      <div className={`absolute inset-0 z-[1] ${overlayGradient}`} />
      <div className="absolute inset-0 z-[2]">
        <ParticleField count={particleCount} />
      </div>

      <motion.div
        className="relative z-[3] text-center px-6 max-w-3xl mx-auto"
        variants={staggerContainer}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        <motion.p
          variants={revealVariants}
          className="text-white/95 font-bold leading-[1.15]"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 'clamp(1.75rem, 4.5vw, 3.5rem)',
            textShadow: '0 2px 36px rgba(0,0,0,0.95)',
          }}
        >
          {text}
        </motion.p>
        {/* Gold decorative line */}
        <motion.div
          variants={lineReveal}
          className="mx-auto mt-6 h-px bg-gradient-to-r from-transparent via-[#F5A623]/60 to-transparent"
          style={{ width: '60%', transformOrigin: 'center' }}
        />
      </motion.div>
    </section>
  )
}

// ── Ending / CTA section ──────────────────────────────────────────────────────
function EndingSection({ onEnterApp }: { onEnterApp: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-15% 0px -15% 0px' })

  return (
    <section
      ref={ref}
      className="relative h-screen w-full overflow-hidden flex items-center justify-center"
    >
      <ParallaxBg src="/images/landing/gate.png" alt="Fantasy gateway to another world" strength={0.07} />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#0c0c1e]/72 via-[#1A1A3E]/22 to-[#0c0c1e]/80" />
      {/* Golden glow centered on the gate */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 44%, rgba(245,166,35,0.09) 0%, transparent 70%)' }}
      />
      <div className="absolute inset-0 z-[2]">
        <ParticleField count={55} />
      </div>

      <motion.div
        className="relative z-[3] flex flex-col items-center text-center px-6 max-w-3xl mx-auto"
        variants={staggerContainer}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        <motion.p
          variants={revealVariants}
          className="text-[#F5A623]/75 text-sm font-medium tracking-[0.3em] uppercase mb-5"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          The beginning awaits
        </motion.p>

        <motion.h2
          variants={revealVariants}
          className="text-white font-bold leading-[1.08] mb-5"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.2rem, 6vw, 4.8rem)',
            textShadow: '0 2px 48px rgba(0,0,0,0.9)',
          }}
        >
          Your story starts<br />
          <span style={{ color: '#F5A623', fontStyle: 'italic' }}>here.</span>
        </motion.h2>

        <motion.p
          variants={revealVariants}
          className="text-white/55 text-base md:text-lg mb-10 max-w-md leading-relaxed"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Step through the gate. Every choice you make writes the next chapter.
        </motion.p>

        <motion.div variants={revealVariants} className="flex flex-col sm:flex-row items-center gap-4">
          <motion.button
            onClick={onEnterApp}
            className="px-10 py-4 rounded-full font-semibold text-[#1A1A3E] text-base cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #F5A623 0%, #F7C05A 100%)',
              fontFamily: "'Inter', sans-serif",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            animate={{
              boxShadow: [
                '0 0 28px rgba(245,166,35,0.45)',
                '0 0 60px rgba(245,166,35,0.78)',
                '0 0 28px rgba(245,166,35,0.45)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            Start Writing Free
          </motion.button>

          <motion.button
            onClick={onEnterApp}
            className="text-white/55 hover:text-white text-sm font-medium border border-white/20 hover:border-white/50 px-6 py-4 rounded-full transition-colors cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign in →
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#07070f] border-t border-white/[0.06] py-10 px-6 md:px-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F5A623]/12 border border-[#F5A623]/25 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-[#F5A623]" />
          </div>
          <span
            className="text-white/65 font-semibold text-base"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Scribis
          </span>
        </div>

        <p
          className="text-white/25 text-sm text-center"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Co-write your world with AI.
        </p>

        <nav className="flex items-center gap-6">
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a
              key={l}
              href="#"
              className="text-white/28 hover:text-white/65 text-sm transition-colors"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {l}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

// ── Sidebar progress dots ─────────────────────────────────────────────────────
function ProgressDots({ total, active }: { total: number; active: number }) {
  const scrollToSection = (i: number) => {
    const sections = document.querySelectorAll('[data-section]')
    sections[i]?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex-col gap-3 hidden md:flex">
      {Array.from({ length: total }).map((_, i) => (
        <motion.button
          key={i}
          onClick={() => scrollToSection(i)}
          className="rounded-full border cursor-pointer"
          animate={{
            width:           i === active ? 8 : 6,
            height:          i === active ? 8 : 6,
            backgroundColor: i === active ? '#F5A623' : 'rgba(255,255,255,0.18)',
            borderColor:     i === active ? 'rgba(245,166,35,0.6)' : 'rgba(255,255,255,0.18)',
          }}
          transition={{ duration: 0.3 }}
          title={`Section ${i + 1}`}
        />
      ))}
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(0)

  const goToApp = () => navigate('/app')

  useEffect(() => {
    const sections = document.querySelectorAll('[data-section]')
    const observers = Array.from(sections).map((section, i) => {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(i) },
        { threshold: 0.45 },
      )
      obs.observe(section)
      return obs
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <div className="bg-[#07070f] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      <Header onEnterApp={goToApp} />
      <ProgressDots total={5} active={activeSection} />

      <div data-section="0"><HeroSection onEnterApp={goToApp} /></div>

      <div data-section="1">
        <SceneSection
          image="/images/landing/fae_rise.png"
          alt="Fae emerging from a magical book"
          text="The spark of creation..."
          overlayVariant="dark-center"
          particleCount={28}
        />
      </div>

      <div data-section="2">
        <SceneSection
          image="/images/landing/fae_glide.png"
          alt="Fae gliding through the night sky"
          text="Every choice leads somewhere new."
          overlayVariant="dark-center"
          particleCount={22}
        />
      </div>

      <div data-section="3">
        <SceneSection
          image="/images/landing/fae_arrive.png"
          alt="Fae arriving at a golden archway"
          text="The destination draws near..."
          overlayVariant="dark-bottom"
          particleCount={30}
          textPosition="bottom"
        />
      </div>

      <div data-section="4"><EndingSection onEnterApp={goToApp} /></div>

      <Footer />
    </div>
  )
}
