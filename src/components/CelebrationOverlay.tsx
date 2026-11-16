import React, { useEffect } from 'react';
import { ArrowUpCircle, Heart, Sparkles, Star, Zap } from 'lucide-react';
import { BrawlerDef } from '../types/game';

export type CelebrationEvent =
  | { type: 'unlock'; brawler: BrawlerDef }
  | { type: 'levelup'; brawler: BrawlerDef; newLevel: number };

interface CelebrationOverlayProps {
  event: CelebrationEvent;
  onDone: () => void;
}

const CONFETTI_PIECES = [
  { left: '8%', delay: '0ms', color: '#FFC82C', size: 12 },
  { left: '16%', delay: '220ms', color: '#22D37A', size: 10 },
  { left: '25%', delay: '90ms', color: '#22D3EE', size: 14 },
  { left: '34%', delay: '380ms', color: '#FF3B5C', size: 11 },
  { left: '43%', delay: '140ms', color: '#A855F7', size: 13 },
  { left: '54%', delay: '260ms', color: '#FFC82C', size: 12 },
  { left: '63%', delay: '50ms', color: '#22D37A', size: 14 },
  { left: '72%', delay: '310ms', color: '#22D3EE', size: 10 },
  { left: '81%', delay: '170ms', color: '#FF9F1C', size: 13 },
  { left: '90%', delay: '420ms', color: '#FFC82C', size: 11 },
];

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ event, onDone }) => {
  const isUnlock = event.type === 'unlock';
  const { brawler } = event;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-[#09122C]/90 flex items-center justify-center p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={isUnlock ? 'New Brawler Unlocked' : 'Brawler Level Up'}
    >
      {/* Falling Confetti Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI_PIECES.map((c, idx) => (
          <div
            key={idx}
            className="absolute -top-4 rounded-sm border-2 border-[#09122C] animate-confetti-fall"
            style={{
              left: c.left,
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
              animationDelay: c.delay,
            }}
          />
        ))}
      </div>

      {/* Rotating Sunburst Rays Behind Hero Card */}
      <div className="pointer-events-none absolute flex items-center justify-center">
        <svg
          viewBox="0 0 400 400"
          className="w-[520px] h-[520px] opacity-25 animate-spin-rays"
          aria-hidden="true"
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            return (
              <polygon
                key={i}
                points="200,200 175,0 225,0"
                fill={isUnlock ? '#FFC82C' : '#22D3EE'}
                transform={`rotate(${angle} 200 200)`}
              />
            );
          })}
        </svg>
      </div>

      {/* Main Celebratory Reveal Card */}
      <div className="relative z-10 brawl-panel w-full max-w-md rounded-3xl p-6 text-center flex flex-col items-center gap-4 animate-celebration-pop">
        {/* Top Angled Banner */}
        <div
          className={`px-5 py-1.5 rounded-xl border-[3px] border-[#09122C] font-display text-lg sm:text-xl tracking-wide shadow-[0_4px_0_#09122C] -mt-10 ${
            isUnlock ? 'bg-[#FFC82C] text-[#09122C]' : 'bg-[#22D37A] text-[#09122C]'
          }`}
        >
          {isUnlock ? 'NEW BRAWLER UNLOCKED!' : `LEVEL UP! LV.${event.newLevel}`}
        </div>

        {/* Hero Portrait Showcase */}
        <div className="relative mt-1">
          <div
            className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-[4px] border-[#09122C] shadow-[0_6px_0_#09122C]"
            style={{ backgroundColor: brawler.accentColor }}
          >
            <img
              src={brawler.portraitUrl}
              alt={brawler.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-3 -right-3 w-11 h-11 rounded-xl bg-[#FFC82C] border-[3px] border-[#09122C] flex items-center justify-center shadow-[0_3px_0_#09122C]">
            {isUnlock ? (
              <Star className="w-6 h-6 text-[#09122C] fill-[#09122C]" />
            ) : (
              <ArrowUpCircle className="w-6 h-6 text-[#09122C]" />
            )}
          </div>
        </div>

        {/* Title & Hamz Cheer */}
        <div>
          <h2 className="font-display text-3xl sm:text-4xl text-white brawl-stroke">
            {brawler.name}
          </h2>
          <p className="text-sm font-extrabold text-[#FFC82C] mt-0.5">
            {isUnlock ? brawler.title : `${brawler.superName} Powered Up!`}
          </p>
          <p className="text-sm font-bold text-slate-200 mt-2 leading-snug">
            {isUnlock
              ? `Way to go, Hamz! ${brawler.name} joined your squad! ${brawler.superDesc}`
              : `Awesome job, Hamz! ${brawler.name} reached Level ${event.newLevel} and hits even harder!`}
          </p>
        </div>

        {/* Stat Boost Strip */}
        <div className="w-full grid grid-cols-2 gap-2.5 bg-[#0F1F4A] border-[3px] border-[#09122C] rounded-xl p-3">
          <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-[#22D37A]">
            <Heart className="w-4 h-4 fill-current" />
            <span>
              {isUnlock
                ? `${brawler.baseHp} Hearts`
                : event.newLevel % 2 === 1
                ? '+1 Heart!'
                : 'Tougher Shield!'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-[#FFC82C]">
            <Zap className="w-4 h-4 fill-current" />
            <span>{isUnlock ? `${brawler.baseDamage} Blast` : '+4 Blast Power!'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="brawl-btn w-full bg-[#FFC82C] text-[#09122C] py-3 rounded-2xl font-display text-xl shadow-[0_5px_0_#09122C] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
          <span>AWESOME, HAMZ!</span>
        </button>
      </div>
    </div>
  );
};
