import { useState, useEffect, useRef } from "react";
import { DOkemonData } from "@shared/types";
import { SPRITE_SIZE } from "@shared/constants";
import { decodeSpriteData, drawSprite } from "../canvas/spriteRenderer";
import { getCollection } from "../lib/api";

interface CollectionProps {
  onBack: () => void;
  onSelect: (dokemon: DOkemonData) => void;
  onBattle: (dokemonId: string) => void;
  battleMode?: boolean;
}

function SpriteThumb({ sprite }: { sprite: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    drawSprite(ctx, decodeSpriteData(sprite), 0, 0, 3);
  }, [sprite]);
  return (
    <canvas
      ref={ref}
      width={SPRITE_SIZE * 3}
      height={SPRITE_SIZE * 3}
      style={{ width: 48, height: 48, imageRendering: "pixelated" }}
    />
  );
}

export default function Collection({
  onBack,
  onSelect,
  onBattle,
  battleMode,
}: CollectionProps) {
  const [dokemon, setDokemon] = useState<DOkemonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getCollection()
      .then(setDokemon)
      .catch(() => setDokemon([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="collection-screen">
      <div className="collection-header">
        <button className="gb-btn" onClick={onBack}>
          BACK
        </button>
        <span className="gb-label" style={{ margin: 0 }}>
          {battleMode ? "PICK FIGHTER" : "COLLECTION"}
        </span>
        <span className="gb-label" style={{ margin: 0, fontSize: 7 }}>
          {dokemon.length}
        </span>
      </div>

      <div className="collection-grid">
        {loading && <div className="collection-empty">LOADING...</div>}
        {!loading && dokemon.length === 0 && (
          <div className="collection-empty">NO DOKEMON YET! GO CREATE ONE!</div>
        )}
        {dokemon.map((d) => (
          <div
            key={d.id}
            className={`collection-item ${selected === d.id ? "selected" : ""}`}
            onClick={() => {
              setSelected(d.id);
              if (!battleMode) onSelect(d);
            }}
          >
            <SpriteThumb sprite={d.sprite} />
            <span className="collection-item-name">{d.name}</span>
            <span className="collection-item-level">LV{d.level}</span>
          </div>
        ))}
      </div>

      {battleMode && (
        <div className="collection-footer">
          <button className="gb-btn" onClick={onBack}>
            CANCEL
          </button>
          <button
            className="gb-btn gb-btn-primary"
            onClick={() => selected && onBattle(selected)}
            disabled={!selected}
          >
            BATTLE!
          </button>
        </div>
      )}
    </div>
  );
}
