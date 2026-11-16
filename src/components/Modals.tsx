import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Flame,
  Lock,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import {
  BrawlerDef,
  MatchSummary,
  PlayerProgress,
  VocabCategory,
} from '../types/game';
import { BRAWLERS, EVENT_MODES } from '../data/brawlers';
import { VOCAB_BANK } from '../data/vocabBank';
import { soundEngine } from '../utils/soundEngine';

/* ==================== BRAWLER LOCKER MODAL ==================== */
interface BrawlerModalProps {
  progress: PlayerProgress;
  onClose: () => void;
  onSelectBrawler: (id: string) => void;
  onUnlockBrawler: (brawler: BrawlerDef) => void;
  onUpgradeBrawler: (brawler: BrawlerDef) => void;
}

export const BrawlerLockerModal: React.FC<BrawlerModalProps> = ({
  progress,
  onClose,
  onSelectBrawler,
  onUnlockBrawler,
  onUpgradeBrawler,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#09122C]/85 flex items-center justify-center p-4">
      <div className="brawl-panel w-full max-w-3xl rounded-2xl p-5 max-h-[88vh] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-white">Hamz’s Brawler Locker</h2>
            <p className="text-xs font-bold text-slate-300">
              Great job collecting Trophies & Coins, Hamz! Pick or power up your hero!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="brawl-btn bg-[#FF3B5C] text-white p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {BRAWLERS.map((b) => {
            const unlocked = progress.unlockedBrawlers.includes(b.id);
            const selected = progress.selectedBrawlerId === b.id;
            const lv = progress.brawlerLevels[b.id] || 1;
            const upgradeCost = lv * 55;

            return (
              <div
                key={b.id}
                className={`rounded-2xl border-[3px] border-[#09122C] p-3.5 flex flex-col gap-3 ${
                  selected ? 'bg-[#1D397A]' : 'bg-[#0F1F4A]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={b.portraitUrl}
                    alt={b.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border-[3px] border-[#09122C] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg text-white truncate">{b.name}</span>
                      {unlocked && (
                        <span className="font-mono-num text-xs font-extrabold text-[#22D3EE]">
                          LV.{lv}/5
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#FFC82C]">{b.superName}</p>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5 leading-snug">
                      {b.superDesc}
                    </p>
                  </div>
                </div>

                {unlocked ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectBrawler(b.id)}
                      className={`brawl-btn flex-1 py-2 px-3 rounded-xl font-display text-sm shadow-[0_3px_0_#09122C] cursor-pointer ${
                        selected
                          ? 'bg-[#22D37A] text-[#09122C]'
                          : 'bg-[#22D3EE] text-[#09122C]'
                      }`}
                    >
                      {selected ? 'Selected' : 'Select Hero'}
                    </button>

                    {lv < 5 && (
                      <button
                        type="button"
                        disabled={progress.coins < upgradeCost}
                        onClick={() => onUpgradeBrawler(b)}
                        className="brawl-btn bg-[#FFC82C] text-[#09122C] py-2 px-3 rounded-xl font-display text-xs flex items-center gap-1 shadow-[0_3px_0_#09122C] disabled:opacity-45 cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Power Up ({upgradeCost})</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-[#FFC82C]" />
                      Free at {b.unlockTrophies} Trophies
                    </span>
                    <button
                      type="button"
                      disabled={progress.coins < b.unlockCoins}
                      onClick={() => onUnlockBrawler(b)}
                      className="brawl-btn bg-[#FFC82C] text-[#09122C] py-2 px-3 rounded-xl font-display text-xs flex items-center gap-1 shadow-[0_3px_0_#09122C] disabled:opacity-45 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Unlock ({b.unlockCoins})</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== DAILY STREAK MODAL ==================== */
interface StreakModalProps {
  progress: PlayerProgress;
  onClose: () => void;
  onBuyShield: () => void;
}

export const DailyStreakModal: React.FC<StreakModalProps> = ({
  progress,
  onClose,
  onBuyShield,
}) => {
  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="fixed inset-0 z-50 bg-[#09122C]/85 flex items-center justify-center p-4">
      <div className="brawl-panel w-full max-w-2xl rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flame className="w-7 h-7 text-[#FF9F1C] fill-[#FF9F1C]" />
            <div>
              <h2 className="font-display text-2xl text-white">Hamz’s Daily Streak Road</h2>
              <p className="text-xs font-bold text-slate-300">
                Play 1 fun battle every day, Hamz, to earn bonus Coins and grow your streak!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="brawl-btn bg-[#FF3B5C] text-white p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Streak Summary Strip */}
        <div className="grid grid-cols-3 gap-3 bg-[#0F1F4A] border-[3px] border-[#09122C] rounded-xl p-3 text-center">
          <div>
            <div className="text-xs font-bold text-slate-300">Current Streak</div>
            <div className="font-display text-2xl text-[#FF9F1C] font-mono-num">
              {progress.currentStreak} Days
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">Best Streak</div>
            <div className="font-display text-2xl text-[#FFC82C] font-mono-num">
              {progress.bestStreak} Days
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">Streak Shields</div>
            <div className="font-display text-2xl text-[#22D3EE] font-mono-num">
              {progress.streakShields}
            </div>
          </div>
        </div>

        {/* 7-Day Reward Track */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const done = day <= progress.streakDaysClaimed;
            const coinReward = 15 + day * 5;
            return (
              <div
                key={day}
                className={`rounded-xl border-[3px] border-[#09122C] p-2 flex flex-col items-center justify-between gap-1.5 text-center ${
                  done ? 'bg-[#22D37A] text-[#09122C]' : 'bg-[#1D397A] text-white'
                }`}
              >
                <span className="font-display text-xs">Day {day}</span>
                {done ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Coins className="w-6 h-6 text-[#FFC82C]" />
                )}
                <span className="font-mono-num text-[11px] font-extrabold">+{coinReward}</span>
              </div>
            );
          })}
        </div>

        {/* Buy Streak Shield */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0F1F4A] border-[3px] border-[#09122C] rounded-xl p-3.5">
          <div className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-[#22D3EE] shrink-0" />
            <div>
              <div className="font-display text-base text-white">Streak Freeze Shield</div>
              <p className="text-xs font-semibold text-slate-300">
                Automatically saves your daily streak if you miss a day!
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={progress.coins < 80}
            onClick={onBuyShield}
            className="brawl-btn bg-[#22D3EE] text-[#09122C] px-4 py-2 rounded-xl font-display text-sm flex items-center gap-1.5 shadow-[0_3px_0_#09122C] disabled:opacity-45 shrink-0 cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>Get Shield (80)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== DAILY QUESTS MODAL ==================== */
interface QuestsModalProps {
  progress: PlayerProgress;
  onClose: () => void;
  onClaimQuest: (questId: string) => void;
}

export const DailyQuestsModal: React.FC<QuestsModalProps> = ({
  progress,
  onClose,
  onClaimQuest,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#09122C]/85 flex items-center justify-center p-4">
      <div className="brawl-panel w-full max-w-xl rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-white">Hamz’s Daily Quests</h2>
            <p className="text-xs font-bold text-slate-300">
              You are doing awesome, Hamz! Claim extra Coins & Trophies here!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="brawl-btn bg-[#FF3B5C] text-white p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {progress.dailyQuests.map((q) => {
            const ready = q.progress >= q.target && !q.claimed;
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            return (
              <div
                key={q.id}
                className="bg-[#0F1F4A] border-[3px] border-[#09122C] rounded-xl p-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-display text-base text-white">{q.title}</span>
                    <span className="font-mono-num text-xs font-extrabold text-[#FFC82C]">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#09122C] rounded-md overflow-hidden">
                    <div
                      className="h-full bg-[#22D37A] transition-transform"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-300 mt-1.5">
                    Reward: +{q.rewardCoins} Coins · +{q.rewardTrophies} Trophies
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => onClaimQuest(q.id)}
                  className={`brawl-btn px-4 py-2 rounded-xl font-display text-sm shadow-[0_3px_0_#09122C] shrink-0 ${
                    q.claimed
                      ? 'bg-slate-700 text-slate-300'
                      : ready
                      ? 'bg-[#FFC82C] text-[#09122C] cursor-pointer'
                      : 'bg-[#1D397A] text-slate-400 opacity-60'
                  }`}
                >
                  {q.claimed ? 'Claimed' : ready ? 'Claim!' : 'In Progress'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== WORD DEX MODAL ==================== */
interface WordDexModalProps {
  progress: PlayerProgress;
  onClose: () => void;
}

const CATEGORIES: ('All' | VocabCategory)[] = [
  'All',
  'Food',
  'Home',
  'School',
  'Feelings',
  'Nature',
  'Action',
];

export const WordDexModal: React.FC<WordDexModalProps> = ({ progress, onClose }) => {
  const [cat, setCat] = useState<'All' | VocabCategory>('All');
  const filtered = cat === 'All' ? VOCAB_BANK : VOCAB_BANK.filter((w) => w.category === cat);

  return (
    <div className="fixed inset-0 z-50 bg-[#09122C]/85 flex items-center justify-center p-4">
      <div className="brawl-panel w-full max-w-4xl rounded-2xl p-5 max-h-[88vh] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-white">Hamz’s Word Book</h2>
            <p className="text-xs font-bold text-slate-300">
              Tap the speaker to hear any word, Hamz! Answer a word 2 times to master it!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="brawl-btn bg-[#FF3B5C] text-white p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`brawl-btn px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                cat === c ? 'bg-[#FFC82C] text-[#09122C]' : 'bg-[#0F1F4A] text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto pr-1">
          {filtered.map((w) => {
            const stat = progress.wordMastery[w.word.toUpperCase()];
            const mastered = (stat?.correct || 0) >= 2;
            return (
              <div
                key={w.id}
                className={`rounded-xl border-[3px] border-[#09122C] p-3 flex flex-col justify-between gap-1.5 ${
                  mastered ? 'bg-[#173E4B]' : 'bg-[#0F1F4A]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base text-[#FFC82C]">{w.word}</span>
                  <div className="flex items-center gap-1.5">
                    {mastered && (
                      <span className="text-[11px] font-extrabold text-[#22D37A]">Mastered</span>
                    )}
                    <button
                      type="button"
                      onClick={() => soundEngine.speakWord(w.word)}
                      aria-label={`Pronounce ${w.word}`}
                      className="text-[#22D3EE] hover:text-white cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-200 leading-snug">{w.meaning}</p>
                <div className="text-[11px] font-bold text-slate-400">
                  {w.category} · {w.partOfSpeech} · Correct {stat?.correct || 0}x
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== PAUSE MODAL ==================== */
interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onQuit }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#09122C]/80 flex items-center justify-center p-4">
      <div className="brawl-panel w-full max-w-sm rounded-2xl p-6 flex flex-col gap-3 text-center">
        <h2 className="font-display text-3xl text-[#FFC82C] brawl-stroke">GAME PAUSED</h2>
        <p className="text-xs font-bold text-slate-300 mb-1">
          Take a quick rest, Hamz! Your Brawler is cheering for you!
        </p>

        <button
          type="button"
          onClick={onResume}
          className="brawl-btn bg-[#22D37A] text-[#09122C] py-3 rounded-xl font-display text-lg shadow-[0_4px_0_#09122C] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Resume Battle</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="brawl-btn bg-[#FFC82C] text-[#09122C] py-2.5 rounded-xl font-display text-base shadow-[0_4px_0_#09122C] flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Restart Match</span>
        </button>

        <button
          type="button"
          onClick={onQuit}
          className="brawl-btn bg-[#FF3B5C] text-white py-2.5 rounded-xl font-display text-base shadow-[0_4px_0_#09122C] cursor-pointer"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
};

/* ==================== VICTORY / DEFEAT SUMMARY MODAL ==================== */
interface MatchEndModalProps {
  summary: MatchSummary;
  newlyUnlockedBrawler: string | null;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  summary,
  newlyUnlockedBrawler,
  onPlayAgain,
  onBackToLobby,
}) => {
  const modeMeta = EVENT_MODES.find((m) => m.id === summary.mode);

  return (
    <div className="fixed inset-0 z-50 bg-[#09122C]/85 flex items-center justify-center p-4">
      <div className="brawl-panel w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 text-center">
        <div>
          <div className="text-xs font-extrabold text-[#22D3EE] mb-1">
            {modeMeta?.name || 'Arena Battle'}
          </div>
          <h2
            className={`font-display text-4xl brawl-stroke ${
              summary.won ? 'text-[#FFC82C]' : 'text-[#22D3EE]'
            }`}
          >
            {summary.won ? 'WAY TO GO, HAMZ!' : 'GREAT TRY, HAMZ!'}
          </h2>
          <p className="text-sm font-bold text-slate-200 mt-1">
            {summary.won
              ? 'Superstar English skills, Hamz! We are so proud of you!'
              : 'You learned awesome new English words today, Hamz! Ready for another round?'}
          </p>
        </div>

        {/* Daily Streak Celebration */}
        {summary.streakExtendedToday && (
          <div className="bg-[#FF9F1C] text-[#09122C] border-[3px] border-[#09122C] rounded-xl p-3 flex items-center justify-center gap-2 font-display text-base shadow-[0_4px_0_#09122C]">
            <Flame className="w-6 h-6 fill-[#09122C]" />
            <span>DAILY STREAK: {summary.newStreakCount} DAYS!</span>
          </div>
        )}

        {/* Newly Unlocked Hero Banner */}
        {newlyUnlockedBrawler && (
          <div className="bg-[#22D37A] text-[#09122C] border-[3px] border-[#09122C] rounded-xl p-3 flex items-center justify-center gap-2 font-display text-base shadow-[0_4px_0_#09122C]">
            <Sparkles className="w-5 h-5" />
            <span>NEW BRAWLER UNLOCKED: {newlyUnlockedBrawler}!</span>
          </div>
        )}

        {/* Stats Breakdown */}
        <div className="grid grid-cols-2 gap-2.5 bg-[#0F1F4A] border-[3px] border-[#09122C] rounded-xl p-3.5">
          <div>
            <div className="text-xs font-bold text-slate-300">Trophies</div>
            <div className="font-display text-2xl text-[#FFC82C] font-mono-num flex items-center justify-center gap-1">
              <Trophy className="w-5 h-5" />+{summary.trophiesDelta}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">Coins Earned</div>
            <div className="font-display text-2xl text-[#FFC82C] font-mono-num flex items-center justify-center gap-1">
              <Coins className="w-5 h-5" />+{summary.coinsEarned}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">Correct Answers</div>
            <div className="font-display text-xl text-[#22D37A] font-mono-num">
              {summary.correctCount}/{summary.totalQuestions}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">Best Combo</div>
            <div className="font-display text-xl text-[#22D3EE] font-mono-num">
              {summary.maxCombo}x
            </div>
          </div>
        </div>

        {/* Practiced Words */}
        {summary.wordsPracticed.length > 0 && (
          <div className="text-xs font-bold text-slate-300">
            Words Practiced: {summary.wordsPracticed.join(' · ')}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={onBackToLobby}
            className="brawl-btn flex-1 bg-[#1D397A] text-white py-3 rounded-xl font-display text-base shadow-[0_4px_0_#09122C] cursor-pointer"
          >
            Lobby
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="brawl-btn flex-[1.4] bg-[#FFC82C] text-[#09122C] py-3 rounded-xl font-display text-lg shadow-[0_4px_0_#09122C] cursor-pointer"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
