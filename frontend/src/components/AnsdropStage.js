import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Radio, Trophy, Sparkles, Scan, Rocket } from 'lucide-react';
import { shortAddr, fmt } from '../lib/ansdropUtils';
import { PaidBadge } from './AnsdropSections';

// Unified STAGE (AI Raffle → 3,2,1 → Crash Game)
// Phases: idle | scan | lock | pre | ascend
export default function Stage({ phase, winner, lastWinner, holders, onFinish }) {
  const [scanIdx, setScanIdx] = useState(0);
  const [preCount, setPreCount] = useState(3);
  const [mult, setMult] = useState(1.0);
  const [pathPts, setPathPts] = useState([]);
  const [crashedShown, setCrashedShown] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (phase !== 'scan') return;
    setScanIdx(0);
    const iv = setInterval(
      () => setScanIdx((i) => (i + 1) % Math.max(holders.length, 1)),
      90
    );
    return () => clearInterval(iv);
  }, [phase, holders.length]);

  useEffect(() => {
    if (phase !== 'pre') return;
    setPreCount(3);
    const t1 = setTimeout(() => setPreCount(2), 1200);
    const t2 = setTimeout(() => setPreCount(1), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'ascend') return;
    if (!winner) return;
    const cp = winner.crashPoint;
    setMult(1.0);
    setPathPts([]);
    setCrashedShown(false);
    startRef.current = performance.now();
    const k = Math.log(2) / 2.6;
    const tick = (now) => {
      const t = (now - startRef.current) / 1000;
      const current = Math.exp(k * t);
      if (current >= cp) {
        setMult(cp);
        setPathPts((prev) => [...prev, { t, m: cp }]);
        setCrashedShown(true);
        setTimeout(() => onFinish && onFinish(), 3500);
        return;
      }
      setMult(current);
      setPathPts((prev) => {
        if (prev.length === 0 || t - prev[prev.length - 1].t > 0.03) {
          const next = [...prev, { t, m: current }];
          if (next.length > 500) next.shift();
          return next;
        }
        return prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, winner?.crashPoint]);

  const visible = useMemo(() => {
    if (holders.length === 0) return [];
    const out = [];
    for (let i = -3; i <= 3; i++) {
      const idx = ((scanIdx + i) % holders.length + holders.length) % holders.length;
      out.push({ addr: holders[idx], off: i });
    }
    return out;
  }, [scanIdx, holders]);

  const W = 800;
  const H = 340;
  const cp = winner?.crashPoint || 1.5;
  const totalDur = Math.max(0.6, Math.log(Math.max(cp, 1.05)) / (Math.log(2) / 1.4));
  const maxM = Math.max(cp, 1.2);
  const pts = pathPts.map((p) => {
    const x = (p.t / totalDur) * W;
    const y = H - Math.min(1, Math.log(p.m) / Math.log(maxM)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathStr = pts.length > 0 ? `M0,${H} L${pts.join(' L')}` : `M0,${H}`;
  const last = pathPts[pathPts.length - 1];
  const rocketX = last ? (last.t / totalDur) * W : 0;
  const rocketY = last ? H - Math.min(1, Math.log(last.m) / Math.log(maxM)) * H : H;

  const tokensNow = Math.floor((winner?.baseReward || 5000) * mult);
  const isRunning = phase !== 'idle';

  const phaseLabel = {
    idle: lastWinner ? `Round #${lastWinner.roundNumber} · Winner` : 'Standby',
    scan: 'Scanning eligible wallets…',
    lock: 'Target locked',
    pre: 'Multiplier launching…',
    ascend: 'Ascending',
  }[phase];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-black to-slate-950 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px]" />

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

      <div className="relative h-[380px] w-full sm:h-[460px] md:h-[520px]">
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

        <AnimatePresence>
          {phase === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 bg-gradient-to-b from-transparent via-fuchsia-500/25 to-transparent"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-fuchsia-400 shadow-[0_0_20px_2px_rgba(232,121,249,0.9)]" />
              <div className="relative w-full px-4 sm:px-8">
                <div className="flex flex-col items-center gap-1">
                  {visible.map((v, i) => {
                    const center = v.off === 0;
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
                    );
                  })}
                </div>
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
                  <Scan className="h-3 w-3" /> scanning {fmt(holders.length)} eligible wallets
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {phase === 'ascend' && (
          <motion.div
            key="ascend"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
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
              <path d={`${pathStr} L${rocketX},${H} L0,${H} Z`} fill="url(#gfill)" opacity={crashedShown ? 0.3 : 0.7} />
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

            {!crashedShown && (
              <div className="absolute inset-x-0 bottom-4 text-center text-[11px] uppercase tracking-widest text-white/50">
                current reward:{' '}
                <span className="font-mono text-amber-300">{fmt(tokensNow)} $ANSEM</span>
              </div>
            )}

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
                      LOCKED @ {winner?.crashPoint.toFixed(2)}x
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
      </div>
    </div>
  );
}
