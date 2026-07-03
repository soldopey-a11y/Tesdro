'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Sparkles,
  Trophy,
  Users,
  Timer,
  Coins,
  ShieldCheck,
  Wallet,
  Copy,
  Check,
  Flame,
  Heart,
  ArrowLeft,
  ExternalLink,
  Lock,
  X,
} from 'lucide-react'

// ---------- utils ----------
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

export default function DropPage() {
  const params = useParams()
  const slug = params?.slug
  const [state, setState] = useState(null)
  const [msLeft, setMsLeft] = useState(0)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!slug) return
    let alive = true
    async function load() {
      try {
        const r = await fetch(`/api/projects/${slug}/state`)
        if (r.status === 404) {
          setError('not-found')
          return
        }
        const d = await r.json()
        if (alive) setState(d)
      } catch (e) {}
    }
    load()
    const iv = setInterval(load, 2000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [slug])

  const running = state?.systemStatus === 'running'
  const notStarted = !running

  useEffect(() => {
    if (!state?.nextRoundEndsAt || !running) {
      setMsLeft(0)
      return
    }
    const target = new Date(state.nextRoundEndsAt).getTime()
    const skew = Date.now() - (state.now || Date.now())
    const tick = () => setMsLeft(target - (Date.now() - skew))
    tick()
    const iv = setInterval(tick, 100)
    return () => clearInterval(iv)
  }, [state?.nextRoundEndsAt, state?.now, running])

  const copy = (val, tag) => {
    if (typeof navigator === 'undefined' || !val) return
    navigator.clipboard?.writeText(val).then(() => {
      setCopied(tag)
      setTimeout(() => setCopied(''), 1400)
    })
  }

  if (error === 'not-found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="text-center">
          <div className="text-2xl font-black">Drop not found</div>
          <div className="mt-2 text-sm text-white/50">
            This community drop does not exist or was deleted.
          </div>
          <Link href="/discover" className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Discover other drops
          </Link>
        </div>
      </div>
    )
  }

  const lastWinner = state?.recentWinners?.[0]

  return (
    <div className="relative min-h-screen bg-black text-white">
      <NeonBg />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/discover" className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/40 bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 shadow-[0_0_24px_rgba(6,182,212,0.55)]">
              <Zap className="h-4 w-4 text-cyan-200" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-black tracking-tight sm:text-base">
                {state?.name || '—'}
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-cyan-300/70">
                ${state?.ticker || '—'} • community drop
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${running ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/50'}`}>
              <span className="relative flex h-1.5 w-1.5">
                {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-white/40'}`} />
              </span>
              {running ? 'Live' : 'Offline'}
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 sm:block">
              Round <span className="font-mono text-white">#{state?.roundNumber ?? '—'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Supporter banner */}
        {state?.supporterName && (
          <div className="mb-5 rounded-2xl border border-fuchsia-400/25 bg-gradient-to-r from-fuchsia-500/[0.08] via-transparent to-transparent px-4 py-3 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <Heart className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
              <div className="text-sm text-white/80">
                Supported by{' '}
                <span className="font-bold text-white">{state.supporterName}</span>
                {state.supporterHandle && (
                  <span className="ml-1.5 text-cyan-300">{state.supporterHandle}</span>
                )}
                {state.supporterMessage && (
                  <div className="mt-1 text-[13px] italic text-white/60">
                    “{state.supporterMessage}”
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 backdrop-blur-md sm:p-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.10),transparent_70%)]" />
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-200">
              <Sparkles className="h-3 w-3" /> community airdrop
            </div>
            <h1 className="max-w-2xl text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Every {Math.round((state?.intervalMs || 120000) / 1000)} seconds, one{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                ${state?.ticker || '—'} holder
              </span>{' '}
              gets a multiplier-boosted airdrop.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
              Hold at least{' '}
              <span className="font-mono text-white">
                {state ? fmt(state.minEligibleHold) : '—'}&nbsp;${state?.ticker}
              </span>{' '}
              to be eligible. No wallet connect — the raffle scans every holder
              automatically.
            </p>

            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50">
                <Timer className="h-3 w-3" />
                {notStarted ? (
                  <span className="text-amber-300">system offline</span>
                ) : (
                  <>next drop in</>
                )}
              </div>
              <div
                className={`font-mono text-[64px] font-black leading-none tracking-tight sm:text-[104px] md:text-[128px] ${
                  notStarted
                    ? 'bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent'
                    : 'bg-gradient-to-b from-white to-cyan-300 bg-clip-text text-transparent'
                }`}
                style={{ WebkitTextStroke: '1px rgba(255,255,255,0.05)' }}
              >
                {notStarted ? '00:00' : fmtMs(msLeft)}
              </div>
              <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 transition-all"
                  style={{
                    width: notStarted
                      ? '0%'
                      : `${100 - Math.min(100, Math.max(0, (msLeft / (state?.intervalMs || 120000)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fair multiplier badge */}
        <button
          onClick={() => setModalOpen(true)}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/[0.06] to-transparent px-4 py-3 text-left backdrop-blur-md hover:border-emerald-400/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10">
              <Lock className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                fair multiplier
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-white/70">
                next commit&nbsp;
                <span className="text-emerald-200">
                  {state?.seedCommit
                    ? state.seedCommit.slice(0, 10) + '…' + state.seedCommit.slice(-8)
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Users} label="Eligible" value={state ? fmt(state.eligibleCount) : '—'} sub={state ? `of ${fmt(state.totalHolders)}` : ''} tone="cyan" />
          <Stat icon={Coins} label="Base pool" value={state ? fmt(state.baseReward) : '—'} sub={`$${state?.ticker || ''} × multiplier`} tone="amber" />
          <Stat icon={ShieldCheck} label="Min hold" value={state ? fmt(state.minEligibleHold) : '—'} sub="to enter" tone="emerald" />
          <Stat icon={Wallet} label="Distributed" value={state ? fmt(state.totalDistributed) : '—'} sub={state ? `to ${fmt(state.winnersCount)} winners` : ''} tone="fuchsia" />
        </div>

        {/* Recent winners */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Winners feed
              </div>
              <h2 className="mt-1 text-xl font-black text-white">Recent winners</h2>
            </div>
          </div>
          {(!state?.recentWinners || state.recentWinners.length === 0) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
              No winners yet. Waiting for the first round…
            </div>
          )}
          {state?.recentWinners?.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {state.recentWinners.slice(0, 8).map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 font-mono text-xs font-bold text-emerald-200">
                      #{w.roundNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-mono text-sm font-semibold">
                        {shortAddr(w.address)}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-white/40">
                        {new Date(w.endedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 font-mono text-sm font-bold text-amber-300">
                      <Flame className="h-3 w-3" /> {w.crashPoint?.toFixed(2)}x
                    </div>
                    <div className="text-[11px] text-white/60">
                      +{fmt(w.tokensWon)} ${state.ticker}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-16 flex flex-col items-center gap-1 pb-10 text-center text-xs text-white/40">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-cyan-300" />
            Powered by Ansdrop •{' '}
            <Link href="/discover" className="hover:text-white">
              discover more drops
            </Link>
          </div>
        </footer>
      </main>

      {/* Fair multiplier modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-slate-950 via-black to-slate-950 p-6 sm:p-8"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-xl font-black tracking-tight">Fair Multiplier</div>
                </div>
              </div>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/70">
                <p>
                  Ansdrop generates a secret 256-bit server seed before every round,
                  publishes only its SHA-256 hash as a public commit, then reveals
                  the raw seed after the round ends. The multiplier is a pure
                  function of the seed + round number — nobody can rig it.
                </p>
                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.04] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                    Formula
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] text-white/80">
{`SHA256(revealedSeed) === seedCommit
h = SHA256(revealedSeed + ":crash:" + roundNumber)
r = int(h[0..15], 16) / 2^60
crashPoint = min( 0.99 / (1 - r * 0.99),  1000 )   (capped at 1000x)`}
                  </pre>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    Current commit
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="break-all font-mono text-[11px] text-emerald-200">
                      {state?.seedCommit || '—'}
                    </div>
                    {state?.seedCommit && (
                      <button onClick={() => copy(state.seedCommit, 'c')} className="shrink-0 rounded p-1 text-white/50 hover:text-white">
                        {copied === 'c' ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                {lastWinner?.revealedSeed && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                      Last verified round #{lastWinner.roundNumber} —{' '}
                      <span className="font-mono font-bold text-amber-300">
                        {lastWinner.crashPoint?.toFixed(2)}x
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 font-mono text-[11px]">
                      <div><span className="text-white/40">commit:</span> <span className="break-all text-emerald-200">{lastWinner.seedCommit}</span></div>
                      <div><span className="text-white/40">seed:</span> <span className="break-all text-emerald-200">{lastWinner.revealedSeed}</span></div>
                    </div>
                    <a href="https://emn178.github.io/online-tools/sha256.html" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-cyan-300 hover:underline">
                      <ExternalLink className="h-3 w-3" /> Verify SHA-256 yourself
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, tone = 'cyan' }) {
  const tones = {
    cyan: 'border-cyan-400/25 text-cyan-200',
    fuchsia: 'border-fuchsia-400/25 text-fuchsia-200',
    amber: 'border-amber-400/25 text-amber-200',
    emerald: 'border-emerald-400/25 text-emerald-200',
  }
  return (
    <div className={`rounded-2xl border bg-white/[0.03] p-3 backdrop-blur-md sm:p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em]">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 font-mono text-lg font-black text-white sm:text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-white/45">{sub}</div>}
    </div>
  )
}

function NeonBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.18),transparent_55%)]" />
    </div>
  )
}
