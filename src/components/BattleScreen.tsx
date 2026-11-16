import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Flame,
  Gem,
  Heart,
  HelpCircle,
  Music,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ArenaTier,
  BrawlerDef,
  EventModeId,
  VocabWord,
} from '../types/game';
import { ARENA_TIERS, EVENT_MODES } from '../data/brawlers';
import { getWordsForTier, shuffleArray } from '../data/vocabBank';
import { ArenaCanvas, ArenaCanvasHandle } from './ArenaCanvas';
import { soundEngine } from '../utils/soundEngine';

interface BattleScreenProps {
  brawler: BrawlerDef;
  brawlerLevel: number;
  mode: EventModeId;
  tier: ArenaTier;
  muted: boolean;
  musicMuted: boolean;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onPause: () => void;
  paused: boolean;
  onMatchEnd: (result: {
    won: boolean;
    correctCount: number;
    totalQuestions: number;
    maxCombo: number;
    supersUsed: number;
    wordsPracticed: { word: string; correct: boolean }[];
  }) => void;
}

interface QuizItem {
  vocab: VocabWord;
  promptType: 'meaning' | 'synonym' | 'antonym' | 'blank';
  questionText: string;
  options: string[];
  correctAnswer: string;
}

interface MatchPairWave {
  words: VocabWord[];
  shuffledClues: VocabWord[];
}

interface LetterTile {
  id: string;
  char: string;
  used: boolean;
}

function buildQuizDeck(pool: VocabWord[], count: number, mode: EventModeId): QuizItem[] {
  const chosen = shuffleArray(pool).slice(0, count);
  return chosen.map((target) => {
    const distractors = shuffleArray(pool.filter((w) => w.id !== target.id)).slice(0, 3);
    let promptType: QuizItem['promptType'] = 'meaning';
    let questionText = '';
    let correctAnswer = '';
    let options: string[] = [];

    if (mode === 'blank_race') {
      promptType = 'blank';
      questionText = target.blankSentence;
      correctAnswer = target.word;
      options = shuffleArray([target.word, ...distractors.map((d) => d.word)]);
    } else {
      const roll = Math.random();
      if (roll < 0.45) {
        promptType = 'meaning';
        questionText = `What does "${target.word}" mean?`;
        correctAnswer = target.meaning;
        options = shuffleArray([target.meaning, ...distractors.map((d) => d.meaning)]);
      } else if (roll < 0.75) {
        promptType = 'synonym';
        questionText = `Which word means the SAME as "${target.word}"?`;
        correctAnswer = target.synonym;
        options = shuffleArray([target.synonym, ...distractors.map((d) => d.synonym)]);
      } else {
        promptType = 'antonym';
        questionText = `Which word is the OPPOSITE of "${target.word}"?`;
        correctAnswer = target.antonym;
        options = shuffleArray([target.antonym, ...distractors.map((d) => d.antonym)]);
      }
    }

    return { vocab: target, promptType, questionText, options, correctAnswer };
  });
}

const HAMZ_PRAISE = [
  'Awesome job, Hamz!',
  'Way to go, Hamz!',
  'Super smart, Hamz!',
  'You got it, Hamz!',
  'Amazing, Hamz!',
  'Keep shining, Hamz!',
];

function getHamzPraise(combo: number): string {
  return HAMZ_PRAISE[combo % HAMZ_PRAISE.length];
}

function buildSpellingTiles(word: string, tier: ArenaTier): LetterTile[] {
  const letters = word.toUpperCase().split('');
  const extraCount = tier === 'citadel' ? 1 : 0;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < extraCount; i++) {
    letters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
  }
  return shuffleArray(
    letters.map((char, idx) => ({
      id: `${char}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      char,
      used: false,
    }))
  );
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  brawler,
  brawlerLevel,
  mode,
  tier,
  muted,
  musicMuted,
  onToggleMute,
  onToggleMusic,
  onPause,
  paused,
  onMatchEnd,
}) => {
  const arenaRef = useRef<ArenaCanvasHandle | null>(null);
  const tierMeta = ARENA_TIERS.find((t) => t.id === tier) || ARENA_TIERS[0];
  const modeMeta = EVENT_MODES.find((m) => m.id === mode) || EVENT_MODES[0];

  const maxPlayerHp = brawler.baseHp + Math.floor((brawlerLevel - 1) / 2);
  const playerDamage = brawler.baseDamage + (brawlerLevel - 1) * 4;
  const maxEnemyHp = mode === 'spelling_bee' ? 140 : 120;

  const wordPool = useMemo(() => getWordsForTier(tier), [tier]);

  // Core battle stats
  const [playerHp, setPlayerHp] = useState(maxPlayerHp);
  const [enemyHp, setEnemyHp] = useState(maxEnemyHp);
  const [playerGems, setPlayerGems] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [superCharge, setSuperCharge] = useState(0); // 0..100
  const [supersUsed, setSupersUsed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wordsPracticed, setWordsPracticed] = useState<{ word: string; correct: boolean }[]>([]);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'correct' | 'wrong' | 'super';
    title: string;
    detail: string;
  } | null>(null);
  const [roundLocked, setRoundLocked] = useState(false);
  const [matchFinished, setMatchFinished] = useState(false);

  // Quiz / Blank Race state
  const quizDeck = useMemo(
    () => (mode === 'gem_grab' || mode === 'blank_race' ? buildQuizDeck(wordPool, 6, mode) : []),
    [wordPool, mode]
  );
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  // Race progress (for blank_race)
  const [playerRacePct, setPlayerRacePct] = useState(0);
  const [enemyRacePct, setEnemyRacePct] = useState(0);

  // Word-Match Showdown state (2 waves of 4 pairs)
  const matchWaves = useMemo<MatchPairWave[]>(() => {
    if (mode !== 'word_match') return [];
    const picked = shuffleArray(wordPool).slice(0, 8);
    return [
      { words: picked.slice(0, 4), shuffledClues: shuffleArray(picked.slice(0, 4)) },
      { words: picked.slice(4, 8), shuffledClues: shuffleArray(picked.slice(4, 8)) },
    ];
  }, [wordPool, mode]);
  const [waveIndex, setWaveIndex] = useState(0);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongPairFlash, setWrongPairFlash] = useState<string | null>(null);

  // Spelling Bee Boss state (5 words)
  const spellingWords = useMemo(
    () => (mode === 'spelling_bee' ? shuffleArray(wordPool).slice(0, 5) : []),
    [wordPool, mode]
  );
  const [spellIndex, setSpellIndex] = useState(0);
  const [tilePool, setTilePool] = useState<LetterTile[]>(() =>
    spellingWords[0] ? buildSpellingTiles(spellingWords[0].word, tier) : []
  );
  const [placedTileIds, setPlacedTileIds] = useState<string[]>([]);
  const [hintsUsedThisWord, setHintsUsedThisWord] = useState(0);

  // Sync HP & Race progress to isolated Canvas
  useEffect(() => {
    arenaRef.current?.setHpState(playerHp, maxPlayerHp, enemyHp, maxEnemyHp);
  }, [playerHp, maxPlayerHp, enemyHp, maxEnemyHp]);

  useEffect(() => {
    arenaRef.current?.setRaceProgress(playerRacePct, enemyRacePct);
  }, [playerRacePct, enemyRacePct]);

  // Speak Spelling Bee word automatically on new word
  useEffect(() => {
    if (mode === 'spelling_bee' && spellingWords[spellIndex] && !matchFinished) {
      const t = setTimeout(() => {
        soundEngine.speakWord(spellingWords[spellIndex].word);
      }, 280);
      return () => clearTimeout(t);
    }
  }, [mode, spellIndex, spellingWords, matchFinished]);

  // Finish helper
  const finishMatch = useCallback(
    (won: boolean, finalCorrect: number, totalQ: number, bestC: number, supers: number, practiced: { word: string; correct: boolean }[]) => {
      if (matchFinished) return;
      setMatchFinished(true);
      if (won) soundEngine.playVictory();
      else soundEngine.playDefeat();
      setTimeout(() => {
        onMatchEnd({
          won,
          correctCount: finalCorrect,
          totalQuestions: totalQ,
          maxCombo: bestC,
          supersUsed: supers,
          wordsPracticed: practiced,
        });
      }, 700);
    },
    [matchFinished, onMatchEnd]
  );

  // Rival Bot pace timer in Fill-in-the-Blanks Race (gentle for first-time learners)
  useEffect(() => {
    if (mode !== 'blank_race' || paused || matchFinished) return;
    const interval = setInterval(() => {
      setEnemyRacePct((prev) => {
        const speed = tier === 'starter' ? 0.65 : tier === 'jungle' ? 0.9 : 1.15;
        const next = Math.min(100, prev + speed);
        if (next >= 100) {
          finishMatch(false, correctCount, quizDeck.length, maxCombo, supersUsed, wordsPracticed);
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [mode, paused, matchFinished, tier, finishMatch, correctCount, quizDeck.length, maxCombo, supersUsed, wordsPracticed]);

  // Super Attack Handler
  const handleUseSuper = useCallback(() => {
    if (superCharge < 100 || paused || matchFinished || roundLocked) return;
    soundEngine.playSuperBlast();
    const superDmg = Math.round(playerDamage * 1.9);
    arenaRef.current?.fireSuperAttack(superDmg);
    setSuperCharge(0);
    setSupersUsed((s) => s + 1);
    setPlayerHp((hp) => Math.min(maxPlayerHp, hp + 1));
    setPlayerGems((g) => g + 2);
    setEnemyHp((hp) => Math.max(0, hp - superDmg));
    if (mode === 'blank_race') {
      setPlayerRacePct((p) => Math.min(100, p + 16));
      setEnemyRacePct((e) => Math.max(0, e - 10));
    }
    setFeedbackBanner({
      type: 'super',
      title: `MEGA BLAST, HAMZ! (${brawler.superName})`,
      detail: `+1 Heart healed · +2 Gems · You rock, Hamz!`,
    });
    setTimeout(() => setFeedbackBanner(null), 1600);
  }, [superCharge, paused, matchFinished, roundLocked, playerDamage, maxPlayerHp, mode, brawler.superName]);

  // Handle Quiz / Fill-in-the-Blank Answer
  const handleQuizAnswer = useCallback(
    (option: string) => {
      if (roundLocked || paused || matchFinished) return;
      const item = quizDeck[quizIndex];
      if (!item) return;

      setRoundLocked(true);
      setSelectedOption(option);

      const isCorrect = option === item.correctAnswer;
      const elapsedSec = (Date.now() - questionStartRef.current) / 1000;
      const isCrit = isCorrect && elapsedSec < 4.5;

      const nextPracticed = [...wordsPracticed, { word: item.vocab.word, correct: isCorrect }];
      setWordsPracticed(nextPracticed);

      let nextCorrect = correctCount;
      let nextCombo = combo;
      let nextMaxCombo = maxCombo;
      let nextPlayerHp = playerHp;
      let nextEnemyHp = enemyHp;
      let nextRacePct = playerRacePct;

      if (isCorrect) {
        nextCorrect += 1;
        nextCombo += 1;
        nextMaxCombo = Math.max(maxCombo, nextCombo);
        setCorrectCount(nextCorrect);
        setCombo(nextCombo);
        setMaxCombo(nextMaxCombo);

        const dmg = isCrit ? Math.round(playerDamage * 1.35) : playerDamage;
        nextEnemyHp = Math.max(0, enemyHp - dmg);
        setEnemyHp(nextEnemyHp);
        setPlayerGems((g) => g + (isCrit ? 2 : 1));
        setSuperCharge((sc) => {
          const updated = Math.min(100, sc + 35);
          if (updated === 100 && sc < 100) soundEngine.playSuperReady();
          return updated;
        });

        if (mode === 'blank_race') {
          nextRacePct = Math.min(100, playerRacePct + (isCrit ? 22 : 18));
          setPlayerRacePct(nextRacePct);
        }

        soundEngine.playBlast(nextCombo);
        setTimeout(() => soundEngine.playGemCollect(nextCombo), 130);
        arenaRef.current?.firePlayerAttack(dmg, isCrit);

        setFeedbackBanner({
          type: 'correct',
          title: isCrit ? `Lightning Speed, Hamz! (${item.vocab.word})` : `${getHamzPraise(nextCombo)} (${item.vocab.word})`,
          detail: item.vocab.meaning,
        });
      } else {
        nextCombo = 0;
        setCombo(0);
        nextPlayerHp = Math.max(0, playerHp - 1);
        setPlayerHp(nextPlayerHp);
        soundEngine.playWrong();
        arenaRef.current?.fireEnemyAttack();

        setFeedbackBanner({
          type: 'wrong',
          title: `Nice try, Hamz! Answer: "${item.correctAnswer}"`,
          detail: `${item.vocab.word} = ${item.vocab.meaning}`,
        });
      }

      setTimeout(() => {
        setFeedbackBanner(null);
        setSelectedOption(null);
        setRoundLocked(false);

        if (nextPlayerHp <= 0) {
          finishMatch(false, nextCorrect, quizDeck.length, nextMaxCombo, supersUsed, nextPracticed);
          return;
        }
        if (mode === 'blank_race' && nextRacePct >= 100) {
          finishMatch(true, nextCorrect, quizDeck.length, nextMaxCombo, supersUsed, nextPracticed);
          return;
        }
        if (quizIndex + 1 >= quizDeck.length) {
          const won =
            mode === 'blank_race'
              ? nextRacePct >= enemyRacePct
              : nextCorrect >= Math.ceil(quizDeck.length * 0.5);
          finishMatch(won, nextCorrect, quizDeck.length, nextMaxCombo, supersUsed, nextPracticed);
          return;
        }
        setQuizIndex((i) => i + 1);
        questionStartRef.current = Date.now();
      }, isCorrect ? 950 : 1650);
    },
    [
      roundLocked,
      paused,
      matchFinished,
      quizDeck,
      quizIndex,
      wordsPracticed,
      correctCount,
      combo,
      maxCombo,
      playerHp,
      enemyHp,
      playerRacePct,
      enemyRacePct,
      playerDamage,
      mode,
      supersUsed,
      finishMatch,
    ]
  );

  // Word-Match Showdown Handler
  const handleSelectClue = useCallback(
    (clueWord: VocabWord) => {
      if (!selectedWordId || paused || matchFinished || roundLocked) return;
      const wave = matchWaves[waveIndex];
      if (!wave || matchedIds.includes(clueWord.id)) return;

      const isMatch = selectedWordId === clueWord.id;
      const targetWord = wave.words.find((w) => w.id === selectedWordId);

      if (isMatch && targetWord) {
        const nextMatched = [...matchedIds, clueWord.id];
        const nextCorrect = correctCount + 1;
        const nextCombo = combo + 1;
        const nextMaxCombo = Math.max(maxCombo, nextCombo);
        const nextPracticed = [...wordsPracticed, { word: targetWord.word, correct: true }];

        setMatchedIds(nextMatched);
        setSelectedWordId(null);
        setCorrectCount(nextCorrect);
        setCombo(nextCombo);
        setMaxCombo(nextMaxCombo);
        setWordsPracticed(nextPracticed);

        const dmg = Math.round(playerDamage * 0.75);
        setEnemyHp((hp) => Math.max(0, hp - dmg));
        setPlayerGems((g) => g + 1);
        setSuperCharge((sc) => {
          const updated = Math.min(100, sc + 25);
          if (updated === 100 && sc < 100) soundEngine.playSuperReady();
          return updated;
        });

        soundEngine.playBlast(nextCombo);
        arenaRef.current?.firePlayerAttack(dmg, nextCombo >= 3, `${targetWord.word}!`);

        // Wave complete?
        if (nextMatched.length >= wave.words.length) {
          setRoundLocked(true);
          setFeedbackBanner({
            type: 'correct',
            title: `Wave ${waveIndex + 1} Cleared, Hamz!`,
            detail: waveIndex + 1 < matchWaves.length ? 'Awesome matching! Wave 2 coming up!' : 'You did it, Hamz!',
          });
          setTimeout(() => {
            setFeedbackBanner(null);
            setRoundLocked(false);
            if (waveIndex + 1 >= matchWaves.length) {
              finishMatch(true, nextCorrect, 8, nextMaxCombo, supersUsed, nextPracticed);
            } else {
              setWaveIndex((w) => w + 1);
              setMatchedIds([]);
            }
          }, 900);
        }
      } else {
        setCombo(0);
        const nextHp = Math.max(0, playerHp - 1);
        setPlayerHp(nextHp);
        setWrongPairFlash(clueWord.id);
        soundEngine.playWrong();
        arenaRef.current?.fireEnemyAttack();
        if (targetWord) {
          setWordsPracticed((p) => [...p, { word: targetWord.word, correct: false }]);
          setFeedbackBanner({
            type: 'wrong',
            title: `Keep going, Hamz! Hint for ${targetWord.word}:`,
            detail: targetWord.hint,
          });
        }
        setTimeout(() => {
          setWrongPairFlash(null);
          setFeedbackBanner(null);
          if (nextHp <= 0) {
            finishMatch(false, correctCount, 8, maxCombo, supersUsed, wordsPracticed);
          }
        }, 1200);
      }
    },
    [
      selectedWordId,
      paused,
      matchFinished,
      roundLocked,
      matchWaves,
      waveIndex,
      matchedIds,
      correctCount,
      combo,
      maxCombo,
      wordsPracticed,
      playerDamage,
      playerHp,
      supersUsed,
      finishMatch,
    ]
  );

  // Spelling Bee Handlers
  const currentSpellWord = spellingWords[spellIndex];

  const handleTapTile = useCallback(
    (tileId: string) => {
      if (paused || matchFinished || roundLocked || !currentSpellWord) return;
      if (placedTileIds.length >= currentSpellWord.word.length) return;
      const tile = tilePool.find((t) => t.id === tileId);
      if (!tile || tile.used) return;

      soundEngine.playClick();
      setTilePool((prev) => prev.map((t) => (t.id === tileId ? { ...t, used: true } : t)));
      setPlacedTileIds((prev) => [...prev, tileId]);
    },
    [paused, matchFinished, roundLocked, currentSpellWord, placedTileIds.length, tilePool]
  );

  const handleRemoveLastTile = useCallback(() => {
    if (paused || matchFinished || roundLocked || placedTileIds.length === 0) return;
    const lastId = placedTileIds[placedTileIds.length - 1];
    soundEngine.playClick();
    setPlacedTileIds((prev) => prev.slice(0, -1));
    setTilePool((prev) => prev.map((t) => (t.id === lastId ? { ...t, used: false } : t)));
  }, [paused, matchFinished, roundLocked, placedTileIds]);

  const handleClearTiles = useCallback(() => {
    if (paused || matchFinished || roundLocked) return;
    setPlacedTileIds([]);
    setTilePool((prev) => prev.map((t) => ({ ...t, used: false })));
  }, [paused, matchFinished, roundLocked]);

  const handleSpellHint = useCallback(() => {
    if (paused || matchFinished || roundLocked || !currentSpellWord) return;
    const nextIdx = placedTileIds.length;
    if (nextIdx >= currentSpellWord.word.length) return;
    const neededChar = currentSpellWord.word[nextIdx].toUpperCase();
    const matchingUnused = tilePool.find((t) => !t.used && t.char === neededChar);
    if (matchingUnused) {
      setHintsUsedThisWord((h) => h + 1);
      handleTapTile(matchingUnused.id);
    }
  }, [paused, matchFinished, roundLocked, currentSpellWord, placedTileIds.length, tilePool, handleTapTile]);

  const handleSubmitSpelling = useCallback(() => {
    if (paused || matchFinished || roundLocked || !currentSpellWord) return;
    const spelled = placedTileIds
      .map((id) => tilePool.find((t) => t.id === id)?.char || '')
      .join('');
    if (spelled.length < currentSpellWord.word.length) return;

    setRoundLocked(true);
    const isCorrect = spelled.toUpperCase() === currentSpellWord.word.toUpperCase();
    const nextPracticed = [...wordsPracticed, { word: currentSpellWord.word, correct: isCorrect }];
    setWordsPracticed(nextPracticed);

    let nextCorrect = correctCount;
    let nextCombo = combo;
    let nextMaxCombo = maxCombo;
    let nextHp = playerHp;

    if (isCorrect) {
      nextCorrect += 1;
      nextCombo += 1;
      nextMaxCombo = Math.max(maxCombo, nextCombo);
      setCorrectCount(nextCorrect);
      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);

      const dmg = hintsUsedThisWord === 0 ? Math.round(playerDamage * 1.4) : playerDamage;
      setEnemyHp((hp) => Math.max(0, hp - dmg));
      setPlayerGems((g) => g + 2);
      setSuperCharge((sc) => {
        const updated = Math.min(100, sc + 40);
        if (updated === 100 && sc < 100) soundEngine.playSuperReady();
        return updated;
      });

      soundEngine.playBlast(nextCombo);
      arenaRef.current?.firePlayerAttack(dmg, hintsUsedThisWord === 0, `GO HAMZ!`);
      setFeedbackBanner({
        type: 'correct',
        title: `${getHamzPraise(nextCombo)} ${currentSpellWord.word}`,
        detail: currentSpellWord.meaning,
      });
    } else {
      nextCombo = 0;
      setCombo(0);
      nextHp = Math.max(0, playerHp - 1);
      setPlayerHp(nextHp);
      soundEngine.playWrong();
      arenaRef.current?.fireEnemyAttack();
      setFeedbackBanner({
        type: 'wrong',
        title: `Good try, Hamz! Spelled: ${currentSpellWord.word}`,
        detail: currentSpellWord.meaning,
      });
    }

    setTimeout(() => {
      setFeedbackBanner(null);
      setRoundLocked(false);

      if (nextHp <= 0) {
        finishMatch(false, nextCorrect, spellingWords.length, nextMaxCombo, supersUsed, nextPracticed);
        return;
      }
      if (spellIndex + 1 >= spellingWords.length) {
        finishMatch(
          nextCorrect >= Math.ceil(spellingWords.length * 0.5),
          nextCorrect,
          spellingWords.length,
          nextMaxCombo,
          supersUsed,
          nextPracticed
        );
        return;
      }
      const nextWord = spellingWords[spellIndex + 1];
      setSpellIndex((i) => i + 1);
      setPlacedTileIds([]);
      setHintsUsedThisWord(0);
      setTilePool(buildSpellingTiles(nextWord.word, tier));
    }, isCorrect ? 1050 : 1750);
  }, [
    paused,
    matchFinished,
    roundLocked,
    currentSpellWord,
    placedTileIds,
    tilePool,
    wordsPracticed,
    correctCount,
    combo,
    maxCombo,
    playerHp,
    hintsUsedThisWord,
    playerDamage,
    spellingWords,
    spellIndex,
    tier,
    supersUsed,
    finishMatch,
  ]);

  // Global keyboard shortcuts (1-4 answers, Space Super, Esc Pause, typing in Spelling Bee)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onPause();
        return;
      }
      if (paused || matchFinished) return;

      if (e.key === ' ' && superCharge >= 100) {
        e.preventDefault();
        handleUseSuper();
        return;
      }

      if ((mode === 'gem_grab' || mode === 'blank_race') && quizDeck[quizIndex]) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1 && quizDeck[quizIndex].options[idx]) {
          e.preventDefault();
          handleQuizAnswer(quizDeck[quizIndex].options[idx]);
        }
      } else if (mode === 'spelling_bee' && currentSpellWord) {
        if (e.key === 'Backspace') {
          e.preventDefault();
          handleRemoveLastTile();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmitSpelling();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
          const ch = e.key.toUpperCase();
          const match = tilePool.find((t) => !t.used && t.char === ch);
          if (match) {
            e.preventDefault();
            handleTapTile(match.id);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    onPause,
    paused,
    matchFinished,
    superCharge,
    handleUseSuper,
    mode,
    quizDeck,
    quizIndex,
    handleQuizAnswer,
    currentSpellWord,
    handleRemoveLastTile,
    handleSubmitSpelling,
    tilePool,
    handleTapTile,
  ]);

  const currentQuiz = quizDeck[quizIndex];
  const currentWave = matchWaves[waveIndex];

  return (
    <div className="relative flex flex-col w-screen h-screen overflow-hidden bg-[#0C1A3E]">
      {/* TOP PLAYFIELD: 60fps Canvas + Non-Blocking Perimeter HUD */}
      <div className="relative w-full h-[42vh] min-h-[220px] max-h-[340px] shrink-0">
        <ArenaCanvas ref={arenaRef} brawler={brawler} tier={tier} mode={mode} paused={paused} />

        {/* Perimeter HUD Overlay (pointer-events-none wrapper) */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Top-Left: Player Brawler & Hearts */}
            <div className="flex items-center gap-2.5 bg-[#09122C]/90 border-[3px] border-[#09122C] rounded-xl px-3 py-1.5 shadow-[0_3px_0_rgba(0,0,0,0.45)]">
              <img
                src={brawler.portraitUrl}
                alt={brawler.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover border-2 border-[#22D3EE]"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm text-white leading-none">
                    Hamz · {brawler.name}
                  </span>
                  <span className="text-[11px] font-bold text-[#22D3EE] font-mono-num">
                    LV.{brawlerLevel}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1" aria-label={`Hearts ${playerHp} of ${maxPlayerHp}`}>
                  {Array.from({ length: maxPlayerHp }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-4 h-4 ${
                        i < playerHp ? 'text-[#FF3B5C] fill-[#FF3B5C]' : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Top-Center: Mode & Round / Gems Counter */}
            <div className="hidden sm:flex items-center gap-4 bg-[#09122C]/90 border-[3px] border-[#09122C] rounded-xl px-4 py-1.5 shadow-[0_3px_0_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-1.5">
                <Gem className="w-4 h-4 text-[#D946EF]" />
                <span className="font-display text-base text-white font-mono-num">{playerGems}</span>
                <span className="text-xs font-bold text-slate-300">Gems</span>
              </div>
              <span className="text-slate-500">·</span>
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#FF9F1C]" />
                <span className="font-display text-base text-[#FFC82C] font-mono-num">
                  {combo}x
                </span>
                <span className="text-xs font-bold text-slate-300">Combo</span>
              </div>
              <span className="text-slate-500">·</span>
              <span className="text-xs font-extrabold text-slate-200">{modeMeta.name}</span>
            </div>

            {/* Top-Right: Rival Label + Mute + Pause Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-[#09122C]/90 border-[3px] border-[#09122C] rounded-xl px-3 py-1.5">
                <span className="text-xs font-extrabold text-[#FF3B5C]">VS {tierMeta.botName}</span>
                <span className="font-mono-num text-xs font-bold text-white">
                  {mode === 'blank_race'
                    ? `${Math.round(playerRacePct)}% / ${Math.round(enemyRacePct)}%`
                    : `HP ${enemyHp}/${maxEnemyHp}`}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleMusic}
                aria-label={musicMuted ? 'Turn music on' : 'Turn music off'}
                title={musicMuted ? 'Music Off' : 'Music On'}
                className={`brawl-btn p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer ${
                  musicMuted ? 'bg-[#1A2E66] text-slate-400' : 'bg-[#22D3EE] text-[#09122C]'
                }`}
              >
                <Music className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                className="brawl-btn bg-[#1A2E66] text-white p-2 rounded-xl shadow-[0_3px_0_#09122C] cursor-pointer"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={onPause}
                aria-label="Pause game"
                className="brawl-btn bg-[#FFC82C] text-[#09122C] px-3 py-2 rounded-xl font-display text-sm flex items-center gap-1.5 shadow-[0_3px_0_#09122C]"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span className="hidden sm:inline">Pause</span>
              </button>
            </div>
          </div>

          {/* Bottom-right of canvas: Subtle Super Charge Gauge */}
          <div className="flex items-end justify-between">
            <div className="sm:hidden flex items-center gap-2 bg-[#09122C]/90 rounded-lg px-2.5 py-1 text-xs font-bold">
              <Gem className="w-3.5 h-3.5 text-[#D946EF]" />
              <span className="font-mono-num">{playerGems}</span>
              <span>·</span>
              <span className="text-[#FFC82C] font-mono-num">{combo}x</span>
            </div>

            <div className="pointer-events-auto ml-auto">
              <button
                type="button"
                onClick={handleUseSuper}
                disabled={superCharge < 100 || roundLocked}
                className={`brawl-btn flex items-center gap-2 px-4 py-2 rounded-xl font-display text-sm sm:text-base shadow-[0_4px_0_#09122C] ${
                  superCharge >= 100
                    ? 'bg-[#FFC82C] text-[#09122C] animate-pulse-super cursor-pointer'
                    : 'bg-[#13265A]/95 text-slate-300 cursor-not-allowed'
                }`}
              >
                <Zap className={`w-5 h-5 ${superCharge >= 100 ? 'fill-[#09122C]' : ''}`} />
                <span>
                  {superCharge >= 100 ? 'SUPER READY! (Space)' : `SUPER ${superCharge}%`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM COMMAND DECK: Interactive Mini-Game Area */}
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-b from-[#13265A] to-[#0C1A3E] overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center">
          {/* Feedback Toast Bar (Fixed height slot so layout never jumps) */}
          <div className="min-h-[44px] mb-2 flex items-center justify-center">
            {feedbackBanner ? (
              <div
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-[3px] border-[#09122C] font-bold text-sm sm:text-base ${
                  feedbackBanner.type === 'super'
                    ? 'bg-[#FFC82C] text-[#09122C]'
                    : feedbackBanner.type === 'correct'
                    ? 'bg-[#22D37A] text-[#09122C]'
                    : 'bg-[#FF3B5C] text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="font-display tracking-wide">{feedbackBanner.title}</span>
                <span className="hidden sm:inline opacity-90">— {feedbackBanner.detail}</span>
              </div>
            ) : (
              <div className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                <span>{tierMeta.name}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {mode === 'gem_grab' || mode === 'blank_race'
                    ? `Round ${quizIndex + 1} of ${quizDeck.length}`
                    : mode === 'word_match'
                    ? `Wave ${waveIndex + 1} of ${matchWaves.length} · Match all 4 pairs`
                    : `Boss Word ${spellIndex + 1} of ${spellingWords.length}`}
                </span>
              </div>
            )}
          </div>

          {/* MINI-GAME 1 & 3: GEM GRAB QUIZ / FILL-IN-THE-BLANKS RACE */}
          {(mode === 'gem_grab' || mode === 'blank_race') && currentQuiz && (
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Question Card */}
              <div className="bg-[#FFFDF7] text-[#09122C] border-[3px] border-[#09122C] rounded-2xl p-4 sm:p-5 shadow-[0_5px_0_#09122C] flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#475569] mb-1">
                    <span>
                      {currentQuiz.promptType === 'meaning'
                        ? 'Meaning Match'
                        : currentQuiz.promptType === 'synonym'
                        ? 'Synonym Strike'
                        : currentQuiz.promptType === 'antonym'
                        ? 'Opposite Blast'
                        : 'Fill the Blank'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{currentQuiz.vocab.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentQuiz.vocab.partOfSpeech}</span>
                  </div>

                  {mode === 'blank_race' ? (
                    <h2 className="text-lg sm:text-2xl font-extrabold leading-snug text-[#09122C]">
                      {currentQuiz.questionText.split('___').map((part, idx, arr) => (
                        <React.Fragment key={idx}>
                          {part}
                          {idx < arr.length - 1 && (
                            <span className="inline-block min-w-[96px] mx-1 px-2.5 py-0.5 rounded-lg bg-[#E0F2FE] border-2 border-dashed border-[#0284C7] text-[#0369A1] text-center font-display">
                              {selectedOption || '_____'}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </h2>
                  ) : (
                    <h2 className="text-lg sm:text-2xl font-extrabold leading-snug text-[#09122C]">
                      {currentQuiz.questionText}
                    </h2>
                  )}
                </div>

                {mode === 'gem_grab' && (
                  <button
                    type="button"
                    onClick={() => soundEngine.speakWord(currentQuiz.vocab.word)}
                    title="Hear word pronunciation"
                    className="brawl-btn bg-[#22D3EE] text-[#09122C] p-3 rounded-xl shrink-0 shadow-[0_3px_0_#09122C]"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* 4 Answer Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {currentQuiz.options.map((opt, idx) => {
                  const isPicked = selectedOption === opt;
                  const isRight = opt === currentQuiz.correctAnswer;
                  let btnStyle = 'bg-[#1D397A] hover:bg-[#254796] text-white';
                  if (selectedOption) {
                    if (isRight) {
                      btnStyle = 'bg-[#22D37A] text-[#09122C]';
                    } else if (isPicked && !isRight) {
                      btnStyle = 'bg-[#FF3B5C] text-white';
                    } else {
                      btnStyle = 'bg-[#13265A] text-slate-400 opacity-70';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={roundLocked}
                      onClick={() => handleQuizAnswer(opt)}
                      className={`brawl-btn ${btnStyle} min-h-[54px] px-4 py-3 rounded-xl shadow-[0_4px_0_#09122C] flex items-center gap-3 text-left font-bold text-sm sm:text-base cursor-pointer`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#09122C]/35 flex items-center justify-center font-display text-sm shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MINI-GAME 2: WORD-MATCH SHOWDOWN */}
          {mode === 'word_match' && currentWave && (
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {/* Left Column: Words */}
              <div className="flex flex-col gap-2.5">
                <div className="text-xs font-extrabold text-[#FFC82C] px-1">
                  1. Pick a Word
                </div>
                {currentWave.words.map((w) => {
                  const isMatched = matchedIds.includes(w.id);
                  const isSelected = selectedWordId === w.id;
                  return (
                    <div key={w.id} className="flex items-stretch gap-1.5">
                      <button
                        type="button"
                        disabled={isMatched || roundLocked}
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedWordId(w.id);
                        }}
                        className={`brawl-btn flex-1 min-h-[50px] px-3.5 py-2 rounded-xl font-display text-base sm:text-lg shadow-[0_4px_0_#09122C] text-left transition-transform ${
                          isMatched
                            ? 'bg-[#22D37A]/25 text-[#22D37A] border-[#22D37A]/50 opacity-55 shadow-none'
                            : isSelected
                            ? 'bg-[#FFC82C] text-[#09122C] -translate-y-0.5'
                            : 'bg-[#1D397A] text-white hover:bg-[#254796]'
                        }`}
                      >
                        {w.word}
                      </button>
                      <button
                        type="button"
                        onClick={() => soundEngine.speakWord(w.word)}
                        aria-label={`Pronounce ${w.word}`}
                        className="brawl-btn bg-[#13265A] text-[#22D3EE] px-2.5 rounded-xl shadow-[0_4px_0_#09122C]"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Matching Clues */}
              <div className="flex flex-col gap-2.5">
                <div className="text-xs font-extrabold text-[#22D3EE] px-1">
                  2. Tap its Matching Meaning
                </div>
                {currentWave.shuffledClues.map((clue) => {
                  const isMatched = matchedIds.includes(clue.id);
                  const isWrong = wrongPairFlash === clue.id;
                  return (
                    <button
                      key={clue.id}
                      type="button"
                      disabled={isMatched || !selectedWordId || roundLocked}
                      onClick={() => handleSelectClue(clue)}
                      className={`brawl-btn min-h-[50px] px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm text-left shadow-[0_4px_0_#09122C] ${
                        isMatched
                          ? 'bg-[#22D37A]/25 text-[#22D37A] opacity-55 shadow-none'
                          : isWrong
                          ? 'bg-[#FF3B5C] text-white'
                          : selectedWordId
                          ? 'bg-[#FFFDF7] text-[#09122C] hover:bg-[#FEF3C7] cursor-pointer'
                          : 'bg-[#1A2E66] text-slate-300 cursor-default'
                      }`}
                    >
                      {clue.meaning}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MINI-GAME 4: SPELLING BEE BOSS */}
          {mode === 'spelling_bee' && currentSpellWord && (
            <div className="flex flex-col gap-3">
              {/* Clue & Hear Word Card */}
              <div className="bg-[#FFFDF7] text-[#09122C] border-[3px] border-[#09122C] rounded-2xl p-4 shadow-[0_5px_0_#09122C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#475569] mb-1">
                    <span>Spelling Bee Boss</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentSpellWord.partOfSpeech}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentSpellWord.word.length} letters</span>
                  </div>
                  <p className="text-base sm:text-xl font-extrabold text-[#09122C]">
                    {currentSpellWord.meaning}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
                    Clue: {currentSpellWord.hint}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => soundEngine.speakWord(currentSpellWord.word)}
                    className="brawl-btn bg-[#22D3EE] text-[#09122C] px-3.5 py-2.5 rounded-xl font-display text-sm flex items-center gap-1.5 shadow-[0_3px_0_#09122C]"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>Hear Word</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSpellHint}
                    disabled={roundLocked}
                    className="brawl-btn bg-[#FFC82C] text-[#09122C] px-3 py-2.5 rounded-xl font-display text-sm flex items-center gap-1.5 shadow-[0_3px_0_#09122C]"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Hint</span>
                  </button>
                </div>
              </div>

              {/* Answer Letter Slots */}
              <div className="flex flex-wrap items-center justify-center gap-2 py-1">
                {currentSpellWord.word.split('').map((_, idx) => {
                  const placedId = placedTileIds[idx];
                  const tile = placedId ? tilePool.find((t) => t.id === placedId) : null;
                  return (
                    <div
                      key={idx}
                      className={`w-11 h-12 sm:w-12 sm:h-14 rounded-xl border-[3px] border-[#09122C] flex items-center justify-center font-display text-xl sm:text-2xl ${
                        tile
                          ? 'bg-[#FFC82C] text-[#09122C] shadow-[0_4px_0_#09122C]'
                          : 'bg-[#09122C]/55 text-slate-500 border-dashed border-slate-500'
                      }`}
                    >
                      {tile ? tile.char : ''}
                    </div>
                  );
                })}
              </div>

              {/* Letter Tile Rack + Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {tilePool.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={tile.used || roundLocked}
                    onClick={() => handleTapTile(tile.id)}
                    className={`brawl-btn w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-display text-lg sm:text-xl shadow-[0_4px_0_#09122C] ${
                      tile.used
                        ? 'bg-[#09122C]/40 text-slate-600 opacity-35 shadow-none'
                        : 'bg-[#FFFDF7] text-[#09122C] hover:bg-[#E0F2FE] cursor-pointer'
                    }`}
                  >
                    {tile.char}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={handleRemoveLastTile}
                  disabled={placedTileIds.length === 0 || roundLocked}
                  className="brawl-btn bg-[#1D397A] text-white px-4 py-2.5 rounded-xl font-display text-sm shadow-[0_4px_0_#09122C] disabled:opacity-50"
                >
                  Undo Letter
                </button>
                <button
                  type="button"
                  onClick={handleClearTiles}
                  disabled={placedTileIds.length === 0 || roundLocked}
                  className="brawl-btn bg-[#1D397A] text-white px-3.5 py-2.5 rounded-xl font-display text-sm flex items-center gap-1.5 shadow-[0_4px_0_#09122C] disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Clear</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSpelling}
                  disabled={placedTileIds.length < currentSpellWord.word.length || roundLocked}
                  className="brawl-btn bg-[#22D37A] text-[#09122C] px-6 py-2.5 rounded-xl font-display text-base shadow-[0_4px_0_#09122C] disabled:opacity-45 cursor-pointer"
                >
                  Blast Boss!
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Single Control Hint Line */}
        <div className="text-center text-xs font-bold text-slate-400 pt-2">
          {mode === 'gem_grab' || mode === 'blank_race'
            ? 'Keys 1–4 or Click Answer · Space Super Attack · Esc Pause'
            : mode === 'word_match'
            ? 'Click Word then Matching Clue · Space Super Attack · Esc Pause'
            : 'Type Letters or Click Tiles · Enter Blast · Backspace Undo · Esc Pause'}
        </div>
      </div>
    </div>
  );
};
