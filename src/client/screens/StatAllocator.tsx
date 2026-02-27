import { StatBlock } from "@shared/types";
import { STAT_BUDGET, STAT_MIN, STAT_MAX, STAT_NAMES } from "@shared/constants";

interface StatAllocatorProps {
  stats: StatBlock;
  onChange: (stats: StatBlock) => void;
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spc: "SPC",
  spd: "SPD",
};

export default function StatAllocator({ stats, onChange }: StatAllocatorProps) {
  const total = STAT_NAMES.reduce((sum, s) => sum + stats[s], 0);
  const remaining = STAT_BUDGET - total;

  const adjust = (stat: keyof StatBlock, delta: number) => {
    const current = stats[stat];
    const next = Math.max(STAT_MIN, Math.min(STAT_MAX, current + delta));
    const newTotal = total - current + next;
    if (newTotal > STAT_BUDGET) return;
    onChange({ ...stats, [stat]: next });
  };

  return (
    <div className="stat-allocator">
      <div className="gb-label">ALLOCATE STATS</div>
      <div className="stat-budget">
        POINTS: {total}/{STAT_BUDGET}
        {remaining > 0 && <span className="stat-remaining"> ({remaining} LEFT)</span>}
      </div>

      {STAT_NAMES.map((stat) => {
        const value = stats[stat];
        const pct = ((value - STAT_MIN) / (STAT_MAX - STAT_MIN)) * 100;
        return (
          <div key={stat} className="stat-row">
            <span className="stat-label">{STAT_LABELS[stat]}</span>
            <button
              className="gb-btn-sm"
              onClick={() => adjust(stat, -5)}
              disabled={value <= STAT_MIN}
            >
              -
            </button>
            <div className="stat-bar-container">
              <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <button
              className="gb-btn-sm"
              onClick={() => adjust(stat, 5)}
              disabled={value >= STAT_MAX || remaining <= 0}
            >
              +
            </button>
            <span className="stat-value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
