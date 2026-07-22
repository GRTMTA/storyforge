/**
 * Scribis — Cinematic landing page
 *
 * Layout architecture:
 *  § 1  Hero              — full-screen, loads instantly, text animates in
 *  § 2  Problem           — normal scroll section, dark BG, large text
 *  § 3  Solution          — normal scroll section
 *  § 4  Features          — 3-card grid, each card staggers in
 *  § 5  Narrative journey — ONE pinned section; GSAP scrub crossfades the 5
 *                           fantasy images inside it as user scrolls through
 *                           500vh of scroll space
 *  § 6  Final CTA         — normal scroll section over gate.png
 *  § 7  Footer
 *
 * GSAP rules used:
 *  - pin:true on the narrative container so it stays visible while
 *    the inner slides crossfade
 *  - scrub:1 on every timeline so position catches up smoothly
 *  - Individual section ScrollTriggers (trigger = section element, not document)
 *    for the non-pinned text-reveal sections
 *  - NO vh-string math — all positions are expressed relative to the trigger
 *    element using "top top" / "bottom bottom" / "+=Xpx" notation
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BookOpen, GitBranch, Wand2, Bookmark } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

// ─── Asset paths ───────────────────────────────────────────────────────────────
const IMGS = {
  book:    '/images/landing/book.png',
  rise:    '/images/landing/fae_rise.png',
  glide:   '/images/landing/fae_glide.png',
  arrive:  '/images/landing/fae_arrive.png',
  gate:    '/images/landing/gate.png',
} as const

// ─── Narrative slides (used inside the pinned journey section) ─────────────────
const SLIDES = [
  { img: IMGS.book,   line: 'Every story begins with a single page.' },
  { img: IMGS.rise,   line: 'The spark of creation...'               },
  { img: IMGS.glide,  line: 'Every choice leads somewhere new.'      },
  { img: IMGS.arrive, line: 'The destination draws near...'          },
  { img: IMGS.gate,   line: 'The gate stands open.'                  },
] as const

// ─── Particles (pure CSS, deterministic) ──────────────────────────────────────
interface Pt { id:number; x:number; y:number; sz:number; dur:number; del:number; gold:boolean }
const mkPts = (n:number): Pt[] => Array.from({length:n},(_,i)=>({
  id:i, x:(i*137.5+17)%100, y:(i*97.3+11)%100,
  sz:1.2+(i%5)*0.55, dur:3.5+(i%7)*0.6, del:(i%9)*0.55, gold:i%3!==0,
}))

function Particles({ n }: { n: number }) {
  const [pts] = useState(() => mkPts(n))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map(p=>(
        <span key={p.id} className="absolute rounded-full"
          style={{left:`${p.x}%`,top:`${p.y}%`,width:p.sz,height:p.sz,
            background:p.gold?'#F5A623':'#c4b5fd', opacity:0,
            animation:`lp-spark ${p.dur}s ${p.del}s ease-in-out infinite`}}/>
      ))}
    </div>
  )
}

// ─── Shared overlay gradients ──────────────────────────────────────────────────
const OVL = {
  book:   'linear-gradient(180deg,rgba(4,4,12,.75) 0%,rgba(8,6,18,.28) 55%,rgba(4,4,12,.88) 100%)',
  dark:   'linear-gradient(180deg,rgba(4,4,12,.82) 0%,rgba(10,8,24,.55) 55%,rgba(4,4,12,.92) 100%)',
  gate:   'linear-gradient(180deg,rgba(4,4,12,.70) 0%,rgba(10,8,28,.20) 48%,rgba(4,4,12,.82) 100%)',
}

// ─── Inline style helpers ──────────────────────────────────────────────────────
const bgCover = (img:string, overlay:string):React.CSSProperties => ({
  backgroundImage:`${overlay}, url(${img})`,
  backgroundSize:'cover',
  backgroundPosition:'center',
  backgroundRepeat:'no-repeat',
})

// ─── Typography constants ──────────────────────────────────────────────────────
const F = {
  serif:  "'Playfair Display', serif",
  sans:   "'Inter', sans-serif",
  heroH:  'clamp(3rem, 7vw, 6rem)',
  sectionH: 'clamp(2.4rem, 5.5vw, 4.8rem)',
  slideH: 'clamp(1.8rem, 4vw, 3.4rem)',
  body:   'clamp(1.05rem, 1.9vw, 1.25rem)',
  eyebrow:'clamp(0.7rem, 1.2vw, 0.8rem)',
}

// ══════════════════════════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════════════════════════
function Header({ onEnterApp }: { onEnterApp:()=>void }) {
  const [solid, setSolid] = useState(false)
  useEffect(()=>{
    const h = ()=>setSolid(window.scrollY>60)
    window.addEventListener('scroll',h,{passive:true})
    return ()=>window.removeEventListener('scroll',h)
  },[])
  return (
    <header className="fixed inset-x-0 top-0 z-[500] flex items-center justify-between px-6 md:px-14 py-[18px]"
      style={{
        background:solid?'rgba(6,6,16,0.88)':'transparent',
        backdropFilter:solid?'blur(16px)':'none',
        borderBottom:solid?'1px solid rgba(245,166,35,0.10)':'1px solid transparent',
        transition:'background .4s,border-color .4s',
      }}>
      <div className="flex items-center gap-2.5 select-none">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{background:'rgba(245,166,35,0.12)',border:'1px solid rgba(245,166,35,0.28)'}}>
          <BookOpen className="w-4 h-4 text-[#F5A623]" />
        </div>
        <span className="text-white font-bold text-[1.1rem] tracking-wide" style={{fontFamily:F.serif}}>Scribis</span>
      </div>
      <button onClick={onEnterApp}
        className="text-sm font-medium cursor-pointer"
        style={{color:'rgba(255,255,255,.68)',border:'1px solid rgba(255,255,255,.18)',
          borderRadius:999,padding:'8px 22px',fontFamily:F.sans,
          transition:'color .2s,border-color .2s',background:'transparent'}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#F5A623';(e.currentTarget as HTMLElement).style.borderColor='rgba(245,166,35,.5)'}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,.68)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.18)'}}>
        Open App →
      </button>
    </header>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR (top edge)
// ══════════════════════════════════════════════════════════════════════════════
function ProgressBar() {
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const onScroll=()=>{
      if(!barRef.current)return
      const pct=window.scrollY/(document.body.scrollHeight-window.innerHeight)*100
      barRef.current.style.width=`${pct}%`
    }
    window.addEventListener('scroll',onScroll,{passive:true})
    return ()=>window.removeEventListener('scroll',onScroll)
  },[])
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[600]" style={{background:'rgba(255,255,255,.06)'}}>
      <div ref={barRef} className="h-full" style={{width:'0%',background:'linear-gradient(90deg,#F5A623,#F7C05A)',transition:'width .05s linear'}}/>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CTA BUTTON
// ══════════════════════════════════════════════════════════════════════════════
function CtaButton({ onClick, children, large }: { onClick:()=>void; children:React.ReactNode; large?:boolean }) {
  return (
    <button onClick={onClick} className="cursor-pointer font-bold"
      style={{
        padding: large?'16px 44px':'14px 36px',
        borderRadius:999, background:'#F5A623', color:'#0f0f22',
        fontFamily:F.sans, fontSize: large?17:15, border:'none',
        animation:'lp-pulse 2.8s ease-in-out infinite',
        transition:'background .2s,transform .15s',
      }}
      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#F7C05A'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='#F5A623'}}>
      {children}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// § 1  HERO
// ══════════════════════════════════════════════════════════════════════════════
function Hero({ onEnterApp }: { onEnterApp:()=>void }) {
  const heroRef = useRef<HTMLElement>(null)
  useEffect(()=>{
    if(!heroRef.current)return
    const els = heroRef.current.querySelectorAll('.hl')
    gsap.fromTo(els,{opacity:0,y:44},{opacity:1,y:0,duration:1.1,ease:'power3.out',stagger:.18,delay:.2})
  },[])
  return (
    <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden"
      style={bgCover(IMGS.book, OVL.book)}>
      {/* extra radial vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{background:'radial-gradient(ellipse 85% 85% at 50% 50%,transparent 35%,rgba(4,4,12,.6) 100%)',zIndex:1}}/>
      <Particles n={38}/>
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
        <p className="hl mb-5 font-medium tracking-[.28em] uppercase"
          style={{fontFamily:F.sans,fontSize:F.eyebrow,color:'rgba(245,166,35,.82)',opacity:0}}>
          AI-powered interactive storytelling
        </p>
        <h1 className="hl font-bold leading-[1.04] mb-6"
          style={{fontFamily:F.serif,fontSize:F.heroH,
            textShadow:'0 3px 48px rgba(0,0,0,.95)',color:'#fff',opacity:0}}>
          Every story begins<br/>
          <em style={{color:'#F5A623',fontStyle:'italic'}}>with a single page.</em>
        </h1>
        <p className="hl mb-10 leading-relaxed"
          style={{fontFamily:F.sans,fontSize:F.body,color:'rgba(255,255,255,.62)',maxWidth:520,opacity:0}}>
          Write, branch, and explore — co-authored by AI, shaped entirely by you.
        </p>
        <div className="hl flex flex-wrap items-center justify-center gap-4" style={{opacity:0}}>
          <CtaButton onClick={onEnterApp} large>Begin Your Story</CtaButton>
          <button onClick={onEnterApp}
            style={{background:'transparent',border:'none',fontFamily:F.sans,fontSize:14,
              color:'rgba(255,255,255,.5)',cursor:'pointer',textDecoration:'underline',
              textUnderlineOffset:4,textDecorationColor:'rgba(255,255,255,.22)'}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#fff'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,.5)'}>
            Sign in →
          </button>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// § 2  PROBLEM
// ══════════════════════════════════════════════════════════════════════════════
function Problem() {
  const secRef = useRef<HTMLElement>(null)
  useEffect(()=>{
    if(!secRef.current)return
    const els=secRef.current.querySelectorAll('.reveal')
    gsap.fromTo(els,{opacity:0,y:50},{opacity:1,y:0,duration:.9,ease:'power3.out',stagger:.14,
      scrollTrigger:{trigger:secRef.current,start:'top 75%',toggleActions:'play none none reverse'}})
  },[])
  return (
    <section ref={secRef} className="relative py-32 md:py-44 flex items-center justify-center overflow-hidden"
      style={{background:'linear-gradient(180deg,#06060f 0%,#0d0d22 50%,#06060f 100%)'}}>
      <Particles n={18}/>
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p className="reveal mb-6 font-medium tracking-[.28em] uppercase"
          style={{fontFamily:F.sans,fontSize:F.eyebrow,color:'rgba(245,166,35,.75)',opacity:0}}>
          The challenge
        </p>
        <h2 className="reveal font-bold leading-[1.08] mb-8"
          style={{fontFamily:F.serif,fontSize:F.sectionH,color:'#fff',
            textShadow:'0 2px 32px rgba(0,0,0,.8)',opacity:0}}>
          Stories are hard to write.<br/>
          <em style={{color:'rgba(245,166,35,.9)',fontStyle:'italic'}}>
            Branching stories are even harder.
          </em>
        </h2>
        <p className="reveal leading-relaxed mx-auto"
          style={{fontFamily:F.sans,fontSize:F.body,color:'rgba(255,255,255,.55)',maxWidth:580,opacity:0}}>
          Every choice your character makes should lead somewhere meaningful. Tracking threads,
          keeping characters consistent, making it all hang together — it's exhausting before you've
          written a single scene.
        </p>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// § 3  SOLUTION
// ══════════════════════════════════════════════════════════════════════════════
function Solution() {
  const secRef = useRef<HTMLElement>(null)
  useEffect(()=>{
    if(!secRef.current)return
    const els=secRef.current.querySelectorAll('.reveal')
    gsap.fromTo(els,{opacity:0,y:50},{opacity:1,y:0,duration:.9,ease:'power3.out',stagger:.14,
      scrollTrigger:{trigger:secRef.current,start:'top 75%',toggleActions:'play none none reverse'}})
  },[])
  return (
    <section ref={secRef} className="relative py-32 md:py-44 flex items-center justify-center overflow-hidden"
      style={{background:'linear-gradient(180deg,#06060f 0%,#080818 100%)'}}>
      <Particles n={22}/>
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p className="reveal mb-6 font-medium tracking-[.28em] uppercase"
          style={{fontFamily:F.sans,fontSize:F.eyebrow,color:'rgba(245,166,35,.75)',opacity:0}}>
          The solution
        </p>
        <h2 className="reveal font-bold leading-[1.08] mb-8"
          style={{fontFamily:F.serif,fontSize:F.sectionH,color:'#fff',
            textShadow:'0 2px 32px rgba(0,0,0,.8)',opacity:0}}>
          Scribis is the AI forge<br/>
          <em style={{color:'rgba(245,166,35,.9)',fontStyle:'italic'}}>
            for interactive narratives.
          </em>
        </h2>
        <p className="reveal leading-relaxed mx-auto"
          style={{fontFamily:F.sans,fontSize:F.body,color:'rgba(255,255,255,.55)',maxWidth:560,opacity:0}}>
          Describe a world. Add characters with real motivations. Then play — choosing what happens
          next while the AI keeps everything coherent, surprising, and alive.
        </p>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// § 4  FEATURES
// ══════════════════════════════════════════════════════════════════════════════
const FEATURES = [
  { icon: GitBranch, title:'Branching Narratives',
    body:'Every choice forks the story. Revisit any savepoint and explore the road not taken.' },
  { icon: Wand2,     title:'AI Scene Generation',
    body:'Characters, dialogue, and consequences written in seconds — in your voice, your world.' },
  { icon: Bookmark,  title:'Save & Revisit',
    body:'Bookmark any moment. Branch from any scene. Your entire story tree, always at hand.' },
] as const

function Features() {
  const secRef = useRef<HTMLElement>(null)
  useEffect(()=>{
    if(!secRef.current)return
    const cards=secRef.current.querySelectorAll('.feat-card')
    gsap.fromTo(cards,{opacity:0,y:60},{opacity:1,y:0,duration:.8,ease:'power3.out',stagger:.16,
      scrollTrigger:{trigger:secRef.current,start:'top 70%',toggleActions:'play none none reverse'}})
    const heading=secRef.current.querySelectorAll('.feat-head')
    gsap.fromTo(heading,{opacity:0,y:36},{opacity:1,y:0,duration:.8,ease:'power3.out',stagger:.12,
      scrollTrigger:{trigger:secRef.current,start:'top 78%',toggleActions:'play none none reverse'}})
  },[])
  return (
    <section ref={secRef}
      style={{background:'linear-gradient(180deg,#06060f 0%,#0c0c1e 50%,#06060f 100%)',
        padding:'clamp(4rem,8vw,7rem) 24px'}}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <p className="feat-head mb-5 font-medium tracking-[.28em] uppercase"
            style={{fontFamily:F.sans,fontSize:F.eyebrow,color:'rgba(245,166,35,.75)',opacity:0}}>
            What Scribis does
          </p>
          <h2 className="feat-head font-bold leading-[1.08]"
            style={{fontFamily:F.serif,fontSize:F.sectionH,color:'#fff',
              textShadow:'0 2px 28px rgba(0,0,0,.8)',opacity:0}}>
            Built for stories that<br/>
            <em style={{color:'#F5A623',fontStyle:'italic'}}>breathe and branch.</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {FEATURES.map(({icon:Icon,title,body})=>(
            <div key={title} className="feat-card rounded-2xl p-8 md:p-10 flex flex-col gap-5"
              style={{background:'rgba(255,255,255,.036)',border:'1px solid rgba(245,166,35,.14)',
                opacity:0,backdropFilter:'blur(6px)'}}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{background:'rgba(245,166,35,.12)',border:'1px solid rgba(245,166,35,.25)'}}>
                <Icon className="w-5 h-5 text-[#F5A623]" />
              </div>
              <h3 className="font-bold" style={{fontFamily:F.serif,fontSize:'clamp(1.25rem,2.2vw,1.55rem)',color:'#fff'}}>
                {title}
              </h3>
              <p className="leading-relaxed" style={{fontFamily:F.sans,fontSize:'clamp(.95rem,1.6vw,1.05rem)',color:'rgba(255,255,255,.52)'}}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// § 5  NARRATIVE JOURNEY  (pinned crossfade)
// ══════════════════════════════════════════════════════════════════════════════
function NarrativeJourney() {
  const pinWrap  = useRef<HTMLDivElement>(null)   // the pinned viewport
  const slidesEl = useRef<(HTMLDivElement|null)[]>([])
  const textEls  = useRef<(HTMLDivElement|null)[]>([])

  useEffect(()=>{
    const pin = pinWrap.current
    if(!pin) return

    // Total scroll distance = number of transitions × 200vh
    // (SLIDES.length - 1 transitions)
    const scrollDist = (SLIDES.length - 1) * 200  // in percent of vh: 800vh total

    // Pin the wrapper for scrollDist worth of scrolling
    const pinST = ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end:   `+=${scrollDist}vh`,
      pin:   true,
      pinSpacing: true,
      anticipatePin: 1,
    })

    // For each transition i→i+1: crossfade slide[i] out, slide[i+1] in
    const transitions: ScrollTrigger[] = []
    for(let i = 0; i < SLIDES.length - 1; i++) {
      const startOffset = i * 200         // vh offset from pin start
      const endOffset   = startOffset + 200

      // Create a timeline for this crossfade
      const tl = gsap.timeline({ paused: true })

      // Outgoing: fade image out + text up
      tl.to(slidesEl.current[i],   { opacity: 0, duration: .5, ease:'power2.inOut' }, 0)
      tl.to(textEls.current[i],    { opacity: 0, y: -30, duration: .4, ease:'power2.in' }, 0)

      // Incoming: fade image in + text slides up from below
      tl.fromTo(slidesEl.current[i+1],
        { opacity: 0 },
        { opacity: 1, duration: .6, ease:'power2.out' }, .3)
      tl.fromTo(textEls.current[i+1],
        { opacity: 0, y: 44 },
        { opacity: 1, y: 0, duration: .65, ease:'power3.out' }, .4)

      const st = ScrollTrigger.create({
        trigger: pin,
        start:   `top+=${startOffset}vh top`,
        end:     `top+=${endOffset}vh top`,
        scrub:   1,
        animation: tl,
      })
      transitions.push(st)
    }

    // Animate first slide text in on pin enter
    if(textEls.current[0]) {
      gsap.fromTo(textEls.current[0].querySelectorAll('.sline'),
        {opacity:0,y:40},{opacity:1,y:0,duration:.9,ease:'power3.out',stagger:.14,
          scrollTrigger:{trigger:pin,start:'top 80%',toggleActions:'play none none reverse'}})
    }

    return ()=>{
      pinST.kill()
      transitions.forEach(t=>t.kill())
    }
  },[])

  return (
    /* The scroll-track wrapper — pinSpacing adds the extra height GSAP needs */
    <div ref={pinWrap} className="relative overflow-hidden" style={{height:'100vh'}}>
      {SLIDES.map((s, i)=>(
        <div key={i}
          ref={el=>{ slidesEl.current[i]=el }}
          className="absolute inset-0"
          style={{
            ...bgCover(s.img, i===0 ? OVL.book : OVL.dark),
            opacity: i === 0 ? 1 : 0,   // first slide visible, rest hidden
            zIndex: SLIDES.length - i,   // first slide on top initially
          }}>
          {/* extra vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{background:'radial-gradient(ellipse 90% 90% at 50% 50%,transparent 30%,rgba(4,4,12,.55) 100%)',zIndex:1}}/>
          <Particles n={i===4?50:24}/>

          {/* Text */}
          <div ref={el=>{ textEls.current[i]=el }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
            style={{zIndex:10, opacity: i === 0 ? 0 : 0 /* GSAP controls all */}}>
            <p className="sline font-bold italic"
              style={{fontFamily:F.serif,fontSize:F.slideH,color:'#fff',
                textShadow:'0 3px 48px rgba(0,0,0,.95)',maxWidth:700,lineHeight:1.12,
                letterSpacing:'-.01em'}}>
              {s.line}
            </p>
            <div className="sline mt-6 mx-auto h-[1px]"
              style={{width:'48%',background:'linear-gradient(90deg,transparent,rgba(245,166,35,.55),transparent)'}}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// § 6  FINAL CTA
// ══════════════════════════════════════════════════════════════════════════════
function FinalCTA({ onEnterApp }: { onEnterApp:()=>void }) {
  const secRef = useRef<HTMLElement>(null)
  useEffect(()=>{
    if(!secRef.current)return
    const els=secRef.current.querySelectorAll('.reveal')
    gsap.fromTo(els,{opacity:0,y:50},{opacity:1,y:0,duration:.9,ease:'power3.out',stagger:.14,
      scrollTrigger:{trigger:secRef.current,start:'top 72%',toggleActions:'play none none reverse'}})
  },[])
  return (
    <section ref={secRef} className="relative h-screen flex items-center justify-center overflow-hidden"
      style={bgCover(IMGS.gate, OVL.gate)}>
      {/* golden glow at gate position */}
      <div className="absolute inset-0 pointer-events-none"
        style={{background:'radial-gradient(ellipse 50% 62% at 50% 44%,rgba(245,166,35,.08) 0%,transparent 70%)',zIndex:1}}/>
      <Particles n={50}/>
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
        <p className="reveal mb-5 font-medium tracking-[.28em] uppercase"
          style={{fontFamily:F.sans,fontSize:F.eyebrow,color:'rgba(245,166,35,.78)',opacity:0}}>
          The beginning awaits
        </p>
        <h2 className="reveal font-bold leading-[1.07] mb-6"
          style={{fontFamily:F.serif,fontSize:F.sectionH,color:'#fff',
            textShadow:'0 3px 52px rgba(0,0,0,.95)',opacity:0}}>
          Your story<br/>
          <em style={{color:'#F5A623',fontStyle:'italic'}}>starts here.</em>
        </h2>
        <p className="reveal leading-relaxed mx-auto mb-10"
          style={{fontFamily:F.sans,fontSize:F.body,color:'rgba(255,255,255,.52)',maxWidth:480,opacity:0}}>
          Step through the gate. Every choice you make writes the next chapter.
        </p>
        <div className="reveal flex flex-wrap items-center justify-center gap-4" style={{opacity:0}}>
          <CtaButton onClick={onEnterApp} large>Start Writing Free</CtaButton>
          <button onClick={onEnterApp}
            style={{padding:'14px 28px',borderRadius:999,background:'transparent',
              border:'1px solid rgba(255,255,255,.20)',fontFamily:F.sans,fontSize:14,
              color:'rgba(255,255,255,.52)',cursor:'pointer',transition:'color .2s,border-color .2s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#fff';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.5)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,.52)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.20)'}}>
            Sign in →
          </button>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// § 7  FOOTER
// ══════════════════════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer className="flex flex-col md:flex-row items-center justify-between gap-5 px-8 md:px-14 py-9"
      style={{background:'#040408',borderTop:'1px solid rgba(255,255,255,.055)'}}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{background:'rgba(245,166,35,.10)',border:'1px solid rgba(245,166,35,.22)'}}>
          <BookOpen className="w-3.5 h-3.5 text-[#F5A623]"/>
        </div>
        <span className="font-semibold text-base"
          style={{color:'rgba(255,255,255,.6)',fontFamily:F.serif}}>Scribis</span>
      </div>
      <p style={{color:'rgba(255,255,255,.2)',fontSize:13,fontFamily:F.sans}}>Co-write your world with AI.</p>
      <nav className="flex gap-6">
        {['Privacy','Terms','Contact'].map(l=>(
          <a key={l} href="#" style={{color:'rgba(255,255,255,.24)',fontSize:13,fontFamily:F.sans,transition:'color .2s'}}
            onMouseEnter={e=>((e.target as HTMLAnchorElement).style.color='rgba(255,255,255,.65)')}
            onMouseLeave={e=>((e.target as HTMLAnchorElement).style.color='rgba(255,255,255,.24)')}>
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
  const navigate = useNavigate()
  const goToApp  = () => navigate('/app')

  useEffect(()=>{
    // Ensure no browser smooth-scroll fighting GSAP
    document.documentElement.style.scrollBehavior = 'auto'
    return ()=>{ document.documentElement.style.scrollBehavior = '' }
  },[])

  return (
    <>
      <style>{`
        @keyframes lp-spark {
          0%   { transform:translateY(0) scale(.7); opacity:0; }
          40%  { opacity:.88; }
          100% { transform:translateY(-34px) scale(1.15); opacity:0; }
        }
        @keyframes lp-pulse {
          0%,100% { box-shadow:0 0 20px 3px rgba(245,166,35,.35); }
          50%      { box-shadow:0 0 44px 10px rgba(245,166,35,.65); }
        }
      `}</style>

      <div style={{background:'#06060f',color:'#fff',overflowX:'hidden'}}>
        <ProgressBar/>
        <Header onEnterApp={goToApp}/>
        <Hero        onEnterApp={goToApp}/>
        <Problem/>
        <Solution/>
        <Features/>
        <NarrativeJourney/>
        <FinalCTA    onEnterApp={goToApp}/>
        <Footer/>
      </div>
    </>
  )
}
