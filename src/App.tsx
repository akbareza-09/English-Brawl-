import { useCallback, useEffect, useState } from 'react';
import {
  ArenaTier,
  BrawlerDef,
  EventModeId,
  GameScreenState,
  MatchSummary,
  PlayerProgress,
} from './types/game';
import { BRAWLERS } from './data/brawlers';
import {
  applyMatchResult,
  loadProgress,
  saveProgress,
} from './utils/storage';
import { soundEngine } from './utils/soundEngine';
import { TitleLobby } from './components/TitleLobby';
import { BattleScreen } from './components/BattleScreen';
import {
  BrawlerLockerModal,
  DailyQuestsModal,
  DailyStreakModal,
  MatchEndModal,
  PauseModal,
  WordDexModal,
} from './components/Modals';
import { CelebrationEvent, CelebrationOverlay } from './components/CelebrationOverlay';

type ActiveModal = 'brawlers' | 'streak' | 'quests' | 'worddex' | null;

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [gameState, setGameState] = useState<GameScreenState>('TITLE_MENU');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [matchSeed, setMatchSeed] = useState(1);
  const [lastSummary, setLastSummary] = useState<MatchSummary | null>(null);
  const [newlyUnlockedBrawler, setNewlyUnlockedBrawler] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);

  useEffect(() => {
    soundEngine.setMuted(progress.soundMuted);
  }, [progress.soundMuted]);

  useEffect(() => {
    soundEngine.setMusicMuted(Boolean(progress.musicMuted));
  }, [progress.musicMuted]);

  useEffect(() => {
    if (gameState === 'TITLE_MENU') {
      soundEngine.setMusicTrack('lobby');
    } else if (gameState === 'PLAYING') {
      soundEngine.setMusicTrack('battle');
    } else {
      soundEngine.setMusicTrack('none');
    }
  }, [gameState]);

  useEffect(() => {
    const unlock = () => {
      soundEngine.unlockFromGesture();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const updateProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const selectedBrawler =
    BRAWLERS.find((b) => b.id === progress.selectedBrawlerId) || BRAWLERS[0];

  const handleToggleMute = useCallback(() => {
    updateProgress((prev) => {
      const nextMuted = !prev.soundMuted;
      soundEngine.setMuted(nextMuted);
      if (!nextMuted) soundEngine.playClick();
      return { ...prev, soundMuted: nextMuted };
    });
  }, [updateProgress]);

  const handleToggleMusic = useCallback(() => {
    updateProgress((prev) => {
      const nextMusicMuted = !prev.musicMuted;
      soundEngine.setMusicMuted(nextMusicMuted);
      soundEngine.playClick();
      return { ...prev, musicMuted: nextMusicMuted };
    });
  }, [updateProgress]);

  const handleSelectMode = useCallback(
    (mode: EventModeId) => {
      soundEngine.playClick();
      updateProgress((prev) => ({ ...prev, selectedMode: mode }));
    },
    [updateProgress]
  );

  const handleSelectTier = useCallback(
    (tier: ArenaTier) => {
      soundEngine.playClick();
      updateProgress((prev) => ({ ...prev, selectedTier: tier }));
    },
    [updateProgress]
  );

  const handleStartBattle = useCallback(() => {
    soundEngine.playClick();
    setActiveModal(null);
    setLastSummary(null);
    setNewlyUnlockedBrawler(null);
    setMatchSeed((s) => s + 1);
    setGameState('PLAYING');
  }, []);

  const handleMatchEnd = useCallback(
    (result: {
      won: boolean;
      correctCount: number;
      totalQuestions: number;
      maxCombo: number;
      supersUsed: number;
      wordsPracticed: { word: string; correct: boolean }[];
    }) => {
      const { nextProgress, summary, newlyUnlockedBrawler: unlockedName } = applyMatchResult(
        progress,
        {
          ...result,
          mode: progress.selectedMode,
          tier: progress.selectedTier,
        }
      );
      saveProgress(nextProgress);
      setProgress(nextProgress);
      setLastSummary(summary);
      setNewlyUnlockedBrawler(unlockedName);
      setGameState(result.won ? 'VICTORY' : 'GAME_OVER');

      if (unlockedName) {
        const unlockedDef = BRAWLERS.find((b) => b.name === unlockedName);
        if (unlockedDef) {
          soundEngine.playBrawlerUnlock();
          setCelebration({ type: 'unlock', brawler: unlockedDef });
        }
      }
    },
    [progress]
  );

  const handleSelectBrawler = useCallback(
    (id: string) => {
      soundEngine.playClick();
      updateProgress((prev) => ({ ...prev, selectedBrawlerId: id }));
    },
    [updateProgress]
  );

  const handleUnlockBrawler = useCallback(
    (brawler: BrawlerDef) => {
      if (progress.coins < brawler.unlockCoins || progress.unlockedBrawlers.includes(brawler.id)) {
        return;
      }
      soundEngine.playBrawlerUnlock();
      updateProgress((prev) => ({
        ...prev,
        coins: prev.coins - brawler.unlockCoins,
        unlockedBrawlers: [...prev.unlockedBrawlers, brawler.id],
        selectedBrawlerId: brawler.id,
      }));
      setCelebration({ type: 'unlock', brawler });
    },
    [progress.coins, progress.unlockedBrawlers, updateProgress]
  );

  const handleUpgradeBrawler = useCallback(
    (brawler: BrawlerDef) => {
      const lv = progress.brawlerLevels[brawler.id] || 1;
      const cost = lv * 55;
      if (lv >= 5 || progress.coins < cost) return;
      const nextLevel = lv + 1;
      soundEngine.playLevelUp();
      updateProgress((prev) => ({
        ...prev,
        coins: prev.coins - cost,
        brawlerLevels: { ...prev.brawlerLevels, [brawler.id]: nextLevel },
      }));
      setCelebration({ type: 'levelup', brawler, newLevel: nextLevel });
    },
    [progress.brawlerLevels, progress.coins, updateProgress]
  );

  const handleBuyShield = useCallback(() => {
    updateProgress((prev) => {
      if (prev.coins < 80) return prev;
      soundEngine.playGemCollect(3);
      return {
        ...prev,
        coins: prev.coins - 80,
        streakShields: prev.streakShields + 1,
      };
    });
  }, [updateProgress]);

  const handleClaimQuest = useCallback(
    (questId: string) => {
      updateProgress((prev) => {
        const q = prev.dailyQuests.find((item) => item.id === questId);
        if (!q || q.claimed || q.progress < q.target) return prev;
        soundEngine.playVictory();
        return {
          ...prev,
          coins: prev.coins + q.rewardCoins,
          trophies: prev.trophies + q.rewardTrophies,
          dailyQuests: prev.dailyQuests.map((item) =>
            item.id === questId ? { ...item, claimed: true } : item
          ),
        };
      });
    },
    [updateProgress]
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#09122C]">
      {gameState === 'TITLE_MENU' ? (
        <TitleLobby
          progress={progress}
          selectedBrawler={selectedBrawler}
          onStartBattle={handleStartBattle}
          onSelectMode={handleSelectMode}
          onSelectTier={handleSelectTier}
          onToggleMute={handleToggleMute}
          onToggleMusic={handleToggleMusic}
          onOpenModal={(m) => {
            soundEngine.playClick();
            setActiveModal(m);
          }}
        />
      ) : (
        <BattleScreen
          key={matchSeed}
          brawler={selectedBrawler}
          brawlerLevel={progress.brawlerLevels[selectedBrawler.id] || 1}
          mode={progress.selectedMode}
          tier={progress.selectedTier}
          muted={progress.soundMuted}
          musicMuted={Boolean(progress.musicMuted)}
          onToggleMute={handleToggleMute}
          onToggleMusic={handleToggleMusic}
          paused={gameState !== 'PLAYING'}
          onPause={() =>
            setGameState((cur) => (cur === 'PLAYING' ? 'PAUSED' : cur === 'PAUSED' ? 'PLAYING' : cur))
          }
          onMatchEnd={handleMatchEnd}
        />
      )}

      {/* Lobby Modals */}
      {gameState === 'TITLE_MENU' && activeModal === 'brawlers' && (
        <BrawlerLockerModal
          progress={progress}
          onClose={() => setActiveModal(null)}
          onSelectBrawler={handleSelectBrawler}
          onUnlockBrawler={handleUnlockBrawler}
          onUpgradeBrawler={handleUpgradeBrawler}
        />
      )}

      {gameState === 'TITLE_MENU' && activeModal === 'streak' && (
        <DailyStreakModal
          progress={progress}
          onClose={() => setActiveModal(null)}
          onBuyShield={handleBuyShield}
        />
      )}

      {gameState === 'TITLE_MENU' && activeModal === 'quests' && (
        <DailyQuestsModal
          progress={progress}
          onClose={() => setActiveModal(null)}
          onClaimQuest={handleClaimQuest}
        />
      )}

      {gameState === 'TITLE_MENU' && activeModal === 'worddex' && (
        <WordDexModal progress={progress} onClose={() => setActiveModal(null)} />
      )}

      {/* Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={() => setGameState('PLAYING')}
          onRestart={handleStartBattle}
          onQuit={() => setGameState('TITLE_MENU')}
        />
      )}

      {/* Victory / Defeat End Modal */}
      {(gameState === 'VICTORY' || gameState === 'GAME_OVER') && lastSummary && (
        <MatchEndModal
          summary={lastSummary}
          newlyUnlockedBrawler={newlyUnlockedBrawler}
          onPlayAgain={handleStartBattle}
          onBackToLobby={() => setGameState('TITLE_MENU')}
        />
      )}

      {/* Celebratory Level-Up / Brawler Unlock Overlay */}
      {celebration && (
        <CelebrationOverlay event={celebration} onDone={() => setCelebration(null)} />
      )}
    </div>
  );
}
