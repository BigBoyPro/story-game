import {Server} from "socket.io";
import {Pool} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent, Story} from "../../../../shared/sharedTypes";
import {dbSelectLobbyCurrentPart, dbSelectStoryByIndex, dbUpdateUserLastActive} from "../../db";
import { broadcastStoryAtPart, sendError} from "../socketService";

// Main function to handle the retrieval of a story at a certain part
export async function onGetStoryAtPart(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    // Log the get story at part request by the user
    console.log("user " + userId + " sent get story at part request from " + lobbyCode);

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
    // Attempt to get the story at a part
    ({data : storyAndUser, success, error} = await processOp(() =>
        getStoryAtPart(pool, lobbyCode)
    ));
    // If the retrieval fails, send an error
    if (!success || storyAndUser === undefined) {
        error && sendError(userId, event, error);
        return;
    }
    // Broadcast the story at a part to all users
    broadcastStoryAtPart(io, lobbyCode, storyAndUser);
}

// Function to get a story at a certain part
const getStoryAtPart = async (pool: Pool, lobbyCode: string): Promise<OpResult<{ story: Story, userIndex: number }>> => {
    let story;

    // Get the current part of the lobby
    let {data: part, success, error} = await dbSelectLobbyCurrentPart(pool, lobbyCode, true);
    // If the retrieval fails, return an error
    if (!success || !part) return {success, error};
    let {storyIndex, userIndex} = part;
    // If the story index or user index is null, return an error
    if (storyIndex === null || userIndex === null) return {success: false, error: {type: ErrorType.PART_IS_NULL, logLevel: LogLevel.Error, error: "story index or user index is null"}};

    // Get the story by its index
    ({data: story, success, error} = await dbSelectStoryByIndex(pool, lobbyCode, storyIndex));
    // If the retrieval fails, return an error
    if (!success || !story) return {success, error};

    // Return the story and the user index
    return {success: true, data: {story, userIndex}};
};