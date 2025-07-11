import produce from "immer";
import { useCallback, useEffect, useState } from "react";
import { Action, GameState } from "./model";
import { executeAction } from "./actions";
import { getPlayer, validateAction } from "./helpers";
import { supabase } from "../supabase";

export type GameController = {
  playerId: string;
  state: GameState;
  error: string;
  action: Action;
  reset: () => void;
  clearError: () => void;
};

/**
 * Creates a new game client.
 */
export const useController = (gameId: string, playerId: string): GameController | null => {
  const [errorMessage, setErrorMessage] = useState("");
  const [originalState, setOriginalState] = useState<GameState>();
  const [immutableState, setState] = useState<GameState>();

  useEffect(() => {
    if (gameId) {
      supabase
        .from("games")
        .select("state")
        .eq("id", gameId)
        .then(({ data, error }) => {
          if (error) {
            console.log(error);
            setErrorMessage("Failed to load game");
          } else {
            const game = JSON.parse(data[0].state);
            
            // Validate that the player ID exists in the game state
            const playerExists = game.players.some((p: any) => p.id === playerId);
            if (!playerExists) {
              console.log(`Player ID ${playerId} not found in game state`);
              setErrorMessage("Invalid player. This player is not part of this game.");
              return;
            }
            
            setState(game);
            setOriginalState(game);
          }
        });
    }
  }, [gameId, playerId]);

  useEffect(() => {
    if (gameId) {
      supabase
        .from(`games:id=eq.${gameId}`)
        .on("UPDATE", (update) => {
          try {
            const newState = update.new.state;
            
            // Validate that the player ID still exists in the updated game state
            const playerExists = newState.players.some((p: any) => p.id === playerId);
            if (!playerExists) {
              console.log(`Player ID ${playerId} no longer exists in updated game state`);
              setErrorMessage("You are no longer part of this game.");
              return;
            }
            
            setState(newState);
            setOriginalState(newState);
          } catch (error) {
            console.error("Error processing game state update:", error);
            setErrorMessage("Failed to process game update");
          }
        })
        .subscribe();
      return () => {
        supabase.removeAllSubscriptions();
      };
    }
  }, [gameId, playerId]);

  if (typeof window !== "undefined") {
    (window as any).hansa = immutableState;
  }

  // The sync method saves the game state.
  // Sync also commits actions to the game log and undo is no longer possible afterwards.
  const sync = useCallback((state: GameState) => {
    supabase
      .from("games")
      .update({ state: JSON.stringify(state) })
      .eq("id", state.id)
      .then(({ error }) => {
        if (error) {
          console.log(error);
        }
        // Commit to log
        setOriginalState(state);
      });
  }, []);

  const action: Action = useCallback(
    (name, params) => {
      setState((immutableState) => {
        // Validate that the player exists in the game state
        if (!immutableState || !immutableState.players.some(p => p.id === playerId)) {
          console.log(`Action blocked: Player ID ${playerId} not found in game state`);
          setErrorMessage("Invalid player. You are not part of this game.");
          return immutableState;
        }
        
        if (getPlayer(immutableState!).id !== playerId) {
          return immutableState;
        }

        if (immutableState?.isOver && immutableState.context.phase !== "Route" && name !== "done") {
          console.log("Game is over");
          setErrorMessage("Game Over");
          return immutableState;
        }

        const error = validateAction(name, immutableState!, params);

        if (error) {
          console.log(error);
          setErrorMessage(error);
          return immutableState;
        }

        const newState = produce(immutableState, (draft: GameState) => {
          // Apply the action changes and get the new "current" state
          // Note that `executeAction` mutates the draft state
          const context = executeAction(name, draft, params);

          // The `draft.context` should not have been mutated
          draft.context.actions.push({ name, params });

          if (draft.context.prev === context) {
            // We are popping out of current context, store the actions
            context.actions[context.actions.length - 1].contextActions = draft.context.actions;
          }

          // Replace the `current` state with the new one
          draft.context = context;

          if (context.endGame) {
            draft.isOver = true;
          }
        });

        if (newState?.context.player !== immutableState?.context.player) {
          sync(JSON.parse(JSON.stringify(newState)));
        }

        return newState;
      });
    },
    [gameId, playerId]
  );

  if (!immutableState) {
    return null;
  }

  return {
    playerId,
    state: immutableState,
    error: errorMessage,
    action,
    clearError: () => setErrorMessage(""),
    reset: () => {
      setState(originalState);
    },
  };
};

export const defaultController: GameController = Object.freeze({
  playerId: "",
  state: {} as any,
  error: "",
  action: () => {
    throw new Error("Can't use default controller, please instantiate a new one!");
  },
  reset: () => {},
  clearError: () => {},
});
