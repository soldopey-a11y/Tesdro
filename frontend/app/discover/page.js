'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Heart,
  ArrowLeft,
  ArrowRight,
  Users,
  Coins,
  Sparkles,
  Plus,
} from 'lucide-react'

function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US')
}

export default function DiscoverPage() {
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => setError('Failed to load'))
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white">
      <NeonBg />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> back to Ansdrop
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-fuchsia-300">
              <Sparkles className="h-3 w-3" /> community drops
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Supported Communities
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/60">
              Every drop below is powered by someone donating tokens to their
              community. Hold the token, get a chance to win every round.
            </p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(217,70,239,0.35)] hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Support a community
          </Link>
        </div>

        <div className="mt-8">
          {projects === null && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
              ))}
            </div>
          )}

          {projects && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-12 text-center backdrop-blur-md">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/10">
                <Heart className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight text-white">
                  Not supported yet
                </div>
                <div className="mt-1 text-sm text-white/50">
                  Be the first to run a fair-multiplier drop for your community.
                </div>
              </div>
              <Link
                href="/create"
                className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(217,70,239,0.35)] hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Start the first support
              </Link>
            </div>
          )}

          {projects && projects.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.slug} p={p} />
              ))}
            </div>
          )}

          {error && <div className="text-sm text-rose-400">{error}</div>}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ p }) {
  return (
    <Link
      href={`/drops/${p.slug}`}
      className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition hover:border-fuchsia-400/40 hover:bg-white/[0.06]"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300">
              community drop
            </div>
            <div className="mt-1 text-lg font-black tracking-tight text-white">
              {p.name}
            </div>
            <div className="text-[11px] font-mono text-cyan-300">${p.ticker}</div>
          </div>
          <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-300">
            live
          </div>
        </div>

        {p.supporterName && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/60">
            <Heart className="h-3 w-3 text-fuchsia-300" />
            supported by{' '}
            <span className="font-semibold text-white">{p.supporterName}</span>
            {p.supporterHandle && (
              <span className="text-cyan-300">{p.supporterHandle}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-black/40 p-2">
          <div className="text-[9px] uppercase tracking-widest text-white/40">
            base
          </div>
          <div className="font-mono text-sm font-bold text-amber-200">
            {fmt(p.baseReward)}
          </div>
        </div>
        <div className="rounded-lg bg-black/40 p-2">
          <div className="text-[9px] uppercase tracking-widest text-white/40">
            min hold
          </div>
          <div className="font-mono text-sm font-bold text-cyan-200">
            {fmt(p.minHold)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-white/50 group-hover:text-white">
        Open drop <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  )
}

function NeonBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.12),transparent_55%)]" />
    </div>
  )
}
