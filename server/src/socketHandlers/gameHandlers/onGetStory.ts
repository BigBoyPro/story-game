import {Pool} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent, Story} from "../../../../shared/sharedTypes";
import {dbSelectLobby, dbSelectStoryWithIndex, dbUpdateUserLastActive} from "../../db";
import {sendError, sendStory} from "../socketService";
import {isUserInLobby, storyIndexForUser} from "../../utils/utils";

export async function onGetStory(event: SocketEvent, pool: Pool, userId: string, lobbyCode: string) {
    console.log("user " + userId + " sent get story request");

    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let story;
    ({data: story, success, error} = await processOp(() =>
        getStory(pool, userId, lobbyCode)
    ));
    if (!success || !story) {
        error && sendError(userId, event, error);
        return;
    }

    sendStory(userId, story);
    console.log("story sent to " + userId);
}

const getStory = async (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Story>> => {
    let {data: lobby, error, success} = await dbSelectLobby(pool, lobbyCode, true);
    if (!success || !lobby) return {success, error};

    // check if user is in lobby
    if (!isUserInLobby(lobby, userId))
        return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };


    // shuffle the user order based on the lobby code
    const storyIndex = storyIndexForUser(lobby, userId);
    // get the story for the user
    return await dbSelectStoryWithIndex(pool, storyIndex, lobbyCode);
}

