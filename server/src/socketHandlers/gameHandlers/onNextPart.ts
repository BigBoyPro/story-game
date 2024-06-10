import {Pool} from "pg";
import {Server} from "socket.io";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent, Story} from "../../../../shared/sharedTypes";
import {
    dbSelectLobbyCurrentPart, dbSelectLobbyRoundsCount,
    dbSelectStoryByIndex,
    dbTransaction, dbUpdateLobbyCurrentPart,
    dbUpdateUserLastActive
} from "../../db";
import {broadcastPart, broadcastStoryAtPart, sendError} from "../socketService";


export async function onNextPart(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    console.log("user " + userId + " sent next part request from " + lobbyCode);
    // update user last active
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let storyAndUserAndCount;
    ({data : storyAndUserAndCount, success, error} = await processOp(() =>
        nextPart(pool, lobbyCode)
    ));
    if (!success || storyAndUserAndCount === undefined) {
        error && sendError(userId, event, error);
        return;
    }
    const {story, userIndex, storiesCount} = storyAndUserAndCount;
    if (story) {
        broadcastStoryAtPart(io, lobbyCode, {story, userIndex, storiesCount});
    } else{
        broadcastPart(io, lobbyCode, {userIndex, storiesCount});
    }


}


const nextPart = async (pool: Pool, lobbyCode: string)=> {
    return dbTransaction(pool, async (client): Promise<OpResult<{ story?: Story, userIndex: number , storiesCount: number}>> => {

        let {data: part, success, error} = await dbSelectLobbyCurrentPart(client, lobbyCode, true)
        if (!success || !part) return {success, error};
        let {storyIndex, userIndex} = part;

        if (storyIndex === null || userIndex === null) return {success: false, error: {type: ErrorType.PART_IS_NULL, logLevel: LogLevel.Error, error: "story index or user index is null"}};

        // get rounds count
        let roundsCount;
        ({data: roundsCount, success, error} = await dbSelectLobbyRoundsCount(pool, lobbyCode));
        if (!success || roundsCount === undefined) return {success, error};

        userIndex++;
        if (userIndex > roundsCount - 1) {
            userIndex = 0;
            storyIndex++;
        }
        if (storyIndex > roundsCount - 1) return {success: false, error: {type: ErrorType.STORY_INDEX_OUT_OF_BOUNDS, logLevel: LogLevel.Error, error: "story index out of bounds"}};

        let story;
        if (userIndex === 0) {
            ({data: story, success, error} = await dbSelectStoryByIndex(client, lobbyCode, storyIndex));
            if (!success || !story) return {success, error};
        }

        ({success, error} = await dbUpdateLobbyCurrentPart(client, lobbyCode, storyIndex, userIndex));
        if (!success) return {success, error};

        return {success: true, data: {story, userIndex, storiesCount: roundsCount}};
    })
};
