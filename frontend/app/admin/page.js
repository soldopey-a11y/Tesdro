'use client'

import { useEffect, useState } from 'react'
import { Lock, Check, X, ExternalLink, RefreshCw, LogOut, Shield, Copy, Play, RotateCcw, AlertTriangle } from 'lucide-react'

function shortAddr(a) {
  if (!a) return ''
  return a.slice(0, 6) + '…' + a.slice(-6)
}
function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US')
}

const KEY_STORAGE = 'ansdrop-admin-key'

export default function AdminPage() {
  const [pass, setPass] = useState('')
  const [authed, setAuthed] = useState(false)
  const [passInput, setPassInput] = useState('')
  const [error, setError] = useState('')
  const [winners, setWinners] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [txDrafts, setTxDrafts] = useState({}) // winnerId -> txHash draft
  const [copied, setCopied] = useState('')
  const [systemStatus, setSystemStatus] = useState(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(kind, msg) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadStatus() {
    try {
      const r = await fetch('/api/state')
      const d = await r.json()
      setSystemStatus(d.systemStatus || 'stopped')
    } catch (e) {}
  }

  async function startSystem() {
    setStartLoading(true)
    try {
      const r = await fetch('/api/admin/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: '{}',
      })
      if (r.ok) {
        await loadStatus()
        showToast('success', 'System started! Countdown initialized.')
      } else {
        showToast('error', 'Failed to start system')
      }
    } catch (e) {
      showToast('error', 'Network error')
    } finally {
      setStartLoading(false)
    }
  }

  async function confirmReset() {
    setResetLoading(true)
    try {
      const r = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: '{}',
      })
      if (r.ok) {
        await loadWinners()
        await loadStatus()
        setShowResetConfirm(false)
        showToast('success', 'System reset. All winners wiped.')
      } else {
        showToast('error', 'Failed to reset system')
      }
    } catch (e) {
      showToast('error', 'Network error')
    } finally {
      setResetLoading(false)
    }
  }

  // Load stored key on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = sessionStorage.getItem(KEY_STORAGE)
    if (saved) {
      setPass(saved)
      verifyAndLoad(saved)
    }
  }, [])

  async function verifyAndLoad(candidate) {
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/admin/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': candidate },
        body: '{}',
      })
      if (!r.ok) {
        setAuthed(false)
        setError('Wrong password')
        setLoading(false)
        return
      }
      setAuthed(true)
      sessionStorage.setItem(KEY_STORAGE, candidate)
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
      const r = await fetch('/api/admin/winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: '{}',
      })
      if (r.ok) {
        const d = await r.json()
        setWinners(d.winners || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function markPaid(winnerId) {
    setBusyId(winnerId)
    try {
      const r = await fetch('/api/admin/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: JSON.stringify({ winnerId, txHash: (txDrafts[winnerId] || '').trim() }),
      })
      if (r.ok) {
        await loadWinners()
        setTxDrafts((d) => ({ ...d, [winnerId]: '' }))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function unmarkPaid(winnerId) {
    if (!confirm('Unmark this winner as paid?')) return
    setBusyId(winnerId)
    try {
      const r = await fetch('/api/admin/unmark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pass },
        body: JSON.stringify({ winnerId }),
      })
      if (r.ok) await loadWinners()
    } finally {
      setBusyId(null)
    }
  }

  function logout() {
    sessionStorage.removeItem(KEY_STORAGE)
    setPass('')
    setAuthed(false)
    setWinners(null)
    setPassInput('')
  }

  function copyText(t, tag) {
    if (typeof navigator === 'undefined') return
    navigator.clipboard?.writeText(t).then(() => {
      setCopied(tag)
      setTimeout(() => setCopied(''), 1200)
    })
  }

  // ---------- Auth screen ----------
  if (!authed) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_60%)]" />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setPass(passInput)
            verifyAndLoad(passInput)
          }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10">
              <Shield className="h-5 w-5 text-fuchsia-300" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight">Ansdrop Admin</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                internal only
              </div>
            </div>
          </div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="password"
              autoFocus
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-white/30 focus:border-fuchsia-400/50"
            />
          </div>
          {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
          <button
            type="submit"
            disabled={loading || !passInput}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 py-2.5 text-sm font-bold text-white shadow-[0_0_30px_rgba(217,70,239,0.35)] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
          <div className="mt-3 text-center text-[10px] text-white/30">
            Not linked from main site. Ansdrop internal tool.
          </div>
        </form>
      </div>
    )
  }

  // ---------- Admin dashboard ----------
  const total = winners?.length || 0
  const unpaid = winners?.filter((w) => !w.paid).length || 0
  const paid = total - unpaid

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10">
              <Shield className="h-4 w-4 text-fuchsia-300" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight sm:text-lg">
                Ansdrop <span className="text-fuchsia-300">Admin</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                Winner payouts
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadWinners()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              <LogOut className="h-3 w-3" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* System control panel */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${systemStatus === 'running' ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-amber-400/40 bg-amber-500/10'}`}>
                <div className={`h-3 w-3 rounded-full ${systemStatus === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Raffle system</div>
                <div className={`mt-0.5 text-xl font-black tracking-tight ${systemStatus === 'running' ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {systemStatus === null ? '—' : systemStatus === 'running' ? 'Running' : 'Stopped'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startSystem}
                disabled={startLoading || systemStatus === 'running'}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-4 w-4" />
                {startLoading ? 'Starting…' : systemStatus === 'running' ? 'System Running' : 'Start System'}
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-white/50">
            <span className="font-semibold text-white/70">Start</span> initializes the countdown so the next round picks a winner in 120 seconds.{' '}
            <span className="font-semibold text-rose-300/80">Reset</span> wipes every winner record and stops the system — the public page will show &ldquo;NOT STARTED YET&rdquo;.
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[10px] uppercase tracking-widest text-white/40">Total winners</div>
            <div className="mt-1 font-mono text-2xl font-black text-white">{fmt(total)}</div>
          </div>
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-4">
            <div className="text-[10px] uppercase tracking-widest text-amber-300">Pending</div>
            <div className="mt-1 font-mono text-2xl font-black text-amber-200">{fmt(unpaid)}</div>
          </div>
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.05] p-4">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Paid</div>
            <div className="mt-1 font-mono text-2xl font-black text-emerald-200">{fmt(paid)}</div>
          </div>
        </div>

        {/* Winners list */}
        <div className="mt-6 space-y-3">
          {(!winners || winners.length === 0) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
              {loading ? 'Loading…' : 'No winners yet.'}
            </div>
          )}
          {winners?.map((w) => (
            <div
              key={w.id}
              className={`rounded-2xl border p-4 transition ${
                w.paid
                  ? 'border-emerald-400/25 bg-emerald-500/[0.03]'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                    Round #{w.roundNumber}
                    <span className="text-white/20">•</span>
                    {new Date(w.endedAt).toLocaleString()}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="break-all font-mono text-sm font-semibold text-white sm:text-base">
                      {w.address}
                    </div>
                    <button
                      onClick={() => copyText(w.address, 'addr-' + w.id)}
                      title="Copy address"
                      className="shrink-0 rounded p-1 text-white/50 hover:bg-white/5 hover:text-white"
                    >
                      {copied === 'addr-' + w.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 font-mono font-bold text-amber-200">
                      {w.crashPoint.toFixed(2)}x
                    </span>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 font-mono font-bold text-emerald-200">
                      Send {fmt(w.tokensWon)} $ANSEM
                    </span>
                    <button
                      onClick={() => copyText(String(w.tokensWon), 'amt-' + w.id)}
                      title="Copy amount"
                      className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white"
                    >
                      {copied === 'amt-' + w.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="w-full sm:w-auto sm:min-w-[280px]">
                  {w.paid ? (
                    <div className="flex flex-col items-stretch gap-2 sm:items-end">
                      <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300 sm:self-end">
                        <Check className="h-3 w-3" /> Paid
                        {w.paidAt && (
                          <span className="ml-1 text-emerald-300/60">
                            {new Date(w.paidAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {w.txHash && (
                        <a
                          href={`https://solscan.io/tx/${w.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 self-start text-xs text-cyan-300 hover:underline sm:self-end"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {w.txHash.slice(0, 10)}…{w.txHash.slice(-8)}
                        </a>
                      )}
                      <button
                        onClick={() => unmarkPaid(w.id)}
                        disabled={busyId === w.id}
                        className="self-start text-[11px] text-rose-400 hover:underline sm:self-end"
                      >
                        Unmark
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Paste tx signature (optional)"
                        value={txDrafts[w.id] || ''}
                        onChange={(e) =>
                          setTxDrafts((d) => ({ ...d, [w.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none placeholder:text-white/30 focus:border-fuchsia-400/50"
                      />
                      <button
                        onClick={() => markPaid(w.id)}
                        disabled={busyId === w.id}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {busyId === w.id ? 'Saving…' : 'Mark as Paid'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/50">
          <div className="mb-1 font-semibold uppercase tracking-widest text-white/70">
            How to mark paid
          </div>
          <ol className="ml-4 list-decimal space-y-1">
            <li>Copy the winner address + amount from the row above.</li>
            <li>Send the tokens from your dev wallet (Phantom, Solflare, CLI, etc).</li>
            <li>Copy the transaction signature from Solscan / your wallet history.</li>
            <li>
              Paste it into the input on the winner's row and click{' '}
              <span className="font-semibold text-emerald-300">Mark as Paid</span>.
            </li>
            <li>
              The <span className="font-semibold text-emerald-300">Paid</span> badge will
              instantly appear on the public site.
            </li>
          </ol>
        </div>
      </main>

      {/* Reset confirm dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-400/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(244,63,94,0.25)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-300" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-white">Reset raffle system?</div>
                <div className="text-[10px] uppercase tracking-widest text-rose-300">destructive action</div>
              </div>
            </div>
            <div className="mt-4 text-sm leading-relaxed text-white/70">
              This will <span className="font-bold text-rose-300">permanently delete every winner</span> in the database and set the system status to <span className="font-mono text-amber-300">stopped</span>. The public page will show <span className="font-mono text-amber-300">NOT STARTED YET</span> until you press Start again.
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setShowResetConfirm(false)} disabled={resetLoading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                Cancel
              </button>
              <button onClick={confirmReset} disabled={resetLoading} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-[0_0_25px_rgba(244,63,94,0.35)] hover:opacity-90 disabled:opacity-50">
                <RotateCcw className="h-4 w-4" />
                {resetLoading ? 'Resetting…' : 'Yes, reset everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl ${toast.kind === 'success' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/40 bg-rose-500/10 text-rose-200'}`}>
            {toast.kind === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  )
}
