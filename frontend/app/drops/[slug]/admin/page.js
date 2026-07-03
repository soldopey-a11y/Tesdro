'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Lock,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  LogOut,
  Shield,
  Copy,
  Play,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  Wallet,
} from 'lucide-react'

function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US')
}

export default function ProjectAdmin() {
  const params = useParams()
  const slug = params?.slug
  const [pass, setPass] = useState('')
  const [passInput, setPassInput] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [winners, setWinners] = useState(null)
  const [projectMeta, setProjectMeta] = useState(null)
  const [systemStatus, setSystemStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [txDrafts, setTxDrafts] = useState({})
  const [depositTx, setDepositTx] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [depositLoading, setDepositLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!slug || typeof window === 'undefined') return
    // load meta always (public)
    fetch(`/api/projects/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        setProjectMeta(d.project)
        setDepositTx(d.project?.depositTx || '')
      })
      .catch(() => {})
    // auto login with saved key
    try {
      const map = JSON.parse(localStorage.getItem('ansdrop-project-keys') || '{}')
      if (map[slug]) {
        setPass(map[slug])
        verifyAndLoad(map[slug])
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  function showToast(kind, msg) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function verifyAndLoad(candidate) {
    setError('')
    setLoading(true)
    try {
      const r = await fetch(`/api/projects/${slug}/admin/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': candidate },
        body: '{}',
      })
      if (!r.ok) {
        setAuthed(false)
        setError('Wrong admin key')
        return
      }
      setAuthed(true)
      try {
        const map = JSON.parse(localStorage.getItem('ansdrop-project-keys') || '{}')
        map[slug] = candidate
        localStorage.setItem('ansdrop-project-keys', JSON.stringify(map))
      } catch (e) {}
      await loadWinners(candidate)
      await loadStatus()
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function loadWinners(key = pass) {
    setLoading(true)
    try {
      const r = await fetch(`/api/projects/${slug}/admin/winners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: '{}',
      })
      const d = await r.json()
      setWinners(d.winners || [])
    } finally {
      setLoading(false)
    }
  }

  async function loadStatus() {
    try {
      const r = await fetch(`/api/projects/${slug}/state`)
      const d = await r.json()
      setSystemStatus(d.systemStatus || 'stopped')
    } catch (e) {}
  }

  async function startSystem() {
    setStartLoading(true)
    try {
      const r = await fetch(`/api/projects/${slug}/admin/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: '{}',
      })
      if (r.ok) {
        await loadStatus()
        showToast('success', 'Drop started!')
      } else showToast('error', 'Failed to start')
    } finally {
      setStartLoading(false)
    }
  }

  async function confirmReset() {
    setResetLoading(true)
    try {
      const r = await fetch(`/api/projects/${slug}/admin/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: '{}',
      })
      if (r.ok) {
        await loadWinners()
        await loadStatus()
        setShowResetConfirm(false)
        showToast('success', 'Drop reset.')
      } else showToast('error', 'Failed to reset')
    } finally {
      setResetLoading(false)
    }
  }

  async function saveDepositTx() {
    setDepositLoading(true)
    try {
      const r = await fetch(`/api/projects/${slug}/admin/set-deposit-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: JSON.stringify({ depositTx }),
      })
      if (r.ok) showToast('success', 'Deposit tx saved.')
    } finally {
      setDepositLoading(false)
    }
  }

  async function markPaid(winnerId) {
    setBusyId(winnerId)
    try {
      await fetch(`/api/projects/${slug}/admin/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: JSON.stringify({ winnerId, txHash: (txDrafts[winnerId] || '').trim() }),
      })
      await loadWinners()
      setTxDrafts((d) => ({ ...d, [winnerId]: '' }))
    } finally {
      setBusyId(null)
    }
  }

  async function unmarkPaid(winnerId) {
    if (!confirm('Unmark this winner as dropped?')) return
    setBusyId(winnerId)
    try {
      await fetch(`/api/projects/${slug}/admin/unmark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: JSON.stringify({ winnerId }),
      })
      await loadWinners()
    } finally {
      setBusyId(null)
    }
  }

  function logout() {
    try {
      const map = JSON.parse(localStorage.getItem('ansdrop-project-keys') || '{}')
      delete map[slug]
      localStorage.setItem('ansdrop-project-keys', JSON.stringify(map))
    } catch (e) {}
    setPass('')
    setAuthed(false)
    setWinners(null)
    setPassInput('')
  }

  function copy(v, tag) {
    navigator.clipboard?.writeText(v).then(() => {
      setCopied(tag)
      setTimeout(() => setCopied(''), 1200)
    })
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setPass(passInput)
            verifyAndLoad(passInput)
          }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
        >
          <Link href={`/drops/${slug}`} className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
            <ArrowLeft className="h-3 w-3" /> back to drop
          </Link>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10">
              <Shield className="h-5 w-5 text-fuchsia-300" />
            </div>
            <div>
              <div className="text-lg font-black">Supporter admin</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                {projectMeta?.name || slug}
              </div>
            </div>
          </div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-white/50">Admin key</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="password"
              autoFocus
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm font-mono outline-none placeholder:text-white/30 focus:border-fuchsia-400/50"
              placeholder="paste your admin key"
            />
          </div>
          {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
          <button
            type="submit"
            disabled={loading || !passInput}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 py-2.5 text-sm font-bold text-white shadow-[0_0_30px_rgba(217,70,239,0.35)] disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  }

  const total = winners?.length || 0
  const unpaid = winners?.filter((w) => !w.paid).length || 0
  const paid = total - unpaid
  const running = systemStatus === 'running'

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={`/drops/${slug}`} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10">
              <Shield className="h-4 w-4 text-fuchsia-300" />
            </div>
            <div>
              <div className="text-sm font-black sm:text-base">{projectMeta?.name || slug}</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                supporter dashboard
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadWinners(); loadStatus() }} disabled={loading} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              <LogOut className="h-3 w-3" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Deposit info */}
        {projectMeta && (
          <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/[0.04] p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              <Wallet className="h-3 w-3" /> deposit
            </div>
            <div className="mt-2 text-sm text-white/70">
              Send{' '}
              <span className="font-mono font-bold text-white">{fmt(projectMeta.totalPool || 0)} ${projectMeta.ticker}</span>{' '}
              to Ansdrop&apos;s deposit wallet, then paste the tx signature below
              so your community can verify:
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <span className="break-all font-mono text-[11px] text-emerald-200">
                8dVeDCor7pnZnYLKtRKXoe19WF9FcbPQzfZzopqSEovT
              </span>
              <button onClick={() => copy('8dVeDCor7pnZnYLKtRKXoe19WF9FcbPQzfZzopqSEovT', 'dw')} className="shrink-0 rounded p-1 text-white/50 hover:text-white">
                {copied === 'dw' ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Deposit tx signature (optional)"
                value={depositTx}
                onChange={(e) => setDepositTx(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none placeholder:text-white/30 focus:border-fuchsia-400/50"
              />
              <button onClick={saveDepositTx} disabled={depositLoading} className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                {depositLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* System panel */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${running ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-amber-400/40 bg-amber-500/10'}`}>
                <div className={`h-3 w-3 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Drop system</div>
                <div className={`mt-0.5 text-xl font-black tracking-tight ${running ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {systemStatus === null ? '—' : running ? 'Running' : 'Stopped'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={startSystem} disabled={startLoading || running} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-40">
                <Play className="h-4 w-4" /> {startLoading ? 'Starting…' : running ? 'Running' : 'Start Drop'}
              </button>
              <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/20">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total winners" value={fmt(total)} />
          <StatCard label="Pending" value={fmt(unpaid)} tone="amber" />
          <StatCard label="Dropped" value={fmt(paid)} tone="emerald" />
        </div>

        <div className="mt-6 space-y-3">
          {(!winners || winners.length === 0) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
              {loading ? 'Loading…' : 'No winners yet.'}
            </div>
          )}
          {winners?.map((w) => (
            <WinnerRow
              key={w.id}
              w={w}
              ticker={projectMeta?.ticker || ''}
              busy={busyId === w.id}
              draft={txDrafts[w.id] || ''}
              onDraftChange={(v) => setTxDrafts((d) => ({ ...d, [w.id]: v }))}
              onMark={() => markPaid(w.id)}
              onUnmark={() => unmarkPaid(w.id)}
              onCopyAddr={() => copy(w.address, 'a-' + w.id)}
              onCopyAmt={() => copy(String(w.tokensWon), 'm-' + w.id)}
              copied={copied}
            />
          ))}
        </div>
      </main>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-400/40 bg-slate-950 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-300" />
              </div>
              <div>
                <div className="text-lg font-black">Reset drop?</div>
                <div className="text-[10px] uppercase tracking-widest text-rose-300">destructive</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-white/70">
              Deletes every winner in this drop and stops the system.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowResetConfirm(false)} disabled={resetLoading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                Cancel
              </button>
              <button onClick={confirmReset} disabled={resetLoading} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                <RotateCcw className="h-4 w-4" /> {resetLoading ? 'Resetting…' : 'Yes, reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg ${toast.kind === 'success' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/40 bg-rose-500/10 text-rose-200'}`}>
            {toast.kind === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }) {
  const tones = {
    amber: 'border-amber-400/25 bg-amber-500/[0.05] text-amber-300',
    emerald: 'border-emerald-400/25 bg-emerald-500/[0.05] text-emerald-300',
    default: 'border-white/10 bg-white/[0.03] text-white/40',
  }
  const cls = tones[tone] || tones.default
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-[10px] uppercase tracking-widest">{label}</div>
      <div className="mt-1 font-mono text-2xl font-black text-white">{value}</div>
    </div>
  )
}

function WinnerRow({ w, ticker, busy, draft, onDraftChange, onMark, onUnmark, onCopyAddr, onCopyAmt, copied }) {
  return (
    <div className={`rounded-2xl border p-4 ${w.paid ? 'border-emerald-400/25 bg-emerald-500/[0.03]' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-white/50">
            Round #{w.roundNumber} • {new Date(w.endedAt).toLocaleString()}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="break-all font-mono text-sm font-semibold">{w.address}</div>
            <button onClick={onCopyAddr} className="shrink-0 rounded p-1 text-white/50 hover:text-white">
              {copied === 'a-' + w.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 font-mono font-bold text-amber-200">
              {w.crashPoint?.toFixed(2)}x
            </span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 font-mono font-bold text-emerald-200">
              Send {fmt(w.tokensWon)} ${ticker}
            </span>
            <button onClick={onCopyAmt} className="rounded p-1 text-white/50 hover:text-white">
              {copied === 'm-' + w.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[280px]">
          {w.paid ? (
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300 sm:self-end">
                <Check className="h-3 w-3" /> Dropped
              </div>
              {w.txHash && (
                <a href={`https://solscan.io/tx/${w.txHash}`} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:underline">
                  <ExternalLink className="mr-1 inline h-3 w-3" />
                  {w.txHash.slice(0, 10)}…{w.txHash.slice(-8)}
                </a>
              )}
              <button onClick={onUnmark} disabled={busy} className="self-start text-[11px] text-rose-400 hover:underline sm:self-end">
                Unmark
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Paste tx signature (optional)"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none placeholder:text-white/30 focus:border-fuchsia-400/50"
              />
              <button onClick={onMark} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                <Check className="h-3.5 w-3.5" />
                {busy ? 'Saving…' : 'Mark as Dropped'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
