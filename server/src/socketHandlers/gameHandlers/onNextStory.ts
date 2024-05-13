import {Pool} from "pg";
import {Server} from "socket.io";
import {processOp} from "../../../../shared/sharedTypes";
import {dbSelectStoryByIndex, dbUpdateUserLastActive} from "../../db";
import {broadcastNextStory, sendError} from "../socketService";


export async function onNextStory(userId: string, lobbyCode: string, index: number, pool: Pool, io: Server) {
    console.log("user " + userId + " sent next story request from " + lobbyCode + " with index " + index);
    // update user last active
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, error);
        return;
    }
    let story;
    ({data: story, success, error} = await processOp(() =>
        nextStory(pool, lobbyCode, index)
    ));
    if (!success || !story) {
        error && sendError(userId, error);
        return;
    }

    broadcastNextStory(io, story.lobbyCode, story);
    console.log("story sent to " + userId + " in lobby " + story.lobbyCode + " with index " + index);
}


const nextStory = (pool: Pool, lobbyCode: string, index: number) =>
    dbSelectStoryByIndex(pool, lobbyCode, index);
