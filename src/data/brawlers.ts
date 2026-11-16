import { BrawlerDef } from '../types/game';

export const BRAWLERS: BrawlerDef[] = [
  {
    id: 'lexi',
    name: 'Lexi Blast',
    title: 'Word Ranger',
    portraitUrl: '/src/assets/images/brawler_lexi_blast_1794833178562.jpg',
    accentColor: '#22D3EE',
    projectileColor: '#FFC82C',
    superName: 'Sonic Star Mega-Blast',
    superDesc: 'Blasts a huge golden star wave for 2x damage & steals 2 gems!',
    unlockTrophies: 0,
    unlockCoins: 0,
    baseHp: 6,
    baseDamage: 24,
  },
  {
    id: 'bramble',
    name: 'Bramble Buddy',
    title: 'Cactus Scholar',
    portraitUrl: '/src/assets/images/brawler_bramble_buddy_1794833178297.jpg',
    accentColor: '#22D37A',
    projectileColor: '#34D399',
    superName: 'Blossom Barrage',
    superDesc: 'Fires a burst of emerald flower spikes & heals 1 Heart!',
    unlockTrophies: 30,
    unlockCoins: 120,
    baseHp: 6,
    baseDamage: 26,
  },
  {
    id: 'volt',
    name: 'Volt Bot',
    title: 'Quiz Dynamo',
    portraitUrl: '/src/assets/images/brawler_volt_bot_1794833180929.jpg',
    accentColor: '#FFC82C',
    projectileColor: '#38BDF8',
    superName: 'Thunder Overdrive',
    superDesc: 'Strikes with electric bolts for massive damage & bonus coins!',
    unlockTrophies: 75,
    unlockCoins: 240,
    baseHp: 7,
    baseDamage: 28,
  },
  {
    id: 'rex',
    name: 'Rex Roar',
    title: 'Dino Champ',
    portraitUrl: '/src/assets/images/brawler_rex_roar_1794833179375.jpg',
    accentColor: '#FF6B35',
    projectileColor: '#FF9F1C',
    superName: 'Meteor Star Shield',
    superDesc: 'Launches a giant spinning star shield that crushes rival bots!',
    unlockTrophies: 140,
    unlockCoins: 380,
    baseHp: 8,
    baseDamage: 30,
  },
];

export interface EventModeMeta {
  id: 'gem_grab' | 'word_match' | 'blank_race' | 'spelling_bee';
  name: string;
  shortDesc: string;
  badgeColor: string;
  accentHex: string;
  roundsLabel: string;
}

export const EVENT_MODES: EventModeMeta[] = [
  {
    id: 'gem_grab',
    name: 'Gem Grab Quiz',
    shortDesc: 'Pick simple meanings & opposites to grab 10 shiny Gems!',
    badgeColor: 'bg-[#A855F7]',
    accentHex: '#A855F7',
    roundsLabel: '6 Easy Questions',
  },
  {
    id: 'word_match',
    name: 'Word-Match Showdown',
    shortDesc: 'Match everyday English words to their simple meanings!',
    badgeColor: 'bg-[#22D37A]',
    accentHex: '#22D37A',
    roundsLabel: '2 Fun Waves',
  },
  {
    id: 'blank_race',
    name: 'Fill-in-the-Blanks Race',
    shortDesc: 'Finish short everyday sentences to race ahead of the Bot!',
    badgeColor: 'bg-[#0EA5E9]',
    accentHex: '#0EA5E9',
    roundsLabel: '6 Short Sentences',
  },
  {
    id: 'spelling_bee',
    name: 'Spelling Bee Boss',
    shortDesc: 'Listen & spell common daily words with letter tiles!',
    badgeColor: 'bg-[#FF9F1C]',
    accentHex: '#FF9F1C',
    roundsLabel: '5 Daily Words',
  },
];

export interface ArenaTierMeta {
  id: 'starter' | 'jungle' | 'citadel';
  name: string;
  ageRange: string;
  botName: string;
  botColor: string;
  groundColor: string;
  rewardBonus: number;
}

export const ARENA_TIERS: ArenaTierMeta[] = [
  {
    id: 'starter',
    name: 'First Words',
    ageRange: 'Level 1 · Easy',
    botName: 'Rusty Robo',
    botColor: '#EF4444',
    groundColor: '#D49B54',
    rewardBonus: 0,
  },
  {
    id: 'jungle',
    name: 'Daily Life',
    ageRange: 'Level 2 · Everyday',
    botName: 'Cactus Pal',
    botColor: '#8B5CF6',
    groundColor: '#4E9F66',
    rewardBonus: 8,
  },
  {
    id: 'citadel',
    name: 'Explorer Words',
    ageRange: 'Level 3 · Fun',
    botName: 'Mecha King',
    botColor: '#EC4899',
    groundColor: '#3B5998',
    rewardBonus: 16,
  },
];
