import {Server} from "socket.io";
import {Pool} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, Story} from "../../../../shared/sharedTypes";
import {dbSelectLobbyCurrentPart, dbSelectStoryByIndex, dbUpdateUserLastActive} from "../../db";
import {broadcastPart, broadcastStoryAtPart, sendError} from "../socketService";


export async function onGetStoryAtPart(io: Server, pool: Pool, userId: string, lobbyCode: string) {
    console.log("user " + userId + " sent get story at part request from " + lobbyCode);
    // update user last active
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, error);
        return;
    }

    let storyAndUser;
    ({data : storyAndUser, success, error} = await processOp(() =>
        getStoryAtPart(pool, lobbyCode)
    ));
    if (!success || storyAndUser === undefined) {
        error && sendError(userId, error);
        return;
    }
    broadcastStoryAtPart(io, lobbyCode, storyAndUser);
  }


const getStoryAtPart = async (pool: Pool, lobbyCode: string): Promise<OpResult<{ story: Story, userIndex: number }>> => {
    let story;

    let {data: part, success, error} = await dbSelectLobbyCurrentPart(pool, lobbyCode, true);
    if (!success || !part) return {success, error};
    let {storyIndex, userIndex} = part;
    if (storyIndex === null || userIndex === null) return {success: false, error: {type: ErrorType.PART_IS_NULL, logLevel: LogLevel.Error, error: "story index or user index is null"}};

    ({data: story, success, error} = await dbSelectStoryByIndex(pool, lobbyCode, storyIndex));
    if (!success || !story) return {success, error};

    return {success: true, data: {story, userIndex}};
};
