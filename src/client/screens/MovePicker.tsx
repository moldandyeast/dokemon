import { useState } from "react";
import { DOkemonType, MoveCategory, Move } from "@shared/types";
import { MOVE_POOL } from "@shared/moves";
import { MAX_MOVES } from "@shared/constants";

interface MovePickerProps {
  dokemonType: DOkemonType | null;
  selectedMoveIds: string[];
  onToggle: (moveId: string) => void;
}

export default function MovePicker({
  dokemonType,
  selectedMoveIds,
  onToggle,
}: MovePickerProps) {
  const [filter, setFilter] = useState<DOkemonType | "NEUTRAL" | "ALL">("ALL");

  const filtered =
    filter === "ALL"
      ? MOVE_POOL
      : MOVE_POOL.filter((m) => m.type === filter);

  const isStab = (move: Move) =>
    dokemonType !== null && move.type === dokemonType;

  const catLabel = (cat: MoveCategory) => {
    switch (cat) {
      case MoveCategory.PHYSICAL:
        return "ATK";
      case MoveCategory.SPECIAL:
        return "SPC";
      case MoveCategory.STATUS:
        return "STS";
    }
  };

  return (
    <div className="move-picker">
      <div className="gb-label">
        SELECT MOVES ({selectedMoveIds.length}/{MAX_MOVES})
      </div>

      {/* Filter tabs */}
      <div className="move-filter-row">
        <button
          className={`gb-btn-sm ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          ALL
        </button>
        {dokemonType && (
          <button
            className={`gb-btn-sm ${filter === dokemonType ? "active" : ""}`}
            onClick={() => setFilter(dokemonType)}
          >
            {dokemonType}
          </button>
        )}
        <button
          className={`gb-btn-sm ${filter === "NEUTRAL" ? "active" : ""}`}
          onClick={() => setFilter("NEUTRAL")}
        >
          NEUTRAL
        </button>
      </div>

      {/* Move list */}
      <div className="move-list">
        {filtered.map((move) => {
          const selected = selectedMoveIds.includes(move.id);
          const disabled =
            !selected && selectedMoveIds.length >= MAX_MOVES;
          return (
            <button
              key={move.id}
              className={`move-item ${selected ? "selected" : ""} ${
                disabled ? "disabled" : ""
              }`}
              onClick={() => !disabled && onToggle(move.id)}
              disabled={disabled && !selected}
            >
              <div className="move-header">
                <span className="move-name">
                  {isStab(move) && "* "}
                  {move.name}
                </span>
                <span className="move-type">
                  {move.type === "NEUTRAL" ? "---" : move.type}
                </span>
              </div>
              <div className="move-stats">
                <span>{catLabel(move.category)}</span>
                <span>POW:{move.power || "-"}</span>
                <span>PP:{move.pp}</span>
                <span>ACC:{move.accuracy || "-"}</span>
              </div>
              <div className="move-desc">{move.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
