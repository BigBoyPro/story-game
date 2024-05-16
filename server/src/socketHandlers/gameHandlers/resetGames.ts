import {Server} from "socket.io";
import {Pool} from "pg";
import {inactiveUsersHandler} from "../inactiveUsersHandler";
import {dbSelectLobbiesActive} from "../../db";
import {onRestartRound} from "./roundHandler";
import {processOp} from "../../../../shared/sharedTypes";

export async function resetGames(io: Server, pool: Pool ){
    await inactiveUsersHandler(io, pool);

    // see if there are activeLobbies that were left in the middle of a round
    const {data: activeLobbies, error, success} = await processOp(() =>
        dbSelectLobbiesActive(pool)
    );
    console.log("activeLobbies: ", activeLobbies)
    if (!success) {
        console.error("error selecting activeLobbies playing: " + error);
        return;
    }
    if (Array.isArray(activeLobbies)) {
        for (const lobby of activeLobbies) {
            if(lobby.round > 0){
                // restart round
                await onRestartRound(io, pool, lobby)
            }
        }
    }
}