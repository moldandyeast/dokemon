import { useRef, useEffect, useCallback, useState } from "react";
import { useBattle } from "../hooks/useBattle";
import { BattleSnapshot } from "@shared/types";
import { GB_PALETTE, SCREEN_WIDTH, SCREEN_HEIGHT, SPRITE_SIZE } from "@shared/constants";
import { getMoveById } from "@shared/moves";
import { drawSprite, decodeSpriteData } from "../canvas/spriteRenderer";
import { drawText, drawTextCentered } from "../canvas/pixelText";

interface BattleScreenProps {
  battleId: string;
  dokemonId: string;
  rating: number;
  onEnd: () => void;
  cpu?: boolean;
}

export default function BattleScreen({
  battleId,
  dokemonId,
  rating,
  onEnd,
  cpu = false,
}: BattleScreenProps) {
  const { state, submitMove, forfeit } = useBattle(battleId, dokemonId, rating, cpu);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMove, setSelectedMove] = useState(0);
  const animFrame = useRef(0);

  // Render the battle scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    let raf: number;
    const render = () => {
      animFrame.current++;
      ctx.fillStyle = GB_PALETTE[3];
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      if (state.you && state.opponent) {
        drawBattleScene(ctx, state.you, state.opponent, state.phase, animFrame.current);

        // Draw move menu during your turn
        if (state.phase === "your_turn") {
          drawMoveMenu(ctx, state.you, selectedMove);
        } else if (state.phase === "waiting_for_result") {
          drawTextCentered(ctx, "WAITING...", SCREEN_WIDTH / 2, 120, 1, 1);
        } else if (state.phase === "animating") {
          // Show last log entry
          const lastLog = state.log[state.log.length - 1];
          if (lastLog) {
            ctx.fillStyle = GB_PALETTE[3];
            ctx.fillRect(0, 108, SCREEN_WIDTH, 36);
            ctx.fillStyle = GB_PALETTE[1];
            ctx.fillRect(0, 108, SCREEN_WIDTH, 1);
            drawText(ctx, lastLog.slice(0, 28), 4, 114, 0, 1);
          }
        }
      } else if (state.phase === "connecting") {
        drawTextCentered(ctx, "CONNECTING...", SCREEN_WIDTH / 2, 70, 0, 1);
      } else if (state.phase === "waiting_for_opponent") {
        drawTextCentered(ctx, "WAITING FOR", SCREEN_WIDTH / 2, 60, 0, 1);
        drawTextCentered(ctx, "OPPONENT...", SCREEN_WIDTH / 2, 72, 0, 1);
      }

      // Battle end overlay
      if (state.phase === "battle_end") {
        ctx.fillStyle = "rgba(15, 56, 15, 0.7)";
        ctx.fillRect(0, 40, SCREEN_WIDTH, 64);

        const won = state.winner === state.yourRole;
        drawTextCentered(
          ctx,
          won ? "YOU WIN!" : "YOU LOSE...",
          SCREEN_WIDTH / 2,
          55,
          3,
          2
        );
        drawTextCentered(
          ctx,
          `XP +${state.xpGained}`,
          SCREEN_WIDTH / 2,
          78,
          2,
          1
        );
        drawTextCentered(
          ctx,
          "TAP TO CONTINUE",
          SCREEN_WIDTH / 2,
          95,
          2,
          1
        );
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [state, selectedMove]);

  const handleClick = useCallback(
    (_x: number, y: number) => {
      if (state.phase === "battle_end") {
        onEnd();
        return;
      }
    },
    [state.phase, onEnd]
  );

  const handleKey = useCallback(
    (key: string) => {
      if (state.phase === "battle_end") {
        onEnd();
        return;
      }

      if (state.phase !== "your_turn" || !state.you) return;

      switch (key) {
        case "ArrowUp":
          setSelectedMove((m) => (m < 2 ? m : m - 2));
          break;
        case "ArrowDown":
          setSelectedMove((m) => (m >= 2 ? m : m + 2));
          break;
        case "ArrowLeft":
          setSelectedMove((m) => (m % 2 === 0 ? m : m - 1));
          break;
        case "ArrowRight":
          setSelectedMove((m) => (m % 2 === 1 ? m : m + 1));
          break;
        case "Enter":
        case " ":
          if (state.you.movePP[selectedMove] > 0) {
            submitMove(selectedMove);
          }
          break;
        case "Escape":
          forfeit();
          break;
      }
    },
    [state.phase, state.you, selectedMove, submitMove, forfeit, onEnd]
  );

  // Click handler for move selection (mapped to canvas coordinates)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const scaleX = SCREEN_WIDTH / rect.width;
      const scaleY = SCREEN_HEIGHT / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      if (state.phase === "battle_end") {
        onEnd();
        return;
      }

      if (state.phase === "your_turn" && state.you && y >= 108) {
        // Move menu area
        const col = x < SCREEN_WIDTH / 2 ? 0 : 1;
        const row = y < 126 ? 0 : 1;
        const moveIdx = row * 2 + col;
        if (state.you.movePP[moveIdx] > 0) {
          submitMove(moveIdx);
        }
      }
    },
    [state, submitMove, onEnd]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  return (
    <canvas
      ref={canvasRef}
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      onClick={handleCanvasClick}
      tabIndex={0}
      style={{
        width: "min(100vw, calc(100vh * 160 / 144))",
        height: "min(100vh, calc(100vw * 144 / 160))",
        maxWidth: "640px",
        maxHeight: "576px",
        cursor: "pointer",
        outline: "none",
        imageRendering: "pixelated",
      }}
    />
  );
}

// ── Drawing Helpers ──

function drawBattleScene(
  ctx: CanvasRenderingContext2D,
  you: BattleSnapshot,
  opponent: BattleSnapshot,
  phase: string,
  frame: number
) {
  // Opponent sprite (top-right area)
  const opSprite = decodeSpriteData(opponent.sprite);
  const opYOffset = Math.floor(frame / 30) % 2 === 0 ? 0 : -1; // idle wobble
  drawSprite(ctx, opSprite, 110, 8 + opYOffset, 2);

  // Opponent info (top-left)
  drawText(ctx, opponent.name.slice(0, 10), 4, 8, 0, 1);
  drawText(ctx, `LV${opponent.level}`, 4, 16, 1, 1);
  drawHPBar(ctx, 4, 24, 80, opponent.currentHp, opponent.maxHp);

  // Your sprite (bottom-left area)
  const yourSprite = decodeSpriteData(you.sprite);
  const yourYOffset = Math.floor(frame / 30) % 2 === 0 ? 0 : 1; // idle wobble
  drawSprite(ctx, yourSprite, 8, 56 + yourYOffset, 3);

  // Your info (bottom-right)
  drawText(ctx, you.name.slice(0, 10), 68, 64, 0, 1);
  drawText(ctx, `LV${you.level}`, 68, 72, 1, 1);
  drawHPBar(ctx, 68, 80, 80, you.currentHp, you.maxHp);

  // HP numbers for your mon
  drawText(
    ctx,
    `${you.currentHp}/${you.maxHp}`,
    68,
    90,
    1,
    1
  );

  // Separator line
  ctx.fillStyle = GB_PALETTE[1];
  ctx.fillRect(0, 104, SCREEN_WIDTH, 1);
}

function drawHPBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  current: number,
  max: number
) {
  const pct = Math.max(0, current / max);
  const barWidth = width - 16;

  // "HP" label
  drawText(ctx, "HP", x, y, 0, 1);

  // Background
  ctx.fillStyle = GB_PALETTE[0];
  ctx.fillRect(x + 14, y, barWidth + 2, 5);

  // Fill
  let fillColor: string;
  if (pct > 0.5) fillColor = GB_PALETTE[1]; // dark green = healthy
  else if (pct > 0.25) fillColor = GB_PALETTE[2]; // light green = caution
  else fillColor = GB_PALETTE[0]; // darkest = critical (blink)

  ctx.fillStyle = GB_PALETTE[3]; // background of bar interior
  ctx.fillRect(x + 15, y + 1, barWidth, 3);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 15, y + 1, Math.floor(barWidth * pct), 3);
}

function drawMoveMenu(
  ctx: CanvasRenderingContext2D,
  you: BattleSnapshot,
  selected: number
) {
  // Background
  ctx.fillStyle = GB_PALETTE[3];
  ctx.fillRect(0, 106, SCREEN_WIDTH, 38);
  ctx.fillStyle = GB_PALETTE[1];
  ctx.fillRect(0, 106, SCREEN_WIDTH, 1);

  // 2x2 grid of moves
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * (SCREEN_WIDTH / 2) + 4;
    const y = 110 + row * 16;

    const move = getMoveById(you.moveIds[i]);
    const pp = you.movePP[i];
    const isSelected = i === selected;
    const isEmpty = pp <= 0;

    if (isSelected) {
      ctx.fillStyle = GB_PALETTE[1];
      ctx.fillRect(x - 2, y - 2, SCREEN_WIDTH / 2 - 4, 14);
    }

    const textColor = isEmpty ? 2 : isSelected ? 3 : 0;
    drawText(ctx, move.name.slice(0, 9), x, y, textColor, 1);
    drawText(ctx, `${pp}`, x + 60, y + 6, isEmpty ? 2 : 1, 1);
  }
}
