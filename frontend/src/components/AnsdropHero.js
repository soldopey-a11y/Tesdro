import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Sparkles, Timer, Copy, Check } from 'lucide-react';
import { shortAddr, fmtMs } from '../lib/ansdropUtils';

export function NeonBackground() {
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
  );
}

export function Header({ state }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (typeof navigator === 'undefined' || !state?.mint) return;
    navigator.clipboard?.writeText(state.mint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  const running = state?.systemStatus === 'running';
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
              {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-white/40'}`} />
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
  );
}

export function HeroCountdown({ msLeft, intervalMs, phase, systemStatus }) {
  const pct = intervalMs > 0 ? Math.max(0, Math.min(1, msLeft / intervalMs)) : 0;
  const urgent = msLeft < 10000 && phase === 'countdown';
  const running = phase !== 'countdown';
  const notStarted = systemStatus !== 'running';

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
  );
}
