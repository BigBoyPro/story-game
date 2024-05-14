import {Server} from "socket.io";
import {Pool} from "pg";
import {inactiveUsersHandler} from "./inactiveUsersHandler";
import {dbSelectLobbiesPlaying} from "../db";


export async function serverStart(io: Server, pool: Pool ){

    await inactiveUsersHandler(io, pool);

    // see if there are activeLobbies that were left in the middle of a round

    const {data: activeLobbies, error, success} = await dbSelectLobbiesPlaying(pool);
    if (!success) {
        console.error("error selecting activeLobbies playing: " + error);
        return;
    }
    if (Array.isArray(activeLobbies)) {
        for (const lobby of activeLobbies) {

        }

    }

}