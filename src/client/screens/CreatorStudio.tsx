import { useState, useCallback, useRef, useEffect } from "react";
import { DOkemonType, StatBlock } from "@shared/types";
import {
  GB_PALETTE,
  STAT_BUDGET,
  STAT_MIN,
  SPRITE_SIZE,
  NAME_MAX_LENGTH,
  MAX_MOVES,
  STAT_NAMES,
} from "@shared/constants";
import { createBlankSprite, drawSprite, encodeSpriteData } from "../canvas/spriteRenderer";
import SpriteEditor from "./SpriteEditor";
import TypePicker from "./TypePicker";
import StatAllocator from "./StatAllocator";
import MovePicker from "./MovePicker";
import { getMoveById } from "@shared/moves";

interface CreatorStudioProps {
  onComplete: (data: {
    sprite: string;
    name: string;
    type: DOkemonType;
    baseStats: StatBlock;
    moveIds: [string, string, string, string];
  }) => void;
  onBack: () => void;
}

const DEFAULT_STATS: StatBlock = {
  hp: 60,
  atk: 60,
  def: 60,
  spc: 60,
  spd: 60,
};

export default function CreatorStudio({ onComplete, onBack }: CreatorStudioProps) {
  const [step, setStep] = useState(0);
  const [pixels, setPixels] = useState<Uint8Array>(createBlankSprite);
  const [name, setName] = useState("");
  const [type, setType] = useState<DOkemonType | null>(null);
  const [stats, setStats] = useState<StatBlock>(DEFAULT_STATS);
  const [moveIds, setMoveIds] = useState<string[]>([]);

  const previewRef = useRef<HTMLCanvasElement>(null);

  // Draw preview sprite
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSprite(ctx, pixels, 0, 0, 3);
  }, [pixels, step]);

  const toggleMove = useCallback((moveId: string) => {
    setMoveIds((prev) => {
      if (prev.includes(moveId)) return prev.filter((id) => id !== moveId);
      if (prev.length >= MAX_MOVES) return prev;
      return [...prev, moveId];
    });
  }, []);

  const total = STAT_NAMES.reduce((sum, s) => sum + stats[s], 0);
  const canProceed = () => {
    switch (step) {
      case 0: // sprite + name
        return name.length > 0 && name.length <= NAME_MAX_LENGTH;
      case 1: // type
        return type !== null;
      case 2: // stats
        return total === STAT_BUDGET;
      case 3: // moves
        return moveIds.length === MAX_MOVES;
      case 4: // preview
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    if (!type || moveIds.length !== MAX_MOVES) return;
    onComplete({
      sprite: encodeSpriteData(pixels),
      name: name.toUpperCase(),
      type,
      baseStats: stats,
      moveIds: moveIds as [string, string, string, string],
    });
  };

  const STEPS = ["DRAW", "TYPE", "STATS", "MOVES", "REVIEW"];

  return (
    <div className="creator-studio">
      {/* Header */}
      <div className="creator-header">
        <button className="gb-btn" onClick={step > 0 ? () => setStep(step - 1) : onBack}>
          BACK
        </button>
        <span className="creator-step-label">{STEPS[step]}</span>
        <div className="creator-preview-mini">
          <canvas
            ref={previewRef}
            width={SPRITE_SIZE * 3}
            height={SPRITE_SIZE * 3}
            style={{ width: 48, height: 48, imageRendering: "pixelated" }}
          />
        </div>
      </div>

      {/* Step progress */}
      <div className="step-dots">
        {STEPS.map((_, i) => (
          <span key={i} className={`step-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>

      {/* Step content */}
      <div className="creator-content">
        {step === 0 && (
          <div className="step-sprite">
            <SpriteEditor pixels={pixels} onChange={setPixels} />
            <div className="name-input-row">
              <label className="gb-label">NAME</label>
              <input
                type="text"
                className="gb-input"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9 ]/g, "")
                      .slice(0, NAME_MAX_LENGTH)
                  )
                }
                placeholder="ENTER NAME"
                maxLength={NAME_MAX_LENGTH}
              />
            </div>
          </div>
        )}

        {step === 1 && <TypePicker selected={type} onSelect={setType} />}

        {step === 2 && <StatAllocator stats={stats} onChange={setStats} />}

        {step === 3 && (
          <MovePicker
            dokemonType={type}
            selectedMoveIds={moveIds}
            onToggle={toggleMove}
          />
        )}

        {step === 4 && (
          <div className="review-panel">
            <div className="gb-label">REVIEW YOUR DOKEMON</div>
            <div className="review-info">
              <div className="review-name">{name || "???"}</div>
              <div className="review-type">TYPE: {type || "???"}</div>
              <div className="review-stats">
                {STAT_NAMES.map((s) => (
                  <div key={s} className="review-stat">
                    {s.toUpperCase()}: {stats[s]}
                  </div>
                ))}
              </div>
              <div className="review-moves">
                {moveIds.map((id) => (
                  <div key={id} className="review-move">
                    {getMoveById(id).name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="creator-footer">
        {step < 4 ? (
          <button
            className="gb-btn gb-btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            NEXT
          </button>
        ) : (
          <button className="gb-btn gb-btn-primary" onClick={handleSubmit}>
            GIVE LIFE!
          </button>
        )}
      </div>
    </div>
  );
}
