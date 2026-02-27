import { DOkemonType } from "@shared/types";
import { TYPE_INFO } from "@shared/constants";

interface TypePickerProps {
  selected: DOkemonType | null;
  onSelect: (type: DOkemonType) => void;
}

const ALL_TYPES = Object.values(DOkemonType);

export default function TypePicker({ selected, onSelect }: TypePickerProps) {
  return (
    <div className="type-picker">
      <div className="gb-label">SELECT TYPE</div>
      <div className="type-grid">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            className={`type-btn ${selected === t ? "selected" : ""}`}
            onClick={() => onSelect(t)}
          >
            <span className="type-name">{TYPE_INFO[t].label}</span>
            <span className="type-desc">{TYPE_INFO[t].description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
