import { ArenaTier, DailyQuest, MatchSummary, PlayerProgress } from '../types/game';
import { BRAWLERS } from '../data/brawlers';

const STORAGE_KEY = 'word_brawlers_save_v1';

export function getLocalDateStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPreviousDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return getLocalDateStr(dt);
}

function getDaysBetween(older: string, newer: string): number {
  const [y1, m1, d1] = older.split('-').map(Number);
  const [y2, m2, d2] = newer.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

export function generateDailyQuests(dateStr: string): DailyQuest[] {
  return [
    {
      id: `q_win_${dateStr}`,
      title: 'Win 2 Arena Battles',
      target: 2,
      progress: 0,
      rewardCoins: 60,
      rewardTrophies: 12,
      claimed: false,
      type: 'wins',
    },
    {
      id: `q_words_${dateStr}`,
      title: 'Answer 10 Words Correctly',
      target: 10,
      progress: 0,
      rewardCoins: 50,
      rewardTrophies: 10,
      claimed: false,
      type: 'correct',
    },
    {
      id: `q_super_${dateStr}`,
      title: 'Unleash 2 Super Attacks',
      target: 2,
      progress: 0,
      rewardCoins: 45,
      rewardTrophies: 8,
      claimed: false,
      type: 'supers',
    },
  ];
}

export function createInitialProgress(): PlayerProgress {
  const today = getLocalDateStr();
  return {
    trophies: 15,
    coins: 50,
    selectedBrawlerId: 'lexi',
    selectedMode: 'gem_grab',
    selectedTier: 'starter',
    unlockedBrawlers: ['lexi'],
    brawlerLevels: { lexi: 1, bramble: 1, volt: 1, rex: 1 },
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
    streakDaysClaimed: 0,
    streakShields: 1,
    todayCompletedBattles: 0,
    questsDate: today,
    dailyQuests: generateDailyQuests(today),
    wordMastery: {},
    soundMuted: false,
    musicMuted: false,
  };
}

export function loadProgress(): PlayerProgress {
  const today = getLocalDateStr();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialProgress();
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const base = createInitialProgress();
    const merged: PlayerProgress = {
      ...base,
      ...parsed,
      brawlerLevels: { ...base.brawlerLevels, ...(parsed.brawlerLevels || {}) },
      wordMastery: parsed.wordMastery || {},
      unlockedBrawlers: parsed.unlockedBrawlers?.length ? parsed.unlockedBrawlers : ['lexi'],
    };

    // Refresh daily quests if new day
    if (merged.questsDate !== today) {
      merged.questsDate = today;
      merged.dailyQuests = generateDailyQuests(today);
      merged.todayCompletedBattles = 0;
    }

    // Check if streak expired (missed > 1 day without shield)
    if (merged.lastPlayedDate && merged.lastPlayedDate !== today) {
      const gap = getDaysBetween(merged.lastPlayedDate, today);
      if (gap === 2 && merged.streakShields > 0 && merged.currentStreak > 0) {
        // Consume 1 shield automatically to protect streak!
        merged.streakShields -= 1;
        merged.lastPlayedDate = getPreviousDateStr(today);
      } else if (gap > 1) {
        merged.currentStreak = 0;
        merged.streakDaysClaimed = 0;
      }
    }

    return merged;
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota issues
  }
}

export function applyMatchResult(
  prev: PlayerProgress,
  params: {
    won: boolean;
    mode: PlayerProgress['selectedMode'];
    tier: ArenaTier;
    correctCount: number;
    totalQuestions: number;
    maxCombo: number;
    supersUsed: number;
    wordsPracticed: { word: string; correct: boolean }[];
  }
): { nextProgress: PlayerProgress; summary: MatchSummary; newlyUnlockedBrawler: string | null } {
  const today = getLocalDateStr();
  const next: PlayerProgress = {
    ...prev,
    unlockedBrawlers: [...prev.unlockedBrawlers],
    brawlerLevels: { ...prev.brawlerLevels },
    dailyQuests: prev.dailyQuests.map((q) => ({ ...q })),
    wordMastery: { ...prev.wordMastery },
  };

  // Word Dex mastery update
  for (const item of params.wordsPracticed) {
    const key = item.word.toUpperCase();
    const cur = next.wordMastery[key] || { seen: 0, correct: 0 };
    next.wordMastery[key] = {
      seen: cur.seen + 1,
      correct: cur.correct + (item.correct ? 1 : 0),
    };
  }

  // Rewards calculation
  const tierBonus = params.tier === 'citadel' ? 12 : params.tier === 'jungle' ? 6 : 0;
  const trophiesDelta = params.won ? 10 + Math.floor(params.maxCombo / 2) + Math.floor(tierBonus / 2) : 2;
  let coinsEarned = params.correctCount * 5 + (params.won ? 20 + tierBonus : 8);

  // Daily Streak logic
  let streakExtendedToday = false;
  if (next.lastPlayedDate !== today) {
    streakExtendedToday = true;
    if (next.lastPlayedDate === getPreviousDateStr(today)) {
      next.currentStreak += 1;
    } else {
      next.currentStreak = 1;
    }
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
    next.lastPlayedDate = today;
    next.streakDaysClaimed = ((next.streakDaysClaimed % 7) + 1);
    // Daily streak bonus coins!
    coinsEarned += 15 + next.streakDaysClaimed * 5;
  }

  next.todayCompletedBattles += 1;
  next.trophies = Math.max(0, next.trophies + trophiesDelta);
  next.coins += coinsEarned;

  // Update daily quests
  for (const q of next.dailyQuests) {
    if (q.claimed) continue;
    if (q.type === 'wins' && params.won) {
      q.progress = Math.min(q.target, q.progress + 1);
    } else if (q.type === 'correct') {
      q.progress = Math.min(q.target, q.progress + params.correctCount);
    } else if (q.type === 'supers') {
      q.progress = Math.min(q.target, q.progress + params.supersUsed);
    } else if (q.type === 'minigames') {
      q.progress = Math.min(q.target, q.progress + 1);
    }
  }

  // Auto-unlock brawlers earned via Trophy Road
  let newlyUnlockedBrawler: string | null = null;
  for (const b of BRAWLERS) {
    if (!next.unlockedBrawlers.includes(b.id) && next.trophies >= b.unlockTrophies) {
      next.unlockedBrawlers.push(b.id);
      newlyUnlockedBrawler = b.name;
    }
  }

  saveProgress(next);

  const summary: MatchSummary = {
    won: params.won,
    mode: params.mode,
    tier: params.tier,
    correctCount: params.correctCount,
    totalQuestions: params.totalQuestions,
    maxCombo: params.maxCombo,
    supersUsed: params.supersUsed,
    trophiesDelta,
    coinsEarned,
    streakExtendedToday,
    newStreakCount: next.currentStreak,
    wordsPracticed: Array.from(new Set(params.wordsPracticed.map((w) => w.word.toUpperCase()))),
  };

  return { nextProgress: next, summary, newlyUnlockedBrawler };
}
