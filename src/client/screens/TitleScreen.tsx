import { useCallback, useRef } from "react";
import GameBoyScreen from "../components/GameBoyScreen";
import { drawTextCentered } from "../canvas/pixelText";
import { SCREEN_WIDTH } from "@shared/constants";

interface TitleScreenProps {
  onStart: () => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  const startTime = useRef(Date.now());

  const onRender = useCallback((ctx: CanvasRenderingContext2D) => {
    const elapsed = Date.now() - startTime.current;

    // Title
    drawTextCentered(ctx, "DOKEMON", SCREEN_WIDTH / 2, 30, 0, 2);

    // Subtitle
    drawTextCentered(ctx, "DURABLE OBJECT", SCREEN_WIDTH / 2, 55, 1, 1);
    drawTextCentered(ctx, "MONSTERS", SCREEN_WIDTH / 2, 63, 1, 1);

    // Blinking "PRESS START"
    if (Math.floor(elapsed / 500) % 2 === 0) {
      drawTextCentered(ctx, "PRESS START", SCREEN_WIDTH / 2, 100, 0, 1);
    }

    // Version
    drawTextCentered(ctx, "V1.0", SCREEN_WIDTH / 2, 130, 1, 1);
  }, []);

  const handleClick = useCallback(() => {
    onStart();
  }, [onStart]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === "Enter" || key === " ") onStart();
    },
    [onStart]
  );

  return (
    <GameBoyScreen
      onRender={onRender}
      onClick={handleClick}
      onKeyDown={handleKey}
    />
  );
}
