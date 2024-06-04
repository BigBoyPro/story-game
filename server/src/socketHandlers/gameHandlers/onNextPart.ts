import {Pool} from "pg";
import {Server} from "socket.io";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent, Story} from "../../../../shared/sharedTypes";
import {
    dbSelectLobbyCurrentPart,
    dbSelectStoryByIndex,
    dbSelectUsersInLobbyCount, dbTransaction, dbUpdateLobbyCurrentPart,
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

    let storyAndUser;
    ({data : storyAndUser, success, error} = await processOp(() =>
        nextPart(pool, lobbyCode)
    ));
    if (!success || storyAndUser === undefined) {
        error && sendError(userId, event, error);
        return;
    }
    const {story, userIndex} = storyAndUser;
    if (story) {
        broadcastStoryAtPart(io, lobbyCode, {story, userIndex});
    } else{
        broadcastPart(io, lobbyCode, userIndex);
    }


}


const nextPart = async (pool: Pool, lobbyCode: string)=> {
    return dbTransaction(pool, async (client): Promise<OpResult<{ story?: Story, userIndex: number }>> => {
        // get number of users
        let {data: userCount, error, success} = await dbSelectUsersInLobbyCount(client, lobbyCode);
        if (!success || userCount === undefined) return {success, error};


        let story, part;
        ({data: part, success, error} = await dbSelectLobbyCurrentPart(client, lobbyCode, true))
        if (!success || !part) return {success, error};
        let {storyIndex, userIndex} = part;

        if (storyIndex === null || userIndex === null) return {success: false, error: {type: ErrorType.PART_IS_NULL, logLevel: LogLevel.Error, error: "story index or user index is null"}};

        userIndex++;
        if (userIndex > userCount - 1) {
            userIndex = 0;
            storyIndex++;
        }
        if (storyIndex > userCount - 1) return {success: false, error: {type: ErrorType.STORY_INDEX_OUT_OF_BOUNDS, logLevel: LogLevel.Error, error: "story index out of bounds"}};

        if (userIndex === 0) {
            ({data: story, success, error} = await dbSelectStoryByIndex(client, lobbyCode, storyIndex));
            if (!success || !story) return {success, error};
        }

        ({success, error} = await dbUpdateLobbyCurrentPart(client, lobbyCode, storyIndex, userIndex));
        if (!success) return {success, error};

        return {success: true, data: {story, userIndex}};
    })
};
