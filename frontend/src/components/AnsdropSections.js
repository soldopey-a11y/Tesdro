import React from 'react';
import { Wallet, Scan, Rocket, Flame, Check, Trophy } from 'lucide-react';
import { shortAddr, fmt } from '../lib/ansdropUtils';

export function StatPill({ icon: Icon, label, value, sub, tone = 'cyan' }) {
  const tones = {
    cyan: 'border-cyan-400/25 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.12)]',
    fuchsia: 'border-fuchsia-400/25 text-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.12)]',
    amber: 'border-amber-400/25 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.12)]',
    emerald: 'border-emerald-400/25 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
  };
  return (
    <div className={`rounded-2xl border bg-white/[0.03] p-3 backdrop-blur-md sm:p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] sm:text-[10px]">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 font-mono text-lg font-black text-white sm:text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-white/45 sm:text-[11px]">{sub}</div>}
    </div>
  );
}

export function PaidBadge({ paid, txHash, compact = false }) {
  if (paid) {
    const solscan = txHash ? `https://solscan.io/tx/${txHash}` : null;
    const inner = (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 font-semibold uppercase tracking-widest text-emerald-300 ${
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
        }`}
      >
        <Check className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> Paid
      </span>
    );
    return solscan ? (
      <a href={solscan} target="_blank" rel="noreferrer" title="View tx on Solscan" className="hover:opacity-80">
        {inner}
      </a>
    ) : (
      inner
    );
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
  );
}

export function HowItWorks() {
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
  ];
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
  );
}

export function RecentWinners({ winners }) {
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
  );
}

export function About({ state }) {
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
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Total holders</div>
            <div className="mt-2 font-mono text-xl font-black text-white sm:text-2xl">{state ? fmt(state.totalHolders) : '—'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Eligible</div>
            <div className="mt-2 font-mono text-xl font-black text-cyan-200 sm:text-2xl">{state ? fmt(state.eligibleCount) : '—'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Base reward</div>
            <div className="mt-2 font-mono text-xl font-black text-amber-200 sm:text-2xl">{state ? fmt(state.baseReward) : '—'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Interval</div>
            <div className="mt-2 font-mono text-xl font-black text-fuchsia-200 sm:text-2xl">{state ? `${Math.round((state.intervalMs || 60000) / 1000)}s` : '—'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Trophy_ignore() { return <Trophy />; }
