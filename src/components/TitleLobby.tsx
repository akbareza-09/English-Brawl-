import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarCheck,
  Coins,
  Flame,
  Music,
  Play,
  Shield,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ArenaTier, BrawlerDef, EventModeId, PlayerProgress } from '../types/game';
import { ARENA_TIERS, EVENT_MODES } from '../data/brawlers';
import { getLocalDateStr } from '../utils/storage';

interface TitleLobbyProps {
  progress: PlayerProgress;
  selectedBrawler: BrawlerDef;
  onStartBattle: () => void;
  onSelectMode: (mode: EventModeId) => void;
  onSelectTier: (tier: ArenaTier) => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onOpenModal: (modal: 'brawlers' | 'streak' | 'quests' | 'worddex') => void;
}

export const TitleLobby: React.FC<TitleLobbyProps> = ({
  progress,
  selectedBrawler,
  onStartBattle,
  onSelectMode,
  onSelectTier,
  onToggleMute,
  onToggleMusic,
  onOpenModal,
}) => {
  const [bgFailed, setBgFailed] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);

  const today = getLocalDateStr();
  const playedToday = progress.lastPlayedDate === today;
  const claimableQuests = progress.dailyQuests.filter(
    (q) => !q.claimed && q.progress >= q.target
  ).length;
  const brawlerLevel = progress.brawlerLevels[selectedBrawler.id] || 1;
  const masteredWordsCount = Object.values(progress.wordMastery).filter(
    (w) => w.correct >= 2
  ).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' && document.activeElement?.id !== 'start-battle-btn') {
          return;
        }
        e.preventDefault();
        onStartBattle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartBattle]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09122C] flex flex-col justify-between">
      {/* Full-Viewport Key Art Backdrop */}
      {!bgFailed && (
        <img
          src="/src/assets/images/title_arena_backdrop_1794833177437.jpg"
          alt="Word Brawlers Canyon Arena"
          referrerPolicy="no-referrer"
          onError={() => setBgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center scale-105"
        />
      )}

      {/* Measured Scrim for Crisp Readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(110deg, rgba(9,18,44,0.92) 0%, rgba(9,18,44,0.72) 48%, rgba(9,18,44,0.58) 100%)',
        }}
      />

      {/* TOP PERIMETER STATUS BAR */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-4 sm:px-7 pt-3 sm:pt-4">
        {/* Left: Trophy & Coin Readouts */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2 bg-[#13265A]/95 border-[3px] border-[#09122C] rounded-xl px-3 py-1.5 shadow-[0_3px_0_#09122C]">
            <Trophy className="w-5 h-5 text-[#FFC82C]" />
            <span className="font-display text-base sm:text-lg text-white font-mono-num">
              {progress.trophies}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#13265A]/95 border-[3px] border-[#09122C] rounded-xl px-3 py-1.5 shadow-[0_3px_0_#09122C]">
            <Coins className="w-5 h-5 text-[#FFC82C]" />
            <span className="font-display text-base sm:text-lg text-white font-mono-num">
              {progress.coins}
            </span>
          </div>
        </div>

        {/* Right: Daily Streak Button & Mute */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onOpenModal('streak')}
            className="brawl-btn bg-[#13265A] text-white px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-[0_3px_0_#09122C] cursor-pointer"
          >
            <Flame
              className={`w-5 h-5 ${
                playedToday ? 'text-[#FF9F1C] fill-[#FF9F1C]' : 'text-slate-300'
              }`}
            />
            <span className="font-display text-base font-mono-num">
              {progress.currentStreak}d
            </span>
            <span className="hidden md:inline text-xs font-extrabold text-slate-200">
              {playedToday ? 'Awesome, Hamz!' : 'Play Today, Hamz!'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMusic}
            aria-label={progress.musicMuted ? 'Turn music on' : 'Turn music off'}
            title={progress.musicMuted ? 'Music Off' : 'Music On'}
            className={`brawl-btn p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer ${
              progress.musicMuted ? 'bg-[#13265A] text-slate-400' : 'bg-[#22D3EE] text-[#09122C]'
            }`}
          >
            <Music className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={progress.soundMuted ? 'Unmute audio' : 'Mute audio'}
            title={progress.soundMuted ? 'Sound Off' : 'Sound On'}
            className="brawl-btn bg-[#13265A] text-white p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer"
          >
            {progress.soundMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN LOBBY CONTENT */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-7 py-3 flex flex-col lg:flex-row items-center justify-between gap-6 overflow-y-auto lg:overflow-hidden">
        {/* LEFT ZONE: Bespoke SVG Title Lockup + Brawler Hero + Primary Start CTA */}
        <div className="w-full lg:w-[46%] flex flex-col items-start gap-4">
          {/* Bespoke SVG Title Lockup */}
          <div className="w-full max-w-[430px]">
            <svg
              viewBox="0 0 460 118"
              className="w-full h-auto drop-shadow-[0_6px_0_rgba(9,18,44,0.95)]"
              role="img"
              aria-label="Word Brawlers"
            >
              <defs>
                <linearGradient id="goldTitleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFE45E" />
                  <stop offset="55%" stopColor="#FFC82C" />
                  <stop offset="100%" stopColor="#FF8C1A" />
                </linearGradient>
                <linearGradient id="cyanTitleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#BAE6FD" />
                </linearGradient>
              </defs>
              {/* Star Crest */}
              <polygon
                points="46,16 55,34 75,37 60,51 64,71 46,61 28,71 32,51 17,37 37,34"
                fill="#FFC82C"
                stroke="#09122C"
                strokeWidth="6"
                strokeLinejoin="round"
              />
              <text
                x="88"
                y="50"
                fontFamily="Lilita One, sans-serif"
                fontSize="44"
                fill="url(#cyanTitleGrad)"
                stroke="#09122C"
                strokeWidth="8"
                paintOrder="stroke"
                letterSpacing="2"
              >
                WORD
              </text>
              <text
                x="24"
                y="102"
                fontFamily="Lilita One, sans-serif"
                fontSize="56"
                fill="url(#goldTitleGrad)"
                stroke="#09122C"
                strokeWidth="10"
                paintOrder="stroke"
                letterSpacing="2"
              >
                BRAWLERS
              </text>
            </svg>
            <div className="inline-block bg-[#22D37A] text-[#09122C] border-[3px] border-[#09122C] rounded-xl px-3.5 py-1 font-display text-sm sm:text-base shadow-[0_3px_0_#09122C] mb-1">
              Hi Hamz! You are going to do great today!
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-200 mt-1 max-w-md">
              Learn everyday English words, blast rival bots, and build your daily streak, Hamz!
            </p>
          </div>

          {/* Active Brawler Card */}
          <div className="w-full max-w-md brawl-panel rounded-2xl p-3.5 flex items-center gap-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-[3px] border-[#09122C] bg-[#1D397A] shrink-0 animate-float-slow">
              {!portraitFailed ? (
                <img
                  src={selectedBrawler.portraitUrl}
                  alt={selectedBrawler.name}
                  referrerPolicy="no-referrer"
                  onError={() => setPortraitFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-2xl text-[#FFC82C]">
                  {selectedBrawler.name[0]}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl sm:text-2xl text-white brawl-stroke-sm truncate">
                  {selectedBrawler.name}
                </h2>
                <span className="font-mono-num text-xs font-extrabold text-[#22D3EE] shrink-0">
                  LV.{brawlerLevel}
                </span>
              </div>
              <p className="text-xs font-bold text-[#FFC82C] mb-1">
                {selectedBrawler.title} · {selectedBrawler.superName}
              </p>
              <p className="text-xs font-semibold text-slate-300 leading-snug line-clamp-2">
                {selectedBrawler.superDesc}
              </p>
            </div>
          </div>

          {/* Primary Start CTA + Secondary Dock */}
          <div className="w-full max-w-md flex flex-col gap-3">
            <button
              id="start-battle-btn"
              type="button"
              onClick={onStartBattle}
              className="brawl-btn w-full bg-[#FFC82C] text-[#09122C] py-3.5 px-6 rounded-2xl font-display text-2xl sm:text-3xl tracking-wide shadow-[0_6px_0_#09122C] flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-7 h-7 fill-[#09122C]" />
              <span>PLAY BATTLE</span>
            </button>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onOpenModal('brawlers')}
                className="brawl-btn bg-[#1D397A] text-white py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center gap-1 shadow-[0_4px_0_#09122C] cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#22D3EE]" />
                <span className="whitespace-nowrap">Brawlers</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenModal('streak')}
                className="brawl-btn bg-[#1D397A] text-white py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center gap-1 shadow-[0_4px_0_#09122C] cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 text-[#FF9F1C]" />
                <span className="whitespace-nowrap">Streaks</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenModal('quests')}
                className="relative brawl-btn bg-[#1D397A] text-white py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center gap-1 shadow-[0_4px_0_#09122C] cursor-pointer"
              >
                <Target className="w-4 h-4 text-[#22D37A]" />
                <span className="whitespace-nowrap">
                  Quests{claimableQuests > 0 ? ` (${claimableQuests})` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenModal('worddex')}
                className="brawl-btn bg-[#1D397A] text-white py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center gap-1 shadow-[0_4px_0_#09122C] cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#A855F7]" />
                <span className="whitespace-nowrap">Words ({masteredWordsCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT ZONE: Event Mini-Game Selector + Arena Difficulty */}
        <div className="w-full lg:w-[50%] flex flex-col gap-3">
          <div className="brawl-panel rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-white">Choose Mini-Game Event</h3>
              <span className="text-xs font-bold text-slate-300">4 Modes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EVENT_MODES.map((ev) => {
                const active = progress.selectedMode === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectMode(ev.id)}
                    className={`brawl-btn rounded-xl p-3 text-left flex flex-col justify-between gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-[#FFFDF7] text-[#09122C] shadow-[0_4px_0_#09122C]'
                        : 'bg-[#1D397A] text-white shadow-[0_4px_0_#09122C] hover:bg-[#244591]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base leading-tight">{ev.name}</span>
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border border-[#09122C]"
                        style={{ backgroundColor: ev.accentHex }}
                      />
                    </div>
                    <p
                      className={`text-xs font-bold leading-snug ${
                        active ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {ev.shortDesc}
                    </p>
                    <span
                      className={`text-[11px] font-extrabold ${
                        active ? 'text-[#0284C7]' : 'text-[#FFC82C]'
                      }`}
                    >
                      {ev.roundsLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty World Selector */}
          <div className="brawl-panel rounded-2xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#22D3EE]" />
                <span>Word World</span>
              </h3>
              <span className="text-xs font-bold text-slate-300">Start Easy & Grow!</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {ARENA_TIERS.map((t) => {
                const active = progress.selectedTier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTier(t.id)}
                    className={`brawl-btn rounded-xl py-2 px-2.5 text-center shadow-[0_3px_0_#09122C] cursor-pointer ${
                      active ? 'bg-[#22D37A] text-[#09122C]' : 'bg-[#1D397A] text-white'
                    }`}
                  >
                    <div className="font-display text-sm leading-tight truncate">{t.name}</div>
                    <div
                      className={`text-[11px] font-extrabold ${
                        active ? 'text-[#09122C]/80' : 'text-slate-300'
                      }`}
                    >
                      {t.ageRange}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM SINGLE CONTROL-HINT LINE */}
      <footer className="relative z-10 text-center text-xs font-bold text-slate-300 pb-2.5 px-4">
        Enter or Click Play Battle · 1–4 Answer Keys · Space Super Attack · Esc Pause
      </footer>
    </div>
  );
};
