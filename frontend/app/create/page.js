'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Zap,
  Heart,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Users,
  Coins,
  Timer,
  Wallet,
} from 'lucide-react'

export default function CreatePage() {
  const [form, setForm] = useState({
    name: '',
    ticker: '',
    mint: '',
    decimals: 6,
    minHold: '',
    baseReward: '',
    intervalMs: 120000,
    totalPool: '',
    supporterName: '',
    supporterHandle: '',
    supporterMessage: '',
    tipSol: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function copy(v, tag) {
    if (typeof navigator === 'undefined') return
    navigator.clipboard?.writeText(v).then(() => {
      setCopied(tag)
      setTimeout(() => setCopied(''), 1400)
    })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          minHold: parseFloat(form.minHold),
          baseReward: parseFloat(form.baseReward),
          totalPool: parseFloat(form.totalPool || 0),
          decimals: parseInt(form.decimals, 10),
          intervalMs: parseInt(form.intervalMs, 10),
          tipSol: parseFloat(form.tipSol || 0),
        }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error || 'Failed to create')
        return
      }
      // persist admin key locally for this project
      try {
        const map = JSON.parse(localStorage.getItem('ansdrop-project-keys') || '{}')
        map[d.slug] = d.adminKey
        localStorage.setItem('ansdrop-project-keys', JSON.stringify(map))
      } catch (e) {}
      setResult(d)
    } catch (e) {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <NeonBg />
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-6 backdrop-blur-md sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  Community drop created
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                  save these details securely
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <FieldRow label="Public URL" value={result.publicUrl} onCopy={() => copy(result.publicUrl, 'url')} copied={copied === 'url'} />
              <FieldRow label="Admin URL" value={result.adminUrl} onCopy={() => copy(result.adminUrl, 'adminUrl')} copied={copied === 'adminUrl'} />
              <FieldRow label="Slug" value={result.slug} onCopy={() => copy(result.slug, 'slug')} copied={copied === 'slug'} />
              <FieldRow label="Admin key" value={result.adminKey} onCopy={() => copy(result.adminKey, 'ak')} copied={copied === 'ak'} sensitive />
              <FieldRow label="Deposit wallet" value={result.depositWallet} onCopy={() => copy(result.depositWallet, 'dw')} copied={copied === 'dw'} />
            </div>

            <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-4 text-xs leading-relaxed text-amber-100/80">
              <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-widest text-amber-300">
                <Wallet className="h-3 w-3" /> next steps
              </div>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Send the {form.totalPool ? form.totalPool.toLocaleString() : 'total'} {form.ticker} tokens to the deposit wallet above.</li>
                <li>Save the admin key somewhere safe — you&apos;ll need it to start / manage the drop.</li>
                <li>Open the Admin URL to log in with the admin key and press <span className="font-bold">Start</span>.</li>
                <li>Share the Public URL with your community.</li>
              </ol>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={result.publicUrl} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:opacity-90">
                Open drop page <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={result.adminUrl} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">
                Open admin
              </Link>
              <Link href="/discover" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">
                See all supports
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      <NeonBg />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> back to Ansdrop
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20">
            <Heart className="h-5 w-5 text-fuchsia-300" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Support a Community
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-fuchsia-300">
              donate tokens • run a fair-multiplier drop
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/60">
          Fill out the form below to run a community drop for any Solana token.
          You&apos;ll deposit the total pool to Ansdrop&apos;s wallet and receive an
          admin key to control your own drop. Every round distributes tokens to a
          random holder of the token with a provably-fair multiplier.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <Section title="Community">
            <Grid>
              <Input label="Community name" value={form.name} onChange={(v) => update('name', v)} placeholder="e.g. Bonk Community" required />
              <Input label="Ticker" value={form.ticker} onChange={(v) => update('ticker', v.toUpperCase())} placeholder="BONK" required maxLength={12} />
            </Grid>
            <Input label="Token mint address (CA)" value={form.mint} onChange={(v) => update('mint', v.trim())} placeholder="e.g. DezXAZ8z..." required mono />
          </Section>

          <Section title="Drop mechanics">
            <Grid>
              <Input label="Token decimals" value={form.decimals} onChange={(v) => update('decimals', v)} type="number" min={0} max={12} required />
              <Input label="Min hold to be eligible" value={form.minHold} onChange={(v) => update('minHold', v)} type="number" placeholder="50000" required suffix={form.ticker || 'tokens'} />
            </Grid>
            <Grid>
              <Input label="Base reward per round" value={form.baseReward} onChange={(v) => update('baseReward', v)} type="number" placeholder="5000" required suffix={form.ticker || 'tokens'} help="Winner gets baseReward × multiplier (1x–100x)" />
              <Input label="Round interval" value={form.intervalMs} onChange={(v) => update('intervalMs', v)} type="number" placeholder="120000" suffix="ms" help="Minimum 30000 ms (30 s)" />
            </Grid>
            <Input label="Total pool you'll deposit (info only)" value={form.totalPool} onChange={(v) => update('totalPool', v)} type="number" placeholder="1000000" suffix={form.ticker || 'tokens'} help="For your reference — shown to your community" />
          </Section>

          <Section title="About you (optional)">
            <Grid>
              <Input label="Your name / community" value={form.supporterName} onChange={(v) => update('supporterName', v)} placeholder="e.g. Alice" />
              <Input label="Twitter / X handle" value={form.supporterHandle} onChange={(v) => update('supporterHandle', v)} placeholder="@alice" />
            </Grid>
            <Textarea label="Message to the community" value={form.supporterMessage} onChange={(v) => update('supporterMessage', v)} placeholder="Say something nice — shown at the top of your drop page." maxLength={400} />
          </Section>

          <Section title="Optional tip">
            <Input label="Tip Ansdrop (SOL, optional)" value={form.tipSol} onChange={(v) => update('tipSol', v)} type="number" step={0.01} placeholder="0" suffix="SOL" help="Zero fee — but tips help Ansdrop keep running" />
          </Section>

          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(217,70,239,0.35)] transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create community drop'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="text-center text-[11px] text-white/40">
            By creating a drop you agree to send the pool tokens to the deposit
            wallet shown after submission. Ansdrop doesn&apos;t take fees.
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- helpers ----------
function NeonBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.12),transparent_55%)]" />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-fuchsia-300">
        {title}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}

function Grid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function Input({ label, value, onChange, placeholder, type = 'text', required, mono, suffix, help, min, max, maxLength, step }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
        {label} {required && <span className="text-rose-400">*</span>}
      </div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          maxLength={maxLength}
          step={step}
          className={`w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-fuchsia-400/50 ${mono ? 'font-mono text-xs' : ''} ${suffix ? 'pr-16' : ''}`}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-white/40">
            {suffix}
          </div>
        )}
      </div>
      {help && <div className="mt-1 text-[10px] text-white/40">{help}</div>}
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder, maxLength }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-fuchsia-400/50"
      />
      <div className="mt-1 text-right text-[10px] text-white/30">
        {value.length}/{maxLength}
      </div>
    </label>
  )
}

function FieldRow({ label, value, onCopy, copied, sensitive }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
          {label} {sensitive && <span className="text-amber-300">(secret)</span>}
        </div>
        <button onClick={onCopy} className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white">
          {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <div className={`mt-1 break-all font-mono text-xs ${sensitive ? 'text-amber-200' : 'text-emerald-200'}`}>
        {value}
      </div>
    </div>
  )
}
