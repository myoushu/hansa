import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Color, GameState, PlayerState } from "~src/game/model";
import { supabase } from "~src/supabase";

function JoinGamePage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>();
  const [playerName, setPlayerName] = useState("");
  const [selectedColor, setSelectedColor] = useState<Color>();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    if (!router.query.gameId) {
      return;
    }
    
    // Load initial state
    supabase
      .from("games")
      .select("state")
      .eq("id", router.query.gameId)
      .then(({ data, error }) => {
        if (error) {
          console.log(error);
          setError("Game not found");
        } else {
          const state = JSON.parse(data[0].state);
          setGameState(state);
          setLastUpdate(Date.now());
        }
      });

    // Subscribe to real-time updates
    const subscription = supabase
      .from(`games:id=eq.${router.query.gameId}`)
      .on("UPDATE", (update) => {
        try {
          if (!update?.new?.state) {
            console.warn("Received update without state data");
            return;
          }
          
          const newState = update.new.state;
          setGameState(newState);
          setLastUpdate(Date.now());
          
          // Check if selected color is no longer available
          const selectedColorStillAvailable = newState.players.some(
            (p: PlayerState) => p.color === selectedColor && !p.joined
          );
          
          if (selectedColor && !selectedColorStillAvailable) {
            setSelectedColor(undefined);
            setError("The color you selected was taken by another player. Please choose a different color.");
          }
        } catch (error) {
          console.error("Error processing real-time update:", error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [router.query.gameId, selectedColor]);

  const availableColors = gameState?.players.filter((p: PlayerState) => !p.joined) || [];
  const joinedPlayers = gameState?.players.filter((p: PlayerState) => p.joined) || [];

  const refreshGameState = async () => {
    if (!router.query.gameId) return;
    
    const { data, error } = await supabase
      .from("games")
      .select("state")
      .eq("id", router.query.gameId);
      
    if (!error && data?.length > 0) {
      const state = JSON.parse(data[0].state);
      setGameState(state);
      setLastUpdate(Date.now());
    }
  };

  const joinGame = async () => {
    if (!gameState || !selectedColor || !playerName.trim()) {
      return;
    }

    setJoining(true);
    setError("");

    try {
      // Fetch the latest game state to check for race conditions
      const { data: freshData, error: fetchError } = await supabase
        .from("games")
        .select("state")
        .eq("id", gameState.id);

      if (fetchError) {
        console.log(fetchError);
        setError("Failed to verify game state");
        return;
      }

      const freshGameState = JSON.parse(freshData[0].state);
      
      // Check if the selected color is still available
      const selectedPlayer = freshGameState.players.find((p: PlayerState) => p.color === selectedColor);
      if (!selectedPlayer || selectedPlayer.joined) {
        setError(`The ${selectedColor} color is no longer available. Another player just joined with that color.`);
        setSelectedColor(undefined);
        setGameState(freshGameState); // Update to fresh state
        return;
      }

      // Color is still available, proceed with joining
      const updatedState = { ...freshGameState };
      const player = updatedState.players.find((p: PlayerState) => p.color === selectedColor);
      if (player) {
        player.name = playerName.trim();
        player.joined = true;
      }

      const { error } = await supabase
        .from("games")
        .update({ state: JSON.stringify(updatedState) })
        .eq("id", gameState.id);

      if (error) {
        console.log(error);
        setError("Failed to join game. Please try again.");
      } else {
        // Redirect to the game
        router.push(`/play/${gameState.id}/${player?.id}`);
      }
    } catch (err) {
      setError("Failed to join game. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (!gameState) {
    return (
      <div className="center">
        <h1>Loading game...</h1>
      </div>
    );
  }

  if (availableColors.length === 0) {
    return (
      <div className="center">
        <h1>Game is full</h1>
        <p>All player slots have been taken.</p>
        <p>Joined players:</p>
        <ul>
          {joinedPlayers.map((p: PlayerState) => (
            <li key={p.id}>{p.name} ({p.color})</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="center">
      <h1>Join Hansa Teutonica Game</h1>
      
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Game Status:</h3>
          <button 
            onClick={refreshGameState}
            style={{ 
              padding: '0.25rem 0.5rem', 
              fontSize: '0.8rem',
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        </div>
        
        <p>{joinedPlayers.length} / {gameState.players.length} players joined</p>
        
        {joinedPlayers.length > 0 && (
          <div>
            <h4>Players already joined:</h4>
            <ul>
              {joinedPlayers.map((p: PlayerState) => (
                <li key={p.id}>
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    background: p.color,
                    borderRadius: '50%',
                    marginRight: '0.5rem',
                    border: '1px solid #333'
                  }} />
                  {p.name} ({p.color})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="player-conf">
        <span>Your name:</span>
        <input
          type="text"
          maxLength={12}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      <div className="player-conf">
        <span>Choose your color:</span>
        <select 
          value={selectedColor || ""} 
          onChange={(e) => {
            setSelectedColor(e.target.value as Color);
            setError(""); // Clear error when selecting new color
          }}
        >
          <option value="">Select a color</option>
          {availableColors.map((player: PlayerState) => (
            <option key={player.id} value={player.color}>
              {player.color.charAt(0).toUpperCase() + player.color.slice(1)}
            </option>
          ))}
        </select>
        {availableColors.length < 2 && (
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            ⚠️ Only {availableColors.length} color{availableColors.length !== 1 ? 's' : ''} remaining!
          </div>
        )}
      </div>

      <div>
        <br />
        <button 
          onClick={joinGame} 
          disabled={!playerName.trim() || !selectedColor || joining}
        >
          {joining ? "Joining..." : "Join Game"}
        </button>
      </div>
    </div>
  );
}

export default JoinGamePage;