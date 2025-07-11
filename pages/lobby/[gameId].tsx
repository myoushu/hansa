import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GameState } from "~src/game/model";
import { supabase } from "~src/supabase";

function LobbyPage() {
  const router = useRouter();
  const [state, setState] = useState<GameState>();
  const [gameStarted, setGameStarted] = useState(false);

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
        } else {
          const gameState = JSON.parse(data[0].state);
          setState(gameState);
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
          setState(update.new.state);
        } catch (error) {
          console.error("Error processing real-time update:", error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [router.query.gameId]);

  if (!state) {
    return (
      <div className="center">
        <h1>Loading game...</h1>
      </div>
    );
  }

  const joinedPlayers = state.players.filter(p => p.joined);
  const allPlayersJoined = joinedPlayers.length === state.players.length;
  const joinUrl = `${typeof location !== 'undefined' ? location.protocol + '//' + location.host : ''}/join/${state.id}`;

  const startGame = () => {
    setGameStarted(true);
    // For now, just show links. Later we could add a "game started" flag to state
  };

  return (
    <div className="center">
      <h1>Hansa Teutonica Game Lobby</h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Share this link to join the game:</h2>
        <div style={{ 
          background: '#f5f5f5', 
          padding: '0.5rem', 
          marginBottom: '1rem', 
          borderRadius: '4px',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          {joinUrl}
        </div>
        <button 
          onClick={() => navigator.clipboard.writeText(joinUrl)}
          style={{ padding: '0.5rem 1rem' }}
        >
          Copy Link
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Players ({joinedPlayers.length} / {state.players.length})</h3>
        
        {state.players.map((player) => (
          <div 
            key={player.id} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '0.5rem',
              marginBottom: '0.5rem',
              background: player.joined ? '#e8f5e8' : '#f5f5f5',
              borderRadius: '4px'
            }}
          >
            <div 
              style={{ 
                width: '20px', 
                height: '20px', 
                background: player.color, 
                borderRadius: '50%',
                border: '2px solid #333'
              }}
            />
            <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
              {player.color}
            </span>
            <span>
              {player.joined ? player.name : "Waiting for player..."}
            </span>
            {player.joined && <span style={{ color: 'green' }}>✓</span>}
          </div>
        ))}
      </div>

      {allPlayersJoined && !gameStarted && (
        <div style={{ marginBottom: '2rem' }}>
          <button 
            onClick={startGame}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '1.2rem',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {(gameStarted || allPlayersJoined) && (
        <div>
          <h3>Player Game Links:</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Each player should use their specific link to play:
          </p>
          {joinedPlayers.map((player) => (
            <div key={player.id} className="player-link" style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {player.name} ({player.color}):
              </div>
              <Link href={`/play/${state.id}/${player.id}`}>
                <a 
                  target="_blank"
                  style={{ 
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    background: '#007bff',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    marginRight: '0.5rem'
                  }}
                >
                  Play as {player.name}
                </a>
              </Link>
              <button 
                onClick={() => navigator.clipboard.writeText(`${typeof location !== 'undefined' ? location.protocol + '//' + location.host : ''}/play/${state.id}/${player.id}`)}
                style={{ padding: '0.5rem' }}
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '3rem', fontSize: '0.8rem', color: '#666' }}>
        <p>
          <strong>Note:</strong> This implementation has NO SECURITY whatsoever. A cheater can modify the game state, and even crash it for
          everyone. You definitely shouldn't play the world Hansa Teutonica championship here :)
        </p>
        
        <details style={{ marginTop: '1rem' }}>
          <summary>How to play</summary>
          <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '1rem auto' }}>
            <li>Right-click drag to pan the map</li>
            <li>Mousewheel to zoom the map</li>
            <li>Click on a trading post to place a tradesman</li>
            <li>Shift-Click for merchants</li>
            <li>Clicking an opponent's token will attempt to displace it. You can't undo this.</li>
            <li>Click on your tokens to collect, then click on empty trading posts to place them (move action)</li>
            <li>Top-left panel with buttons offers the rest of the actions</li>
            <li>Click "reset turn" to roll back all actions until the last time another player made a move</li>
            <li>End turn passes control to next player. You can't undo this.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}

export default LobbyPage;
