import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Zap, Users, Coins, ShieldCheck, Wallet } from 'lucide-react';
import {
  NeonBackground,
  Header,
  HeroCountdown,
} from '../components/AnsdropHero';
import {
  StatPill,
  HowItWorks,
  RecentWinners,
  About,
} from '../components/AnsdropSections';
import Stage from '../components/AnsdropStage';
import { fmt, API } from '../lib/ansdropUtils';

export default function Home() {
  const [msLeft, setMsLeft] = useState(0);
  const [holdersPool, setHoldersPool] = useState([]);
  const [phase, setPhase] = useState('countdown');
  const [stagePhase, setStagePhase] = useState('idle');
  const [activeWinner, setActiveWinner] = useState(null);
  const lastRoundHandledRef = useRef(0);

  const { data: state } = useQuery({
    queryKey: ['ansdrop-state'],
    queryFn: async () => (await axios.get(`${API}/state`)).data,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    axios
      .get(`${API}/holders?limit=5000`)
      .then((r) => setHoldersPool((r.data?.holders || []).map((h) => h.address)))
      .catch(() => {});
  }, []);

  const systemStatus = state?.systemStatus || 'stopped';

  // Detect new winner
  useEffect(() => {
    if (!state) return;
    if (systemStatus !== 'running') return;
    if (
      state.justPicked &&
      state.justPicked.roundNumber > lastRoundHandledRef.current &&
      phase === 'countdown'
    ) {
      lastRoundHandledRef.current = state.justPicked.roundNumber;
      setActiveWinner(state.justPicked);
      setPhase('running');
      setStagePhase('scan');
    } else if (!lastRoundHandledRef.current && state.recentWinners?.[0]) {
      lastRoundHandledRef.current = state.recentWinners[0].roundNumber;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.justPicked?.roundNumber, state?.recentWinners?.length, systemStatus]);

  // If system stops mid-round, snap back to idle
  useEffect(() => {
    if (systemStatus !== 'running' && phase !== 'countdown') {
      setPhase('countdown');
      setStagePhase('idle');
      setActiveWinner(null);
    }
  }, [systemStatus, phase]);

  // Local countdown ticker
  useEffect(() => {
    if (systemStatus !== 'running') {
      setMsLeft(0);
      return;
    }
    if (!state?.nextRoundEndsAt) return;
    const target = new Date(state.nextRoundEndsAt).getTime();
    const skew = Date.now() - (state.now || Date.now());
    const tick = () => setMsLeft(target - (Date.now() - skew));
    tick();
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [state?.nextRoundEndsAt, state?.now, systemStatus]);

  // Stage phase machine timings
  useEffect(() => {
    if (stagePhase === 'scan') {
      const t = setTimeout(() => setStagePhase('lock'), 5000);
      return () => clearTimeout(t);
    }
    if (stagePhase === 'lock') {
      const t = setTimeout(() => setStagePhase('pre'), 3200);
      return () => clearTimeout(t);
    }
    if (stagePhase === 'pre') {
      const t = setTimeout(() => setStagePhase('ascend'), 3600);
      return () => clearTimeout(t);
    }
  }, [stagePhase]);

  const handleStageFinish = () => {
    setActiveWinner(null);
    setStagePhase('idle');
    setPhase('countdown');
  };

  const scannerHolders =
    holdersPool.length > 0
      ? holdersPool
      : (state?.recentWinners || []).map((w) => w.address);

  const lastWinnerForIdle = state?.recentWinners?.[0] || null;

  const stageRef = useRef(null);
  useEffect(() => {
    if (phase !== 'running') return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;
    if (stageRef.current) {
      try {
        stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {}
    }
  }, [phase]);

  return (
    <div className="relative min-h-screen">
      <NeonBackground />
      <Header state={state} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <HeroCountdown
          msLeft={msLeft}
          intervalMs={state?.intervalMs || 120000}
          phase={phase}
          systemStatus={systemStatus}
        />

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">
          <StatPill icon={Users} label="Eligible" value={state ? fmt(state.eligibleCount) : '—'} sub={state ? `of ${fmt(state.totalHolders)} holders` : ''} tone="cyan" />
          <StatPill icon={Coins} label="Base pool" value={state ? fmt(state.baseReward) : '—'} sub="$ANSEM × multiplier" tone="amber" />
          <StatPill icon={ShieldCheck} label="Min hold" value={state ? fmt(state.minEligibleHold) : '—'} sub="$ANSEM to enter" tone="emerald" />
          <StatPill icon={Wallet} label="Total distributed" value={state ? fmt(state.totalDistributed) : '—'} sub={state ? `sent to ${fmt(state.winnersCount)} winners` : ''} tone="fuchsia" />
        </div>

        <div ref={stageRef} className="mt-5 scroll-mt-4 sm:mt-6">
          <Stage
            phase={stagePhase}
            winner={activeWinner}
            lastWinner={lastWinnerForIdle}
            holders={scannerHolders}
            onFinish={handleStageFinish}
          />
        </div>

        <HowItWorks />
        <RecentWinners winners={state?.recentWinners || []} />
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
  );
}
