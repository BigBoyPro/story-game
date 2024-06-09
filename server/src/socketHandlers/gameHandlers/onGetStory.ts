import {Pool} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent, Story} from "../../../../shared/sharedTypes";
import {dbSelectLobby, dbSelectStoryWithIndex, dbUpdateUserLastActive} from "../../db";
import {sendError, sendStory} from "../socketService";
import {isUserInLobby, storyIndexForUser} from "../../utils/utils";

// Main function to handle the retrieval of a story
export async function onGetStory(event: SocketEvent, pool: Pool, userId: string, lobbyCode: string) {
    // Log the get story request by the user
    console.log("user " + userId + " sent get story request");

    // Update the user's last activity
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    // If the update fails, send an error
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let story;
    // Attempt to get the story
    ({data: story, success, error} = await processOp(() =>
        getStory(pool, userId, lobbyCode)
    ));
    // If the retrieval fails, send an error
    if (!success || !story) {
        error && sendError(userId, event, error);
        return;
    }

    // Send the story to the user
    sendStory(userId, story);
    // Log the sending of the story
    console.log("story sent to " + userId);
}

// Function to get a story
const getStory = async (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Story>> => {
    // Get the lobby information
    let {data: lobby, error, success} = await dbSelectLobby(pool, lobbyCode, true);
    // If the retrieval fails, return an error
    if (!success || !lobby) return {success, error};

    // Check if the user is in the lobby
    if (!isUserInLobby(lobby, userId))
        return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };

    // Shuffle the order of users based on the lobby code
    const storyIndex = storyIndexForUser(lobby, userId);
    // Get the story for the user
    return await dbSelectStoryWithIndex(pool, storyIndex, lobbyCode);
}