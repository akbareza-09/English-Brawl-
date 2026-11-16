export type GameScreenState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export type EventModeId = 'gem_grab' | 'word_match' | 'blank_race' | 'spelling_bee';

export type ArenaTier = 'starter' | 'jungle' | 'citadel';

export type VocabCategory =
  | 'Food'
  | 'Home'
  | 'School'
  | 'Feelings'
  | 'Nature'
  | 'Action';

export interface VocabWord {
  id: string;
  word: string;
  tier: ArenaTier;
  category: VocabCategory;
  partOfSpeech: 'noun' | 'verb' | 'adjective';
  meaning: string;
  synonym: string;
  antonym: string;
  blankSentence: string; // Use ___ where the word goes
  hint: string;
}

export interface BrawlerDef {
  id: string;
  name: string;
  title: string;
  portraitUrl: string;
  accentColor: string;
  projectileColor: string;
  superName: string;
  superDesc: string;
  unlockTrophies: number;
  unlockCoins: number;
  baseHp: number;
  baseDamage: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardTrophies: number;
  claimed: boolean;
  type: 'wins' | 'correct' | 'supers' | 'minigames';
}

export interface WordMasteryEntry {
  seen: number;
  correct: number;
}

export interface PlayerProgress {
  trophies: number;
  coins: number;
  selectedBrawlerId: string;
  selectedMode: EventModeId;
  selectedTier: ArenaTier;
  unlockedBrawlers: string[];
  brawlerLevels: Record<string, number>;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
  streakDaysClaimed: number; // 1..7 cycle
  streakShields: number;
  todayCompletedBattles: number;
  questsDate: string;
  dailyQuests: DailyQuest[];
  wordMastery: Record<string, WordMasteryEntry>;
  soundMuted: boolean;
  musicMuted?: boolean;
}

export interface MatchSummary {
  won: boolean;
  mode: EventModeId;
  tier: ArenaTier;
  correctCount: number;
  totalQuestions: number;
  maxCombo: number;
  supersUsed: number;
  trophiesDelta: number;
  coinsEarned: number;
  streakExtendedToday: boolean;
  newStreakCount: number;
  wordsPracticed: string[];
}
