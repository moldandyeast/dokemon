import { useState, useCallback, useRef } from "react";
import GameBoyScreen from "../components/GameBoyScreen";
import { drawText, drawTextCentered } from "../canvas/pixelText";
import { SCREEN_WIDTH } from "@shared/constants";

export type MenuOption = "battle" | "vs_cpu" | "create" | "collection";

interface MainMenuProps {
  onSelect: (option: MenuOption) => void;
}

const MENU_ITEMS: { label: string; value: MenuOption }[] = [
  { label: "VS CPU", value: "vs_cpu" },
  { label: "BATTLE", value: "battle" },
  { label: "CREATE", value: "create" },
  { label: "COLLECTION", value: "collection" },
];

const MENU_Y_START = 48;
const MENU_SPACING = 14;

export default function MainMenu({ onSelect }: MainMenuProps) {
  const [cursor, setCursor] = useState(0);
  const blinkRef = useRef(Date.now());

  const onRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const blink = Math.floor((Date.now() - blinkRef.current) / 300) % 2 === 0;

      // Header
      drawTextCentered(ctx, "DOKEMON", SCREEN_WIDTH / 2, 15, 0, 2);

      // Decorative line
      ctx.fillStyle = "#306230";
      ctx.fillRect(10, 38, SCREEN_WIDTH - 20, 1);

      // Menu items
      for (let i = 0; i < MENU_ITEMS.length; i++) {
        const y = MENU_Y_START + i * MENU_SPACING;
        const isSelected = i === cursor;

        // Cursor arrow
        if (isSelected && blink) {
          drawText(ctx, ">", 25, y, 0, 1);
        }

        // Menu label
        drawText(ctx, MENU_ITEMS[i].label, 38, y, isSelected ? 0 : 1, 1);
      }

      // Footer hint
      drawTextCentered(ctx, "SELECT WITH", SCREEN_WIDTH / 2, 118, 1, 1);
      drawTextCentered(ctx, "ARROWS OR TAP", SCREEN_WIDTH / 2, 128, 1, 1);
    },
    [cursor]
  );

  const handleKey = useCallback(
    (key: string) => {
      if (key === "ArrowUp") {
        setCursor((c) => (c - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (key === "ArrowDown") {
        setCursor((c) => (c + 1) % MENU_ITEMS.length);
      } else if (key === "Enter" || key === " ") {
        onSelect(MENU_ITEMS[cursor].value);
      }
    },
    [cursor, onSelect]
  );

  const handleClick = useCallback(
    (_x: number, y: number) => {
      for (let i = 0; i < MENU_ITEMS.length; i++) {
        const itemY = MENU_Y_START + i * MENU_SPACING;
        if (y >= itemY - 2 && y < itemY + 8) {
          setCursor(i);
          onSelect(MENU_ITEMS[i].value);
          return;
        }
      }
    },
    [onSelect]
  );

  return (
    <GameBoyScreen
      onRender={onRender}
      onClick={handleClick}
      onKeyDown={handleKey}
    />
  );
}
