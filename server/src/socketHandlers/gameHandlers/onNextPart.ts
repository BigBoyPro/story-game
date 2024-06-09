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

// Main function to handle the next part request
export async function onNextPart(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    // Log the next part request by the user
    console.log("user " + userId + " sent next part request from " + lobbyCode);

    // Update the user's last activity
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    // If the update fails, send an error
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let storyAndUser;
    // Attempt to get the next part
    ({data : storyAndUser, success, error} = await processOp(() =>
        nextPart(pool, lobbyCode)
    ));
    // If the retrieval fails, send an error
    if (!success || storyAndUser === undefined) {
        error && sendError(userId, event, error);
        return;
    }
    const {story, userIndex} = storyAndUser;
    // If there is a story, broadcast the story at a part
    if (story) {
        broadcastStoryAtPart(io, lobbyCode, {story, userIndex});
    } else {
        // Otherwise, broadcast the part
        broadcastPart(io, lobbyCode, userIndex);
    }
}

// Function to get the next part
const nextPart = async (pool: Pool, lobbyCode: string)=> {
    return dbTransaction(pool, async (client): Promise<OpResult<{ story?: Story, userIndex: number }>> => {
        // Get the number of users
        let {data: userCount, error, success} = await dbSelectUsersInLobbyCount(client, lobbyCode);
        // If the retrieval fails, return an error
        if (!success || userCount === undefined) return {success, error};

        let story, part;
        // Get the current part of the lobby
        ({data: part, success, error} = await dbSelectLobbyCurrentPart(client, lobbyCode, true))
        // If the retrieval fails, return an error
        if (!success || !part) return {success, error};
        let {storyIndex, userIndex} = part;

        // If the story index or user index is null, return an error
        if (storyIndex === null || userIndex === null) return {success: false, error: {type: ErrorType.PART_IS_NULL, logLevel: LogLevel.Error, error: "story index or user index is null"}};

        // Increment the user index
        userIndex++;
        // If the user index is greater than the number of users - 1, reset it to 0 and increment the story index
        if (userIndex > userCount - 1) {
            userIndex = 0;
            storyIndex++;
        }
        // If the story index is greater than the number of users - 1, return an error
        if (storyIndex > userCount - 1) return {success: false, error: {type: ErrorType.STORY_INDEX_OUT_OF_BOUNDS, logLevel: LogLevel.Error, error: "story index out of bounds"}};

        // If the user index is 0, get the story by its index
        if (userIndex === 0) {
            ({data: story, success, error} = await dbSelectStoryByIndex(client, lobbyCode, storyIndex));
            // If the retrieval fails, return an error
            if (!success || !story) return {success, error};
        }

        // Update the current part of the lobby
        ({success, error} = await dbUpdateLobbyCurrentPart(client, lobbyCode, storyIndex, userIndex));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return the story (if there is one) and the user index
        return {success: true, data: {story, userIndex}};
    })
};