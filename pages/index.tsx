import { useRouter } from "next/router";
import { useState } from "react";
import { Color, initGameState } from "~src/game/model";
import { supabase } from "../src/supabase";

function HomePage() {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(3);

  const createGame = async () => {
    if (playerCount < 3 || playerCount > 5) {
      return;
    }

    const game = initGameState(playerCount);
    const { data, error } = await supabase.from("games").upsert([
      {
        id: game.id,
        state: JSON.stringify(game),
      },
    ]);

    if (error) {
      console.log(error);
    } else {
      router.push(`/lobby/${data[0].id}`);
    }
  };

  return (
    <div className="center">
      <h1>Hansa Teutonica Online</h1>
      <p>Create a new game and share the link with your friends to play together!</p>

      <div className="player-conf">
        <span>Number of players:</span>
        <select 
          value={playerCount} 
          onChange={(e) => setPlayerCount(parseInt(e.target.value))}
        >
          <option value={3}>3 players</option>
          <option value={4}>4 players</option>
          <option value={5}>5 players</option>
        </select>
      </div>
      
      <div>
        <br />
        <button onClick={createGame}>Create a {playerCount}-player game</button>
      </div>
      
      <h2>Report bugs here</h2>
      <a href="https://github.com/skid/hansa">https://github.com/skid/hansa</a>
    </div>
  );
}

export default HomePage;
