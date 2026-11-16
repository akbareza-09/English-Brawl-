import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ArenaTier, BrawlerDef, EventModeId } from '../types/game';
import { ARENA_TIERS } from '../data/brawlers';

export interface ArenaCanvasHandle {
  firePlayerAttack: (damage: number, isCrit: boolean, label?: string) => void;
  fireEnemyAttack: (label?: string) => void;
  fireSuperAttack: (damage: number) => void;
  setHpState: (playerHp: number, playerMaxHp: number, enemyHp: number, enemyMaxHp: number) => void;
  setRaceProgress: (playerPct: number, enemyPct: number) => void;
}

interface ArenaCanvasProps {
  brawler: BrawlerDef;
  tier: ArenaTier;
  mode: EventModeId;
  paused: boolean;
}

interface Projectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  fromPlayer: boolean;
  isSuper: boolean;
  isCrit: boolean;
  damage: number;
  label: string;
  spin: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  scale: number;
}

export const ArenaCanvas = forwardRef<ArenaCanvasHandle, ArenaCanvasProps>(
  ({ brawler, tier, mode, paused }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const portraitImgRef = useRef<HTMLImageElement | null>(null);

    const simRef = useRef({
      playerHp: 5,
      playerMaxHp: 5,
      enemyHp: 100,
      enemyMaxHp: 100,
      playerRacePct: 0,
      enemyRacePct: 0,
      playerDisplayPct: 0,
      enemyDisplayPct: 0,
      playerSquash: 1,
      enemySquash: 1,
      playerFlash: 0,
      enemyFlash: 0,
      enemyTelegraph: 0,
      hitstop: 0,
      shake: 0,
      minePulse: 0,
      paused: false,
      brawler,
      tier,
      mode,
    });

    const projectilesRef = useRef<Projectile[]>(
      Array.from({ length: 24 }, () => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 10,
        color: '#FFC82C',
        fromPlayer: true,
        isSuper: false,
        isCrit: false,
        damage: 20,
        label: '',
        spin: 0,
      }))
    );

    const particlesRef = useRef<Particle[]>(
      Array.from({ length: 120 }, () => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0.5,
        size: 5,
        color: '#FFC82C',
      }))
    );

    const floatersRef = useRef<FloatingText[]>(
      Array.from({ length: 20 }, () => ({
        active: false,
        x: 0,
        y: 0,
        vy: -55,
        life: 0,
        maxLife: 0.85,
        text: '',
        color: '#FFFFFF',
        scale: 1,
      }))
    );

    useEffect(() => {
      simRef.current.paused = paused;
      simRef.current.brawler = brawler;
      simRef.current.tier = tier;
      simRef.current.mode = mode;
    }, [paused, brawler, tier, mode]);

    useEffect(() => {
      const img = new Image();
      img.src = brawler.portraitUrl;
      img.onload = () => {
        portraitImgRef.current = img;
      };
    }, [brawler.portraitUrl]);

    const spawnParticles = (x: number, y: number, color: string, count = 16, speed = 190) => {
      const pool = particlesRef.current;
      let spawned = 0;
      for (let i = 0; i < pool.length && spawned < count; i++) {
        if (!pool[i].active) {
          const angle = Math.random() * Math.PI * 2;
          const spd = (0.35 + Math.random() * 0.75) * speed;
          pool[i].active = true;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].vx = Math.cos(angle) * spd;
          pool[i].vy = Math.sin(angle) * spd;
          pool[i].life = 0.35 + Math.random() * 0.35;
          pool[i].maxLife = pool[i].life;
          pool[i].size = 4 + Math.random() * 6;
          pool[i].color = color;
          spawned++;
        }
      }
    };

    const spawnFloater = (x: number, y: number, text: string, color: string, scale = 1) => {
      const pool = floatersRef.current;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].vy = -65;
          pool[i].life = 0.9;
          pool[i].maxLife = 0.9;
          pool[i].text = text;
          pool[i].color = color;
          pool[i].scale = scale;
          return;
        }
      }
    };

    const spawnProjectile = (opts: Omit<Projectile, 'active' | 'spin'>) => {
      const pool = projectilesRef.current;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i] = { ...opts, active: true, spin: 0 };
          return;
        }
      }
    };

    useImperativeHandle(ref, () => ({
      firePlayerAttack(damage, isCrit, label) {
        const canvas = canvasRef.current;
        const w = canvas ? canvas.clientWidth : 900;
        const h = canvas ? canvas.clientHeight : 320;
        const s = simRef.current;

        const isRace = s.mode === 'blank_race';
        const px = isRace ? 90 + (w - 220) * (s.playerDisplayPct / 100) : w * 0.2;
        const py = isRace ? h * 0.36 : h * 0.54;
        const ex = isRace ? 90 + (w - 220) * (s.enemyDisplayPct / 100) : w * 0.8;
        const ey = isRace ? h * 0.72 : h * 0.54;

        s.playerSquash = 1.26;
        spawnParticles(px + 28, py, s.brawler.projectileColor, 10, 140);

        const dx = ex - px;
        const dy = ey - py;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 780;

        spawnProjectile({
          x: px + 26,
          y: py,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: isCrit ? 17 : 13,
          color: s.brawler.projectileColor,
          fromPlayer: true,
          isSuper: false,
          isCrit,
          damage,
          label: label || (isCrit ? `CRIT -${damage}!` : `-${damage}`),
        });
      },

      fireEnemyAttack(label) {
        const canvas = canvasRef.current;
        const w = canvas ? canvas.clientWidth : 900;
        const h = canvas ? canvas.clientHeight : 320;
        const s = simRef.current;

        const isRace = s.mode === 'blank_race';
        const px = isRace ? 90 + (w - 220) * (s.playerDisplayPct / 100) : w * 0.2;
        const py = isRace ? h * 0.36 : h * 0.54;
        const ex = isRace ? 90 + (w - 220) * (s.enemyDisplayPct / 100) : w * 0.8;
        const ey = isRace ? h * 0.72 : h * 0.54;

        s.enemyTelegraph = 0.24;
        s.enemySquash = 1.24;
        const dx = px - ex;
        const dy = py - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 640;

        spawnProjectile({
          x: ex - 26,
          y: ey,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 14,
          color: '#FF3B5C',
          fromPlayer: false,
          isSuper: false,
          isCrit: false,
          damage: 1,
          label: label || '-1 HEART',
        });
      },

      fireSuperAttack(damage) {
        const canvas = canvasRef.current;
        const w = canvas ? canvas.clientWidth : 900;
        const h = canvas ? canvas.clientHeight : 320;
        const s = simRef.current;

        const isRace = s.mode === 'blank_race';
        const px = isRace ? 90 + (w - 220) * (s.playerDisplayPct / 100) : w * 0.2;
        const py = isRace ? h * 0.36 : h * 0.54;
        const ex = isRace ? 90 + (w - 220) * (s.enemyDisplayPct / 100) : w * 0.8;
        const ey = isRace ? h * 0.72 : h * 0.54;

        s.playerSquash = 1.38;
        s.shake = 10;
        spawnParticles(px + 20, py, '#FFC82C', 28, 250);
        spawnFloater(px, py - 56, 'GO HAMZ!', '#FFC82C', 1.3);

        const dx = ex - px;
        const dy = ey - py;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 880;

        spawnProjectile({
          x: px + 28,
          y: py,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 26,
          color: '#FFC82C',
          fromPlayer: true,
          isSuper: true,
          isCrit: true,
          damage,
          label: `SUPER -${damage}!`,
        });
      },

      setHpState(playerHp, playerMaxHp, enemyHp, enemyMaxHp) {
        simRef.current.playerHp = playerHp;
        simRef.current.playerMaxHp = playerMaxHp;
        simRef.current.enemyHp = enemyHp;
        simRef.current.enemyMaxHp = enemyMaxHp;
      },

      setRaceProgress(playerPct, enemyPct) {
        simRef.current.playerRacePct = Math.max(0, Math.min(100, playerPct));
        simRef.current.enemyRacePct = Math.max(0, Math.min(100, enemyPct));
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let rafId = 0;
      let lastTime = performance.now();

      const drawStar = (cx: number, cy: number, spikes: number, outerR: number, innerR: number, rot: number) => {
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const a = rot + (i * Math.PI) / spikes;
          const sx = cx + Math.cos(a) * r;
          const sy = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
      };

      const drawCrate = (x: number, y: number, size: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#B8743B';
        ctx.strokeStyle = '#09122C';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, 8);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#7C4A21';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-size / 2 + 5, -size / 2 + 5);
        ctx.lineTo(size / 2 - 5, size / 2 - 5);
        ctx.moveTo(size / 2 - 5, -size / 2 + 5);
        ctx.lineTo(-size / 2 + 5, size / 2 - 5);
        ctx.stroke();
        ctx.restore();
      };

      const drawBush = (x: number, y: number, r: number) => {
        ctx.save();
        ctx.fillStyle = '#22A858';
        ctx.strokeStyle = '#09122C';
        ctx.lineWidth = 3;
        const blobs = [
          { dx: -r * 0.45, dy: 4, rad: r * 0.55 },
          { dx: r * 0.45, dy: 4, rad: r * 0.55 },
          { dx: 0, dy: -r * 0.22, rad: r * 0.68 },
        ];
        ctx.beginPath();
        blobs.forEach((b) => {
          ctx.moveTo(x + b.dx + b.rad, y + b.dy);
          ctx.arc(x + b.dx, y + b.dy, b.rad, 0, Math.PI * 2);
        });
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      const tick = (now: number) => {
        rafId = requestAnimationFrame(tick);

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }

        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

        const s = simRef.current;

        if (!s.paused) {
          if (s.hitstop > 0) {
            s.hitstop -= dt;
          } else {
            s.minePulse += dt * 3.2;
            s.playerSquash += (1 - s.playerSquash) * Math.min(1, dt * 12);
            s.enemySquash += (1 - s.enemySquash) * Math.min(1, dt * 12);
            s.playerFlash = Math.max(0, s.playerFlash - dt * 5);
            s.enemyFlash = Math.max(0, s.enemyFlash - dt * 5);
            s.enemyTelegraph = Math.max(0, s.enemyTelegraph - dt);
            s.shake = Math.max(0, s.shake - dt * 38);

            // Smooth race progress interpolation
            s.playerDisplayPct += (s.playerRacePct - s.playerDisplayPct) * Math.min(1, dt * 6);
            s.enemyDisplayPct += (s.enemyRacePct - s.enemyDisplayPct) * Math.min(1, dt * 6);

            const isRace = s.mode === 'blank_race';
            const px = isRace ? 90 + (w - 220) * (s.playerDisplayPct / 100) : w * 0.2;
            const py = isRace ? h * 0.36 : h * 0.54;
            const ex = isRace ? 90 + (w - 220) * (s.enemyDisplayPct / 100) : w * 0.8;
            const ey = isRace ? h * 0.72 : h * 0.54;

            // Update projectiles
            for (const p of projectilesRef.current) {
              if (!p.active) continue;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.spin += dt * 10;

              const targetX = p.fromPlayer ? ex : px;
              const targetY = p.fromPlayer ? ey : py;
              if (Math.hypot(p.x - targetX, p.y - targetY) < 42) {
                p.active = false;
                if (p.fromPlayer) {
                  s.enemyFlash = 1;
                  s.enemySquash = 0.78;
                  s.hitstop = p.isSuper ? 0.055 : p.isCrit ? 0.035 : 0.015;
                  s.shake = p.isSuper ? 14 : p.isCrit ? 8 : 4.5;
                  spawnParticles(ex, ey, p.color, p.isSuper ? 32 : 18, p.isSuper ? 260 : 180);
                  spawnFloater(
                    ex,
                    ey - 55,
                    p.label,
                    p.isSuper ? '#FFC82C' : p.isCrit ? '#34D399' : '#FFFFFF',
                    p.isSuper ? 1.35 : 1.08
                  );
                } else {
                  s.playerFlash = 1;
                  s.playerSquash = 0.78;
                  s.shake = 9;
                  spawnParticles(px, py, '#FF3B5C', 18, 170);
                  spawnFloater(px, py - 55, p.label, '#FF3B5C', 1.1);
                }
              } else if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60) {
                p.active = false;
              }
            }

            // Update particles
            for (const pt of particlesRef.current) {
              if (!pt.active) continue;
              pt.x += pt.vx * dt;
              pt.y += pt.vy * dt;
              pt.vx *= 0.94;
              pt.vy *= 0.94;
              pt.life -= dt;
              if (pt.life <= 0) pt.active = false;
            }

            // Update floating text
            for (const fl of floatersRef.current) {
              if (!fl.active) continue;
              fl.y += fl.vy * dt;
              fl.life -= dt;
              if (fl.life <= 0) fl.active = false;
            }
          }
        }

        // ============ RENDER ============
        ctx.save();
        ctx.scale(dpr, dpr);

        const shakeX = s.shake > 0.2 ? (Math.random() - 0.5) * s.shake : 0;
        const shakeY = s.shake > 0.2 ? (Math.random() - 0.5) * s.shake : 0;
        ctx.translate(shakeX, shakeY);

        const tierMeta = ARENA_TIERS.find((t) => t.id === s.tier) || ARENA_TIERS[0];

        // Arena ground gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (s.tier === 'starter') {
          grad.addColorStop(0, '#E3AC63');
          grad.addColorStop(1, '#C98942');
        } else if (s.tier === 'jungle') {
          grad.addColorStop(0, '#5CB874');
          grad.addColorStop(1, '#3D8C54');
        } else {
          grad.addColorStop(0, '#3C5BA6');
          grad.addColorStop(1, '#263C78');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle Brawl arena checkerboard grid
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        const tileSize = 48;
        for (let gx = 0; gx < w; gx += tileSize) {
          for (let gy = 0; gy < h; gy += tileSize) {
            if (((gx / tileSize + gy / tileSize) | 0) % 2 === 0) {
              ctx.fillRect(gx, gy, tileSize, tileSize);
            }
          }
        }

        const isRace = s.mode === 'blank_race';

        if (isRace) {
          // Draw 2 Brawl Sprint Lanes + Checkered Finish Line!
          const lane1Y = h * 0.36;
          const lane2Y = h * 0.72;
          const trackLeft = 70;
          const trackRight = w - 80;

          [lane1Y, lane2Y].forEach((ly, idx) => {
            ctx.fillStyle = idx === 0 ? 'rgba(12, 26, 62, 0.26)' : 'rgba(12, 26, 62, 0.2)';
            ctx.strokeStyle = '#09122C';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(trackLeft - 24, ly - 32, trackRight - trackLeft + 54, 64, 18);
            ctx.fill();
            ctx.stroke();

            // Dashed lane lines
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.setLineDash([14, 12]);
            ctx.beginPath();
            ctx.moveTo(trackLeft, ly);
            ctx.lineTo(trackRight, ly);
            ctx.stroke();
            ctx.setLineDash([]);
          });

          // Finish line
          for (let row = 0; row < 10; row++) {
            ctx.fillStyle = row % 2 === 0 ? '#FFFFFF' : '#09122C';
            ctx.fillRect(trackRight - 8, h * 0.16 + row * ((h * 0.7) / 10), 14, (h * 0.7) / 10);
          }
        } else {
          // Arena props (crates, bushes, and glowing center Gem Mine)
          drawBush(w * 0.08, h * 0.24, 24);
          drawBush(w * 0.92, h * 0.24, 24);
          drawBush(w * 0.09, h * 0.82, 22);
          drawBush(w * 0.91, h * 0.82, 22);

          drawCrate(w * 0.36, h * 0.28, 34);
          drawCrate(w * 0.64, h * 0.78, 34);

          // Center Gem Mine Ring
          const cx = w * 0.5;
          const cy = h * 0.54;
          const pulseR = 36 + Math.sin(s.minePulse) * 4;

          ctx.fillStyle = 'rgba(168, 85, 247, 0.24)';
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR + 12, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#2B1454';
          ctx.strokeStyle = '#09122C';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, 32, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Floating Gem inside mine
          const gemBob = Math.sin(s.minePulse * 1.4) * 5;
          ctx.fillStyle = '#D946EF';
          ctx.strokeStyle = '#09122C';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 16 + gemBob);
          ctx.lineTo(cx + 12, cy + gemBob);
          ctx.lineTo(cx, cy + 16 + gemBob);
          ctx.lineTo(cx - 12, cy + gemBob);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Character positions
        const px = isRace ? 90 + (w - 220) * (s.playerDisplayPct / 100) : w * 0.2;
        const py = isRace ? h * 0.36 : h * 0.54;
        const ex = isRace ? 90 + (w - 220) * (s.enemyDisplayPct / 100) : w * 0.8;
        const ey = isRace ? h * 0.72 : h * 0.54;

        // Draw Player Brawler
        {
          const bob = Math.sin(s.minePulse * 1.3) * 3;
          ctx.save();
          ctx.translate(px, py + bob);
          ctx.scale(s.playerSquash, 2 - s.playerSquash);

          // Shadow
          ctx.fillStyle = 'rgba(9, 18, 44, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, 34 - bob, 32, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Team indicator ring
          ctx.strokeStyle = '#22D3EE';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, 32 - bob, 34, 12, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Portrait circle with thick comic outline
          ctx.beginPath();
          ctx.arc(0, 0, 34, 0, Math.PI * 2);
          ctx.fillStyle = s.brawler.accentColor;
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#09122C';
          ctx.stroke();

          if (portraitImgRef.current) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, 31, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(portraitImgRef.current, -31, -31, 62, 62);
            ctx.restore();
          }

          if (s.playerFlash > 0.05) {
            ctx.fillStyle = `rgba(255, 255, 255, ${s.playerFlash * 0.8})`;
            ctx.beginPath();
            ctx.arc(0, 0, 33, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Player Nameplate & Hearts Bar above
          if (!isRace) {
            ctx.fillStyle = '#09122C';
            ctx.beginPath();
            ctx.roundRect(px - 46, py - 62, 92, 18, 6);
            ctx.fill();
            const ratio = Math.max(0, s.playerHp / Math.max(1, s.playerMaxHp));
            ctx.fillStyle = ratio > 0.4 ? '#22D37A' : '#FF3B5C';
            ctx.beginPath();
            ctx.roundRect(px - 43, py - 59, 86 * ratio, 12, 4);
            ctx.fill();
          }
        }

        // Draw Rival Bot / Boss
        {
          const isBoss = s.mode === 'spelling_bee';
          const botR = isBoss ? 40 : 33;
          const bob = Math.cos(s.minePulse * 1.15) * 3.5;

          ctx.save();
          ctx.translate(ex, ey + bob);
          ctx.scale(s.enemySquash, 2 - s.enemySquash);

          // Shadow
          ctx.fillStyle = 'rgba(9, 18, 44, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, botR + 2 - bob, botR, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Enemy Red Ring
          ctx.strokeStyle = s.enemyTelegraph > 0 ? '#FFC82C' : '#FF3B5C';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, botR - bob, botR + 2, 12, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Bot Chunky Body
          ctx.fillStyle = tierMeta.botColor;
          ctx.strokeStyle = '#09122C';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(-botR, -botR, botR * 2, botR * 2, 18);
          ctx.fill();
          ctx.stroke();

          // Bot Visor
          ctx.fillStyle = '#09122C';
          ctx.beginPath();
          ctx.roundRect(-botR * 0.72, -14, botR * 1.44, 22, 8);
          ctx.fill();

          // Glowing Eyes
          ctx.fillStyle = s.enemyTelegraph > 0 ? '#FFC82C' : '#FF3B5C';
          ctx.beginPath();
          ctx.arc(-11, -3, 5.5, 0, Math.PI * 2);
          ctx.arc(11, -3, 5.5, 0, Math.PI * 2);
          ctx.fill();

          // Boss Crown if Spelling Bee Boss
          if (isBoss) {
            ctx.fillStyle = '#FFC82C';
            ctx.strokeStyle = '#09122C';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-18, -botR + 2);
            ctx.lineTo(-22, -botR - 18);
            ctx.lineTo(-7, -botR - 8);
            ctx.lineTo(0, -botR - 22);
            ctx.lineTo(7, -botR - 8);
            ctx.lineTo(22, -botR - 18);
            ctx.lineTo(18, -botR + 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          if (s.enemyFlash > 0.05) {
            ctx.fillStyle = `rgba(255, 255, 255, ${s.enemyFlash * 0.85})`;
            ctx.beginPath();
            ctx.roundRect(-botR, -botR, botR * 2, botR * 2, 18);
            ctx.fill();
          }
          ctx.restore();

          // Enemy HP Bar
          if (!isRace) {
            ctx.fillStyle = '#09122C';
            ctx.beginPath();
            ctx.roundRect(ex - 48, ey - botR - 26, 96, 18, 6);
            ctx.fill();
            const eratio = Math.max(0, s.enemyHp / Math.max(1, s.enemyMaxHp));
            ctx.fillStyle = '#FF3B5C';
            ctx.beginPath();
            ctx.roundRect(ex - 45, ey - botR - 23, 90 * eratio, 12, 4);
            ctx.fill();
          }
        }

        // Projectiles
        for (const p of projectilesRef.current) {
          if (!p.active) continue;
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#09122C';
          ctx.lineWidth = 3;
          if (p.fromPlayer) {
            drawStar(p.x, p.y, 5, p.radius + 3, p.radius * 0.5, p.spin);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }

        // Particles
        for (const pt of particlesRef.current) {
          if (!pt.active) continue;
          const alpha = Math.max(0, pt.life / pt.maxLife);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = pt.color;
          ctx.strokeStyle = '#09122C';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Floating Damage & Callouts
        for (const fl of floatersRef.current) {
          if (!fl.active) continue;
          const alpha = Math.min(1, (fl.life / fl.maxLife) * 1.4);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = `900 ${Math.round(20 * fl.scale)}px "Lilita One", sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#09122C';
          ctx.strokeText(fl.text, fl.x, fl.y);
          ctx.fillStyle = fl.color;
          ctx.fillText(fl.text, fl.x, fl.y);
          ctx.restore();
        }

        ctx.restore();
      };

      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, []);

    return (
      <div className="relative w-full h-full overflow-hidden border-b-[4px] border-[#09122C] bg-[#0C1A3E]">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    );
  }
);

ArenaCanvas.displayName = 'ArenaCanvas';
