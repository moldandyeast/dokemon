import { useState, useCallback, useEffect, useRef } from "react";
import TitleScreen from "./screens/TitleScreen";
import MainMenu, { MenuOption } from "./screens/MainMenu";
import CreatorStudio from "./screens/CreatorStudio";
import Collection from "./screens/Collection";
import Matchmaking from "./screens/Matchmaking";
import BattleScreen from "./screens/BattleScreen";
import { createDOkemon, seedStarterDOkemon } from "./lib/api";
import { DOkemonType, StatBlock } from "@shared/types";
import { INITIAL_RATING } from "@shared/constants";

type Screen =
  | { type: "title" }
  | { type: "menu" }
  | { type: "creator" }
  | { type: "collection" }
  | { type: "battle_select" }
  | { type: "cpu_select" }
  | { type: "matchmaking"; dokemonId: string }
  | { type: "battle"; battleId: string; dokemonId: string }
  | { type: "cpu_battle"; battleId: string; dokemonId: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: "title" });
  const seeded = useRef(false);

  // Auto-seed starter DOkemon on first play
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    seedStarterDOkemon().then((count) => {
      if (count > 0) console.log(`Seeded ${count} starter DOkemon!`);
    }).catch(() => {
      // Silently fail — server may not be ready yet
    });
  }, []);

  const handleMenuSelect = useCallback((option: MenuOption) => {
    switch (option) {
      case "create":
        setScreen({ type: "creator" });
        break;
      case "collection":
        setScreen({ type: "collection" });
        break;
      case "battle":
        setScreen({ type: "battle_select" });
        break;
      case "vs_cpu":
        setScreen({ type: "cpu_select" });
        break;
    }
  }, []);

  const handleCreation = useCallback(
    async (data: {
      sprite: string;
      name: string;
      type: DOkemonType;
      baseStats: StatBlock;
      moveIds: [string, string, string, string];
    }) => {
      try {
        await createDOkemon(data);
        setScreen({ type: "collection" });
      } catch (err) {
        console.error("Failed to create DOkemon:", err);
        alert("Failed to create DOkemon. Is the server running?");
      }
    },
    []
  );

  const goMenu = useCallback(() => setScreen({ type: "menu" }), []);

  switch (screen.type) {
    case "title":
      return <TitleScreen onStart={() => setScreen({ type: "menu" })} />;
    case "menu":
      return <MainMenu onSelect={handleMenuSelect} />;
    case "creator":
      return <CreatorStudio onComplete={handleCreation} onBack={goMenu} />;
    case "collection":
      return (
        <Collection
          onBack={goMenu}
          onSelect={() => {}}
          onBattle={() => {}}
        />
      );
    case "battle_select":
      return (
        <Collection
          onBack={goMenu}
          onSelect={() => {}}
          onBattle={(dokemonId) =>
            setScreen({ type: "matchmaking", dokemonId })
          }
          battleMode
        />
      );
    case "matchmaking":
      return (
        <Matchmaking
          dokemonId={screen.dokemonId}
          rating={INITIAL_RATING}
          onMatchFound={(battleId) =>
            setScreen({
              type: "battle",
              battleId,
              dokemonId: screen.dokemonId,
            })
          }
          onBack={goMenu}
        />
      );
    case "cpu_select":
      return (
        <Collection
          onBack={goMenu}
          onSelect={() => {}}
          onBattle={(dokemonId) => {
            const battleId = `cpu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setScreen({ type: "cpu_battle", battleId, dokemonId });
          }}
          battleMode
        />
      );
    case "battle":
      return (
        <BattleScreen
          battleId={screen.battleId}
          dokemonId={screen.dokemonId}
          rating={INITIAL_RATING}
          onEnd={goMenu}
        />
      );
    case "cpu_battle":
      return (
        <BattleScreen
          battleId={screen.battleId}
          dokemonId={screen.dokemonId}
          rating={INITIAL_RATING}
          onEnd={goMenu}
          cpu
        />
      );
    default:
      return <TitleScreen onStart={() => setScreen({ type: "menu" })} />;
  }
}
