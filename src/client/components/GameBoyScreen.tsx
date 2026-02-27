import { useRef, useEffect, useCallback } from "react";
import { SCREEN_WIDTH, SCREEN_HEIGHT, GB_PALETTE } from "@shared/constants";

export interface GameBoyScreenProps {
  onRender: (ctx: CanvasRenderingContext2D) => void;
  onClick?: (x: number, y: number) => void;
  onKeyDown?: (key: string) => void;
}

export default function GameBoyScreen({
  onRender,
  onClick,
  onKeyDown,
}: GameBoyScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef(onRender);
  renderRef.current = onRender;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    let raf: number;
    const loop = () => {
      ctx.fillStyle = GB_PALETTE[3];
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      renderRef.current(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onClick) return;
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const scaleX = SCREEN_WIDTH / rect.width;
      const scaleY = SCREEN_HEIGHT / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      onClick(x, y);
    },
    [onClick]
  );

  useEffect(() => {
    if (!onKeyDown) return;
    const handler = (e: KeyboardEvent) => onKeyDown(e.key);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKeyDown]);

  return (
    <canvas
      ref={canvasRef}
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      onClick={handleClick}
      tabIndex={0}
      style={{
        width: "min(100vw, calc(100vh * 160 / 144))",
        height: "min(100vh, calc(100vw * 144 / 160))",
        maxWidth: "640px",
        maxHeight: "576px",
        cursor: "pointer",
        outline: "none",
      }}
    />
  );
}
