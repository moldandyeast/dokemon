import { useState, useCallback, useRef, useEffect } from "react";
import { GB_PALETTE, SPRITE_SIZE } from "@shared/constants";
import { createBlankSprite } from "../canvas/spriteRenderer";

type Tool = "pencil" | "eraser" | "fill";

interface SpriteEditorProps {
  pixels: Uint8Array;
  onChange: (pixels: Uint8Array) => void;
}

export default function SpriteEditor({ pixels, onChange }: SpriteEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState(0);
  const [mirror, setMirror] = useState(false);
  const [undoStack, setUndoStack] = useState<Uint8Array[]>([]);
  const [redoStack, setRedoStack] = useState<Uint8Array[]>([]);
  const isPainting = useRef(false);

  const CELL_SIZE = 12;
  const CANVAS_SIZE = SPRITE_SIZE * CELL_SIZE;

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-19), new Uint8Array(pixels)]);
    setRedoStack([]);
  }, [pixels]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, new Uint8Array(pixels)]);
      onChange(last);
      return prev.slice(0, -1);
    });
  }, [pixels, onChange]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, new Uint8Array(pixels)]);
      onChange(last);
      return prev.slice(0, -1);
    });
  }, [pixels, onChange]);

  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: number) => {
      const target = pixels[startY * SPRITE_SIZE + startX];
      if (target === fillColor) return;

      const newPixels = new Uint8Array(pixels);
      const queue: [number, number][] = [[startX, startY]];
      const visited = new Set<number>();

      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        const idx = y * SPRITE_SIZE + x;
        if (visited.has(idx)) continue;
        if (x < 0 || x >= SPRITE_SIZE || y < 0 || y >= SPRITE_SIZE) continue;
        if (newPixels[idx] !== target) continue;

        visited.add(idx);
        newPixels[idx] = fillColor;
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      onChange(newPixels);
    },
    [pixels, onChange]
  );

  const paintPixel = useCallback(
    (x: number, y: number) => {
      if (x < 0 || x >= SPRITE_SIZE || y < 0 || y >= SPRITE_SIZE) return;

      if (tool === "fill") {
        pushUndo();
        floodFill(x, y, color);
        return;
      }

      const paintColor = tool === "eraser" ? 3 : color;
      const newPixels = new Uint8Array(pixels);
      newPixels[y * SPRITE_SIZE + x] = paintColor;
      if (mirror) {
        newPixels[y * SPRITE_SIZE + (SPRITE_SIZE - 1 - x)] = paintColor;
      }
      onChange(newPixels);
    },
    [tool, color, mirror, pixels, onChange, pushUndo, floodFill]
  );

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const x = Math.floor(
        ((clientX - rect.left) / rect.width) * SPRITE_SIZE
      );
      const y = Math.floor(
        ((clientY - rect.top) / rect.height) * SPRITE_SIZE
      );
      if (x < 0 || x >= SPRITE_SIZE || y < 0 || y >= SPRITE_SIZE) return null;
      return { x, y };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isPainting.current = true;
      if (tool !== "fill") pushUndo();
      const cell = getCellFromEvent(e);
      if (cell) paintPixel(cell.x, cell.y);
    },
    [getCellFromEvent, paintPixel, pushUndo, tool]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isPainting.current || tool === "fill") return;
      const cell = getCellFromEvent(e);
      if (cell) paintPixel(cell.x, cell.y);
    },
    [getCellFromEvent, paintPixel, tool]
  );

  const handlePointerUp = useCallback(() => {
    isPainting.current = false;
  }, []);

  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Draw pixels
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        const colorIdx = pixels[y * SPRITE_SIZE + x] & 0x03;
        ctx.fillStyle = GB_PALETTE[colorIdx];
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= SPRITE_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Mirror line
    if (mirror) {
      ctx.strokeStyle = "rgba(255,0,0,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_SIZE / 2, 0);
      ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [pixels, mirror, CANVAS_SIZE]);

  return (
    <div className="sprite-editor">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        style={{
          width: "100%",
          maxWidth: `${CANVAS_SIZE}px`,
          touchAction: "none",
          cursor: "crosshair",
        }}
      />

      {/* Color palette */}
      <div className="gb-palette-row">
        {GB_PALETTE.map((c, i) => (
          <button
            key={i}
            className={`gb-color-btn ${color === i ? "selected" : ""}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(i)}
          />
        ))}
      </div>

      {/* Tools */}
      <div className="gb-tool-row">
        <button
          className={`gb-btn ${tool === "pencil" ? "active" : ""}`}
          onClick={() => setTool("pencil")}
        >
          DRAW
        </button>
        <button
          className={`gb-btn ${tool === "fill" ? "active" : ""}`}
          onClick={() => setTool("fill")}
        >
          FILL
        </button>
        <button
          className={`gb-btn ${tool === "eraser" ? "active" : ""}`}
          onClick={() => setTool("eraser")}
        >
          ERASE
        </button>
        <button
          className={`gb-btn ${mirror ? "active" : ""}`}
          onClick={() => setMirror(!mirror)}
        >
          MIRROR
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="gb-tool-row">
        <button
          className="gb-btn"
          onClick={undo}
          disabled={undoStack.length === 0}
        >
          UNDO
        </button>
        <button
          className="gb-btn"
          onClick={redo}
          disabled={redoStack.length === 0}
        >
          REDO
        </button>
        <button
          className="gb-btn"
          onClick={() => {
            pushUndo();
            onChange(createBlankSprite());
          }}
        >
          CLEAR
        </button>
      </div>
    </div>
  );
}
