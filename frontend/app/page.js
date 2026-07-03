'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Sparkles,
  Trophy,
  Users,
  Timer,
  Rocket,
  Coins,
  ShieldCheck,
  Wallet,
  Radio,
  Scan,
  ArrowRight,
  Copy,
  Check,
  Flame,
  Target,
  Lock,
  X,
  ExternalLink,
  Zap as ZapIcon,
} from 'lucide-react'

// ---------- Helpers ----------
function shortAddr(a) {
  if (!a) return ''
  return a.slice(0, 4) + '…' + a.slice(-4)
}
function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US')
}
function fmtMs(ms) {
  if (ms < 0) ms = 0
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

// ---------- Neon background ----------
function NeonBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(251,191,36,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
      <motion.div
        className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-3xl"
        animate={{ opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 -right-32 h-[460px] w-[460px] rounded-full bg-cyan-500/18 blur-3xl"
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </div>
  )
}

// ---------- Header ----------
function Header({ state }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (typeof navigator === 'undefined' || !state?.mint) return
    navigator.clipboard?.writeText(state.mint).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }
  const running = state?.systemStatus === 'running'
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/40 bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 shadow-[0_0_24px_rgba(6,182,212,0.55)]">
            <Zap className="h-4 w-4 text-cyan-200" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-black tracking-tight text-white sm:text-lg">
              ANS<span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">DROP</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-cyan-300/70 sm:text-[10px]">
              auto raffle • $ANSEM
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest sm:text-xs ${running ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/50'}`}>
            <span className="relative flex h-1.5 w-1.5">
              {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-white/40'}`}></span>
            </span>
            {running ? 'Live' : 'Offline'}
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 sm:block">
            Round <span className="font-mono text-white">#{state?.roundNumber ?? '—'}</span>
          </div>
          <button
            onClick={copy}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white md:flex"
            title="Copy $ANSEM mint"
          >
            <span className="font-mono text-cyan-300">{shortAddr(state?.mint) || '—'}</span>
            {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </header>
  )
}

// ---------- Hero Countdown ----------
function HeroCountdown({ msLeft, intervalMs, phase, systemStatus }) {
  const pct = intervalMs > 0 ? Math.max(0, Math.min(1, msLeft / intervalMs)) : 0
  const urgent = msLeft < 10000 && phase === 'countdown'
  const running = phase !== 'countdown'
  const notStarted = systemStatus !== 'running'

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 backdrop-blur-md sm:p-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.10),transparent_70%)]" />
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-200 sm:text-xs">
          <Sparkles className="h-3 w-3" /> automated on-chain raffle
        </div>
        <h1 className="max-w-2xl text-balance text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
          Every 120 seconds,{' '}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
            one $ANSEM holder
          </span>{' '}
          gets a multiplier-locked airdrop.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
          No wallet connect. No buttons. Hold at least{' '}
          <span className="font-mono text-white">50,000&nbsp;$ANSEM</span>, sit back, and watch
          the AI raffle scan every eligible wallet—then a random multiplier locks in the reward.
        </p>

        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50 sm:text-xs">
            <Timer className="h-3 w-3" />
            {notStarted ? (
              <span className="text-amber-300">system offline</span>
            ) : running ? (
              <span className="text-fuchsia-300">raffle in progress</span>
            ) : (
              <>next raffle in</>
            )}
          </div>
          <motion.div
            key={notStarted ? 'stopped' : running ? 'run' : Math.floor(msLeft / 1000)}
            initial={{ scale: 0.98, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`font-mono font-black leading-none tracking-tight ${
              notStarted
                ? 'text-[42px] sm:text-[76px] md:text-[96px] bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent'
                : `text-[64px] sm:text-[104px] md:text-[128px] ${
                    running
                      ? 'bg-gradient-to-b from-fuchsia-200 to-fuchsia-500 bg-clip-text text-transparent'
                      : urgent
                      ? 'bg-gradient-to-b from-rose-200 to-rose-500 bg-clip-text text-transparent'
                      : 'bg-gradient-to-b from-white to-cyan-300 bg-clip-text text-transparent'
                  }`
            }`}
            style={{
              WebkitTextStroke: '1px rgba(255,255,255,0.05)',
              filter: urgent
                ? 'drop-shadow(0 0 24px rgba(244,63,94,0.4))'
                : notStarted
                ? 'drop-shadow(0 0 22px rgba(251,191,36,0.4))'
                : 'drop-shadow(0 0 22px rgba(6,182,212,0.35))',
            }}
          >
            {notStarted ? 'NOT STARTED YET' : running ? 'LIVE' : fmtMs(msLeft)}
          </motion.div>
          {!notStarted && (
            <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400"
                animate={{ width: running ? '100%' : `${(1 - pct) * 100}%` }}
                transition={{ ease: 'linear', duration: 0.4 }}
              />
            </div>
          )}
          {notStarted && (
            <div className="mt-3 max-w-md text-xs text-white/50">
              The raffle system is currently offline. Please wait for the team to start the next round.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Compact stat pill ----------
function StatPill({ icon: Icon, label, value, sub, tone = 'cyan' }) {
  const tones = {
    cyan: 'border-cyan-400/25 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.12)]',
    fuchsia: 'border-fuchsia-400/25 text-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.12)]',
    amber: 'border-amber-400/25 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.12)]',
    emerald: 'border-emerald-400/25 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
  }
  return (
    <div className={`rounded-2xl border bg-white/[0.03] p-3 backdrop-blur-md sm:p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] sm:text-[10px]">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 font-mono text-lg font-black text-white sm:text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-white/45 sm:text-[11px]">{sub}</div>}
    </div>
  )
}

// ---------- PAID / PENDING badge ----------
function PaidBadge({ paid, txHash, compact = false }) {
  if (paid) {
    const solscan = txHash ? `https://solscan.io/tx/${txHash}` : null
    const inner = (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 font-semibold uppercase tracking-widest text-emerald-300 ${
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
        }`}
      >
        <Check className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> Paid
      </span>
    )
    return solscan ? (
      <a href={solscan} target="_blank" rel="noreferrer" title="View tx on Solscan" className="hover:opacity-80">
        {inner}
      </a>
    ) : (
      inner
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 font-semibold uppercase tracking-widest text-amber-300 ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
      </span>
      Pending
    </span>
  )
}

// ---------- Unified STAGE (AI Raffle → 3,2,1 → Crash Game) ----------
// Phases: idle | scan | lock | pre | ascend
function Stage({ phase, winner, lastWinner, holders, onFinish }) {
  const [scanIdx, setScanIdx] = useState(0)
  const [preCount, setPreCount] = useState(3)
  const [mult, setMult] = useState(1.0)
  const [pathPts, setPathPts] = useState([])
  const [crashedShown, setCrashedShown] = useState(false)
  const rafRef = useRef(null)
  const startRef = useRef(0)

  // --- SCAN phase: cycle addresses
  useEffect(() => {
    if (phase !== 'scan') return
    setScanIdx(0)
    const iv = setInterval(
      () => setScanIdx((i) => (i + 1) % Math.max(holders.length, 1)),
      90
    )
    return () => clearInterval(iv)
  }, [phase, holders.length])

  // --- PRE phase: 3 → 2 → 1
  useEffect(() => {
    if (phase !== 'pre') return
    setPreCount(3)
    const t1 = setTimeout(() => setPreCount(2), 1200)
    const t2 = setTimeout(() => setPreCount(1), 2400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [phase])

  // --- ASCEND phase: multiplier ramp
  useEffect(() => {
    if (phase !== 'ascend') return
    if (!winner) return
    const cp = winner.crashPoint
    setMult(1.0)
    setPathPts([])
    setCrashedShown(false)
    startRef.current = performance.now()
    const k = Math.log(2) / 2.6 // 2x every ~2.6s (slower, more dramatic)
    const tick = (now) => {
      const t = (now - startRef.current) / 1000
      const current = Math.exp(k * t)
      if (current >= cp) {
        setMult(cp)
        setPathPts((prev) => [...prev, { t, m: cp }])
        setCrashedShown(true)
        setTimeout(() => onFinish && onFinish(), 3500)
        return
      }
      setMult(current)
      setPathPts((prev) => {
        if (prev.length === 0 || t - prev[prev.length - 1].t > 0.03) {
          const next = [...prev, { t, m: current }]
          if (next.length > 500) next.shift()
          return next
        }
        return prev
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, winner?.crashPoint])

  // scanner visible list
  const visible = useMemo(() => {
    if (holders.length === 0) return []
    const out = []
    for (let i = -3; i <= 3; i++) {
      const idx = ((scanIdx + i) % holders.length + holders.length) % holders.length
      out.push({ addr: holders[idx], off: i })
    }
    return out
  }, [scanIdx, holders])

  // crash path svg
  const W = 800
  const H = 340
  const cp = winner?.crashPoint || 1.5
  const totalDur = Math.max(0.6, Math.log(Math.max(cp, 1.05)) / (Math.log(2) / 1.4))
  const maxM = Math.max(cp, 1.2)
  const pts = pathPts.map((p) => {
    const x = (p.t / totalDur) * W
    const y = H - Math.min(1, Math.log(p.m) / Math.log(maxM)) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const pathStr = pts.length > 0 ? `M0,${H} L${pts.join(' L')}` : `M0,${H}`
  const last = pathPts[pathPts.length - 1]
  const rocketX = last ? (last.t / totalDur) * W : 0
  const rocketY = last ? H - Math.min(1, Math.log(last.m) / Math.log(maxM)) * H : H

  const tokensNow = Math.floor((winner?.baseReward || 5000) * mult)
  const isRunning = phase !== 'idle'

  const phaseLabel = {
    idle: lastWinner ? `Round #${lastWinner.roundNumber} · Winner` : 'Standby',
    scan: 'Scanning eligible wallets…',
    lock: 'Target locked',
    pre: 'Multiplier launching…',
    ascend: 'Ascending',
  }[phase]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-black to-slate-950 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
      {/* grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px]" />

      {/* top bar */}
      <div className="relative flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70 sm:text-xs">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500/40 to-cyan-500/40">
            <Target className="h-3 w-3 text-white" />
          </div>
          Ansdrop Live Stage
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
          <span className={`inline-flex h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-fuchsia-400 animate-pulse' : 'bg-white/30'}`} />
          <Radio className="h-3 w-3" />
          {phaseLabel}
        </div>
      </div>

      {/* stage body */}
      <div className="relative h-[380px] w-full sm:h-[460px] md:h-[520px]">
        {/* IDLE — persistent last-winner card OR "waiting for first raffle" */}
        <AnimatePresence>
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center sm:px-6"
            >
              {lastWinner ? (
                <>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-300 sm:text-xs">
                    <Trophy className="h-3 w-3" /> round #{lastWinner.roundNumber} winner
                    <PaidBadge paid={lastWinner.paid} txHash={lastWinner.txHash} />
                  </div>
                  <div className="relative w-full max-w-3xl">
                    <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/[0.06] px-3 py-4 shadow-[0_0_50px_rgba(16,185,129,0.25)] sm:px-6 sm:py-5">
                      <div
                        className="whitespace-nowrap font-mono font-bold text-white"
                        style={{ fontSize: 'clamp(0.5rem, 2.1vw, 1.25rem)' }}
                      >
                        {lastWinner.address}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 font-mono text-sm font-bold text-amber-200">
                      {lastWinner.crashPoint.toFixed(2)}x
                    </span>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 font-mono text-sm font-bold text-emerald-200">
                      +{fmt(lastWinner.tokensWon)} $ANSEM
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"
                  >
                    <Sparkles className="h-6 w-6 text-cyan-300" />
                  </motion.div>
                  <div className="text-sm text-white/60">Waiting for first raffle…</div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SCAN */}
        <AnimatePresence>
          {phase === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {/* scan beam */}
              <motion.div
                className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 bg-gradient-to-b from-transparent via-fuchsia-500/25 to-transparent"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-fuchsia-400 shadow-[0_0_20px_2px_rgba(232,121,249,0.9)]" />

              {/* address stack — auto-scaling font, full width */}
              <div className="relative w-full px-4 sm:px-8">
                <div className="flex flex-col items-center gap-1">
                  {visible.map((v, i) => {
                    const center = v.off === 0
                    return (
                      <motion.div
                        key={`${scanIdx}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{
                          opacity: center ? 1 : 0.32 - Math.abs(v.off) * 0.06,
                          y: 0,
                        }}
                        transition={{ duration: 0.15 }}
                        className={`w-full whitespace-nowrap text-center font-mono tracking-tight ${
                          center
                            ? 'text-fuchsia-200 drop-shadow-[0_0_10px_rgba(232,121,249,0.7)]'
                            : 'text-white/50'
                        }`}
                        style={{ fontSize: 'clamp(0.5rem, 2.1vw, 1.25rem)' }}
                      >
                        {center ? '› ' : '  '}
                        {v.addr}
                        {center ? ' ‹' : ''}
                      </motion.div>
                    )
                  })}
                </div>
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
                  <Scan className="h-3 w-3" /> scanning {fmt(holders.length)} eligible wallets
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOCK: winner reveal */}
        <AnimatePresence>
          {phase === 'lock' && winner && (
            <motion.div
              key="lock"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
            >
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-fuchsia-300 sm:text-xs">
                <Target className="h-3 w-3" /> target locked
              </div>
              <div className="relative w-full max-w-3xl">
                <div className="rounded-2xl border border-fuchsia-400/50 bg-fuchsia-500/[0.08] px-3 py-5 shadow-[0_0_60px_rgba(217,70,239,0.4)] sm:px-6 sm:py-6">
                  <div
                    className="whitespace-nowrap font-mono font-bold text-white"
                    style={{ fontSize: 'clamp(0.5rem, 2.1vw, 1.25rem)' }}
                  >
                    {winner.address}
                  </div>
                  <div className="mt-2 text-[11px] text-white/60 sm:text-sm">
                    Balance: <span className="font-mono text-white">{fmt(winner.balance)}</span> $ANSEM
                  </div>
                </div>
                {/* particles */}
                {[...Array(20)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-fuchsia-300"
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos((i / 20) * Math.PI * 2) * 220,
                      y: Math.sin((i / 20) * Math.PI * 2) * 140,
                      opacity: 0,
                    }}
                    transition={{ duration: 1.3, ease: 'easeOut' }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRE COUNTDOWN 3 → 2 → 1 */}
        <AnimatePresence>
          {phase === 'pre' && (
            <motion.div
              key="pre"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            >
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-300 sm:text-xs">
                <Rocket className="h-3 w-3" /> multiplier launching in
              </div>
              <div className="relative flex h-40 w-40 items-center justify-center sm:h-56 sm:w-56">
                <motion.div
                  className="absolute inset-0 rounded-full border border-amber-400/40"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.1, 0.5] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full border border-amber-400/30"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  key={preCount}
                  initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 1.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 14 }}
                  className="font-mono text-[110px] font-black leading-none text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)] sm:text-[160px]"
                >
                  {preCount}
                </motion.div>
              </div>
              <div className="text-xs text-white/50">
                Winner: <span className="font-mono text-white">{shortAddr(winner?.address)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ASCEND + CRASHED */}
        {phase === 'ascend' && (
          <motion.div
            key="ascend"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <linearGradient id="gline" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="60%" stopColor="#e879f9" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="gfill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(232,121,249,0.35)" />
                  <stop offset="100%" stopColor="rgba(232,121,249,0)" />
                </linearGradient>
              </defs>
              <path
                d={`${pathStr} L${rocketX},${H} L0,${H} Z`}
                fill="url(#gfill)"
                opacity={crashedShown ? 0.3 : 0.7}
              />
              <path
                d={pathStr}
                fill="none"
                stroke="url(#gline)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="drop-shadow(0 0 8px rgba(232,121,249,0.7))"
              />
              {!crashedShown && (
                <g transform={`translate(${rocketX}, ${rocketY})`}>
                  <circle r="8" fill="#fbbf24" opacity="0.5" />
                  <circle r="3.5" fill="#fff" />
                </g>
              )}
            </svg>

            {/* live multiplier text */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={crashedShown ? { scale: [1, 1.18, 1], rotate: [0, -3, 3, 0] } : {}}
                transition={{ duration: 0.55 }}
                className={`font-mono font-black leading-none ${
                  crashedShown
                    ? 'text-rose-400 drop-shadow-[0_0_35px_rgba(244,63,94,0.9)]'
                    : 'text-white drop-shadow-[0_0_28px_rgba(251,191,36,0.75)]'
                }`}
                style={{ fontSize: 'clamp(3.5rem, 12vw, 8rem)' }}
              >
                {mult.toFixed(2)}x
              </motion.div>
            </div>

            {/* running rewards */}
            {!crashedShown && (
              <div className="absolute inset-x-0 bottom-4 text-center text-[11px] uppercase tracking-widest text-white/50">
                current reward:{' '}
                <span className="font-mono text-amber-300">{fmt(tokensNow)} $ANSEM</span>
              </div>
            )}

            {/* CRASHED overlay */}
            <AnimatePresence>
              {crashedShown && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-rose-900/25 backdrop-blur-[2px]"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="font-mono font-black tracking-widest text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.9)]"
                      style={{ fontSize: 'clamp(1.8rem, 6vw, 4rem)' }}
                    >
                      🎯 LOCKED @ {winner?.crashPoint.toFixed(2)}x
                    </motion.div>
                    <div className="mt-3 text-sm text-white/85 sm:text-lg">
                      Winner receives{' '}
                      <span className="font-mono font-bold text-amber-300">
                        {fmt(Math.floor((winner?.baseReward || 5000) * (winner?.crashPoint || 1)))} $ANSEM
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/50">
                      base {fmt(winner?.baseReward)} × {winner?.crashPoint.toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* REVEAL removed — idle phase now shows the last winner card persistently */}
      </div>
    </div>
  )
}

// ---------- How it works ----------
function HowItWorks() {
  const steps = [
    {
      icon: Wallet,
      title: 'Hold $ANSEM',
      body: 'Any wallet holding at least 50,000 $ANSEM is automatically eligible — no signup, no wallet connect.',
      tone: 'text-cyan-300 border-cyan-400/30',
    },
    {
      icon: Scan,
      title: 'AI Raffle Picks',
      body: 'Every 120 seconds the engine scans all eligible holders and locks one at random with a dramatic reveal.',
      tone: 'text-fuchsia-300 border-fuchsia-400/30',
    },
    {
      icon: Rocket,
      title: 'Multiplier Locks',
      body: 'A random multiplier launches from 1.00x, climbs, and locks the final reward at a random point.',
      tone: 'text-amber-300 border-amber-400/30',
    },
  ]
  return (
    <section className="mt-10 sm:mt-14">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50 sm:text-xs">
            How Ansdrop works
          </div>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
            Three steps, one winner, every 120 seconds.
          </h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`group rounded-2xl border bg-white/[0.03] p-5 backdrop-blur-md transition hover:bg-white/[0.06] ${s.tone}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
                Step {i + 1}
              </div>
            </div>
            <div className="mt-3 text-lg font-bold text-white">{s.title}</div>
            <div className="mt-1 text-sm leading-relaxed text-white/60">{s.body}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Recent winners ----------
function RecentWinners({ winners }) {
  return (
    <section className="mt-10 sm:mt-14">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50 sm:text-xs">
            Winners feed
          </div>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Recent winners</h2>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 sm:text-xs">
          latest {winners?.length || 0}
        </div>
      </div>
      {(!winners || winners.length === 0) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
          No winners yet. Waiting for the first round to resolve…
        </div>
      )}
      {winners?.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {winners.slice(0, 8).map((w) => (
            <div
              key={w.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-md transition hover:border-emerald-400/30"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 font-mono text-xs font-bold text-emerald-200">
                  #{w.roundNumber}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-sm font-semibold text-white truncate">
                      {shortAddr(w.address)}
                    </span>
                    <PaidBadge paid={w.paid} txHash={w.txHash} compact />
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    {new Date(w.endedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 font-mono text-sm font-bold text-amber-300">
                  <Flame className="h-3 w-3" />
                  {w.crashPoint.toFixed(2)}x
                </div>
                <div className="text-[11px] text-white/60">
                  +{fmt(w.tokensWon)} $ANSEM
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ---------- About / footer copy ----------
function About({ state }) {
  return (
    <section className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6 backdrop-blur-md sm:mt-16 sm:p-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300/80 sm:text-xs">
            About Ansdrop
          </div>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
            A community airdrop engine that never sleeps.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
            Ansdrop is a transparent, provably-random raffle for $ANSEM holders on Solana.
            The engine automatically fetches every eligible wallet, picks one at random
            every 120 seconds, and rolls a random multiplier to decide the reward.
            Winners are announced live — tokens are transferred manually by the team
            straight to the winning wallet.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
              No wallet connect
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
              No admin controls
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
              Community-first
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Total holders
            </div>
            <div className="mt-2 font-mono text-xl font-black text-white sm:text-2xl">
              {state ? fmt(state.totalHolders) : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Eligible
            </div>
            <div className="mt-2 font-mono text-xl font-black text-cyan-200 sm:text-2xl">
              {state ? fmt(state.eligibleCount) : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Base reward
            </div>
            <div className="mt-2 font-mono text-xl font-black text-amber-200 sm:text-2xl">
              {state ? fmt(state.baseReward) : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Interval
            </div>
            <div className="mt-2 font-mono text-xl font-black text-fuchsia-200 sm:text-2xl">
              {state ? `${Math.round((state.intervalMs || 60000) / 1000)}s` : '—'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------- Provably-Fair Badge ----------
function FairnessBadge({ state, recentWinners }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState('')
  const commit = state?.seedCommit
  const lastWinner = recentWinners?.[0]

  const copy = (val, tag) => {
    if (typeof navigator === 'undefined' || !val) return
    navigator.clipboard?.writeText(val).then(() => {
      setCopied(tag)
      setTimeout(() => setCopied(''), 1400)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/[0.06] via-cyan-500/[0.05] to-transparent px-4 py-3 text-left backdrop-blur-md transition hover:border-emerald-400/50 hover:bg-emerald-500/[0.10] sm:mt-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10">
            <Lock className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              fair multiplier
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-white/70 sm:text-xs">
              next commit&nbsp;
              <span className="text-emerald-200">
                {commit ? commit.slice(0, 10) + '…' + commit.slice(-8) : '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-300/70">
          how it works <ArrowRight className="h-3 w-3" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-slate-950 via-black to-slate-950 p-6 shadow-[0_0_80px_rgba(16,185,129,0.2)] sm:p-8"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-xl font-black tracking-tight text-white">
                    Fair Multiplier
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/70">
                <p>
                  The winner is drawn by a normal random raffle across every eligible
                  wallet, but the{' '}
                  <span className="font-semibold text-white">multiplier</span> that
                  decides how many $ANSEM they receive is the part that could be
                  abused if it were kept secret. Ansdrop makes the multiplier{' '}
                  <span className="font-semibold text-white">
                    provably fair
                  </span>{' '}
                  so nobody — not even the operator — can adjust it after the fact.
                </p>
                <p>
                  Before every round we generate a secret 256-bit random{' '}
                  <span className="font-semibold text-white">server seed</span> using
                  the operating system&apos;s cryptographic RNG, then publish only
                  its <span className="font-semibold text-white">SHA-256 hash</span>{' '}
                  as a public{' '}
                  <span className="font-mono text-emerald-300">commit</span>. When
                  the round ends the raw seed is{' '}
                  <span className="font-semibold text-white">revealed</span>, so
                  anyone can hash it and prove the multiplier was locked-in before
                  the winner was known.
                </p>

                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.04] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                    Multiplier formula
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] text-white/80 sm:text-xs">
{`SHA256(revealedSeed) === seedCommit                (integrity check)
h = SHA256(revealedSeed + ":crash:" + roundNumber)
r = int(h[0..15], 16) / 2^60                       (uniform in [0,1))
crashPoint = min( 0.99 / (1 - r * 0.99),  100 )    (capped at 100x)`}
                  </pre>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    Why the multiplier is fair
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                    <li>
                      The seed is committed <span className="font-semibold text-white">before</span> the round
                      ends — the operator can&apos;t swap it later without breaking
                      the SHA-256 hash.
                    </li>
                    <li>
                      The multiplier is a pure function of{' '}
                      <span className="font-mono text-emerald-200">seed + roundNumber</span>, so
                      the same inputs always yield the same crash point.
                    </li>
                    <li>
                      Distribution is uniform &amp; unbiased across{' '}
                      <span className="font-mono text-amber-300">1.00x – 100x</span> with a heavy
                      exponential tail (most rounds land 1x–3x, rare ones fly).
                    </li>
                    <li>
                      Winner selection uses a separate tag (
                      <span className="font-mono text-white/70">&quot;:winner:&quot;</span>) from the
                      same seed, so the two outcomes are independent.
                    </li>
                    <li>
                      Cap enforced server-side at{' '}
                      <span className="font-mono text-amber-300">100x</span> — no round can pay
                      out more than <span className="font-mono">baseReward × 100</span>.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    Current commit (next round)
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="break-all font-mono text-[11px] text-emerald-200 sm:text-xs">
                      {commit || '—'}
                    </div>
                    {commit && (
                      <button
                        onClick={() => copy(commit, 'commit')}
                        className="shrink-0 rounded p-1 text-white/50 hover:bg-white/5 hover:text-white"
                      >
                        {copied === 'commit' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {lastWinner?.revealedSeed && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                        Last verified round #{lastWinner.roundNumber}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-emerald-300">
                        crash{' '}
                        <span className="font-mono font-bold text-amber-300">
                          {lastWinner.crashPoint?.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-[11px] sm:text-xs">
                      <Row
                        label="commit"
                        value={lastWinner.seedCommit}
                        tag="lc"
                        copied={copied}
                        onCopy={copy}
                      />
                      <Row
                        label="revealed seed"
                        value={lastWinner.revealedSeed}
                        tag="lr"
                        copied={copied}
                        onCopy={copy}
                      />
                      <Row
                        label="winner"
                        value={lastWinner.address}
                        tag="lw"
                        copied={copied}
                        onCopy={copy}
                      />
                      <div className="flex items-center gap-2 pt-1 text-white/60">
                        <span className="text-white/40">payout</span>
                        <span className="font-mono font-bold text-emerald-200">
                          {fmt(lastWinner.tokensWon)} $ANSEM
                        </span>
                        <span className="text-white/30">•</span>
                        <span className="text-white/40">round #</span>
                        <span className="font-mono text-white">
                          {lastWinner.roundNumber}
                        </span>
                      </div>
                    </div>
                    <a
                      href="https://emn178.github.io/online-tools/sha256.html"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Verify SHA-256 yourself
                    </a>
                  </div>
                )}

                <div className="text-[11px] text-white/40">
                  Note: the raffle winner is picked with a standard random draw across
                  eligible holders — the provably-fair guarantee here specifically
                  protects the <span className="text-white/70">multiplier value</span>{' '}
                  so it can&apos;t be inflated or deflated for any winner.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Row({ label, value, tag, copied, onCopy }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-24 shrink-0 text-white/40">{label}</div>
      <div className="min-w-0 flex-1 break-all font-mono text-white/80">
        {value || '—'}
      </div>
      {value && (
        <button
          onClick={() => onCopy(value, tag)}
          className="shrink-0 rounded p-0.5 text-white/50 hover:bg-white/5 hover:text-white"
        >
          {copied === tag ? (
            <Check className="h-3 w-3 text-emerald-300" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  )
}

// ---------- Main page ----------
function App() {
  const [msLeft, setMsLeft] = useState(0)
  const [holdersPool, setHoldersPool] = useState([])
  const [phase, setPhase] = useState('countdown')
  // stage phase (local to Stage): idle | scan | lock | pre | ascend | reveal
  const [stagePhase, setStagePhase] = useState('idle')
  const [activeWinner, setActiveWinner] = useState(null)
  const lastRoundHandledRef = useRef(0)

  // Poll state via react-query
  const { data: state } = useQuery({
    queryKey: ['ansdrop-state'],
    queryFn: async () => {
      const r = await fetch('/api/state')
      return r.json()
    },
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  })

  // Fetch holder pool once
  useEffect(() => {
    fetch('/api/holders?limit=5000')
      .then((r) => r.json())
      .then((d) => setHoldersPool((d.holders || []).map((h) => h.address)))
      .catch(() => {})
  }, [])

  const systemStatus = state?.systemStatus || 'stopped'

  // Detect winner
  useEffect(() => {
    if (!state) return
    if (systemStatus !== 'running') return
    if (
      state.justPicked &&
      state.justPicked.roundNumber > lastRoundHandledRef.current &&
      phase === 'countdown'
    ) {
      lastRoundHandledRef.current = state.justPicked.roundNumber
      setActiveWinner(state.justPicked)
      setPhase('running')
      setStagePhase('scan')
    } else if (!lastRoundHandledRef.current && state.recentWinners?.[0]) {
      lastRoundHandledRef.current = state.recentWinners[0].roundNumber
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.justPicked?.roundNumber, state?.recentWinners?.length, systemStatus])

  // If system was stopped mid-round, snap back to idle
  useEffect(() => {
    if (systemStatus !== 'running' && phase !== 'countdown') {
      setPhase('countdown')
      setStagePhase('idle')
      setActiveWinner(null)
    }
  }, [systemStatus, phase])

  // Local countdown ticker
  useEffect(() => {
    if (systemStatus !== 'running') {
      setMsLeft(0)
      return
    }
    if (!state?.nextRoundEndsAt) return
    const target = new Date(state.nextRoundEndsAt).getTime()
    const skew = Date.now() - (state.now || Date.now())
    const tick = () => setMsLeft(target - (Date.now() - skew))
    tick()
    const iv = setInterval(tick, 100)
    return () => clearInterval(iv)
  }, [state?.nextRoundEndsAt, state?.now, systemStatus])

  // Stage phase machine timings (slower, more dramatic pacing)
  useEffect(() => {
    if (stagePhase === 'scan') {
      const t = setTimeout(() => setStagePhase('lock'), 5000) // scan for ~5s
      return () => clearTimeout(t)
    }
    if (stagePhase === 'lock') {
      const t = setTimeout(() => setStagePhase('pre'), 3200) // hold on winner ~3.2s
      return () => clearTimeout(t)
    }
    if (stagePhase === 'pre') {
      const t = setTimeout(() => setStagePhase('ascend'), 3600) // 3-2-1 (~3.6s)
      return () => clearTimeout(t)
    }
  }, [stagePhase])

  // when ascend finishes (crash), Stage waits ~3.5s internally, then calls onFinish → back to idle
  const handleStageFinish = () => {
    setActiveWinner(null)
    setStagePhase('idle')
    setPhase('countdown')
  }

  const scannerHolders =
    holdersPool.length > 0
      ? holdersPool
      : (state?.recentWinners || []).map((w) => w.address)

  // Last winner to persist inside stage during idle. Prefer the most recent completed winner.
  const lastWinnerForIdle = state?.recentWinners?.[0] || null

  // Mobile auto-scroll: when raffle starts running, scroll the stage into view on small screens.
  const stageRef = useRef(null)
  useEffect(() => {
    if (phase !== 'running') return
    if (typeof window === 'undefined') return
    if (window.innerWidth >= 768) return // desktop: no forced scroll
    if (stageRef.current) {
      try {
        stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch (e) {
        // ignore
      }
    }
  }, [phase])

  return (
    <div className="relative min-h-screen">
      <NeonBackground />
      <Header state={state} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* HERO */}
        <HeroCountdown
          msLeft={msLeft}
          intervalMs={state?.intervalMs || 60000}
          phase={phase}
          systemStatus={systemStatus}
        />

        {/* Provably-Fair badge */}
        <FairnessBadge state={state} recentWinners={state?.recentWinners || []} />

        {/* STATS */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">
          <StatPill
            icon={Users}
            label="Eligible"
            value={state ? fmt(state.eligibleCount) : '—'}
            sub={state ? `of ${fmt(state.totalHolders)} holders` : ''}
            tone="cyan"
          />
          <StatPill
            icon={Coins}
            label="Base pool"
            value={state ? fmt(state.baseReward) : '—'}
            sub="$ANSEM × multiplier"
            tone="amber"
          />
          <StatPill
            icon={ShieldCheck}
            label="Min hold"
            value={state ? fmt(state.minEligibleHold) : '—'}
            sub="$ANSEM to enter"
            tone="emerald"
          />
          <StatPill
            icon={Wallet}
            label="Total distributed"
            value={state ? fmt(state.totalDistributed) : '—'}
            sub={state ? `sent to ${fmt(state.winnersCount)} winners` : ''}
            tone="fuchsia"
          />
        </div>

        {/* UNIFIED STAGE */}
        <div ref={stageRef} className="mt-5 scroll-mt-4 sm:mt-6">
          <Stage
            phase={stagePhase}
            winner={activeWinner}
            lastWinner={lastWinnerForIdle}
            holders={scannerHolders}
            onFinish={handleStageFinish}
          />
        </div>

        {/* HOW IT WORKS */}
        <HowItWorks />

        {/* WINNERS */}
        <RecentWinners winners={state?.recentWinners || []} />

        {/* ABOUT */}
        <About state={state} />

        <footer className="mt-12 flex flex-col items-center gap-2 pb-10 text-center text-xs text-white/40 sm:mt-16">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-cyan-300" />
            Ansdrop — built for the $ANSEM community
          </div>
          <div className="text-[10px] text-white/30">
            Automated raffle. No wallet connect. Manual on-chain transfer to winner.
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
