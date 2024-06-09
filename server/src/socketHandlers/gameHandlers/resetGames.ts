import {Server} from "socket.io";
import {Pool} from "pg";
import {inactiveUsersHandler} from "../inactiveUsersHandler";
import {dbSelectLobbiesActive} from "../../db";
import {onRestartRound} from "./roundHandler";
import {processOp} from "../../../../shared/sharedTypes";

// Function to reset games
export async function resetGames(io: Server, pool: Pool ){
    // Handle inactive users
    await inactiveUsersHandler(io, pool);

    // Check if there are active lobbies that were left in the middle of a round
    const {data: activeLobbies, error, success} = await processOp(() =>
        dbSelectLobbiesActive(pool)
    );
    // If the retrieval fails, log an error
    if (!success) {
        console.error("error selecting activeLobbies playing: " + error);
        return;
    }
    // If there are active lobbies, restart the round for each lobby that was left in the middle of a round
    if (Array.isArray(activeLobbies)) {
        for (const lobby of activeLobbies) {
            if(lobby.round > 0){
                // restart round
                await onRestartRound(io, pool, lobby)
            }
        }
    }
}