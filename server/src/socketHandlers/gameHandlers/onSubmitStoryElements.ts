import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {
    ErrorType,
    Lobby,
    LogLevel,
    OpResult,
    processOp,
    SocketEvent,
    StoryElement
} from "../../../../shared/sharedTypes";
import {
    dbSelectLobby, dbSelectUserReady,
    dbTransaction,
    dbUpdateLobbyUsersSubmittedIncrement,
    dbUpdateUserLastActive, dbUpdateUserReady, dbUpsertleteStoryElements
} from "../../db";
import {isUserInLobby} from "../../utils/utils";
import {excludedBroadcastUsersSubmitted, isUserConnected, sendError, sendSubmitted} from "../socketService";
import {onNewRound} from "./roundHandler";

// Main function to handle the submission of story elements
export async function onSubmitStoryElements(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]) {
    // Log the submit story elements request by the user
    console.log("user " + userId + " sent submit story elements");

    // Update the user's last activity
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    // If the update fails, send an error
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let lobby;
    // Attempt to submit story elements
    ({data: lobby, error, success} = await processOp(() =>
        submitStoryElements(pool, userId, lobbyCode, elements)
    ));
    // If the submission fails, send an error
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }

    // Send the submitted status to the user
    sendSubmitted(userId, true);
    // Broadcast the users submitted to all users except the one who submitted
    excludedBroadcastUsersSubmitted(userId, lobbyCode, lobby.usersSubmitted);
    // Log the submission of story elements
    console.log("story elements sent by " + userId + " in lobby " + lobbyCode)
    // get number of users connected
    const connectedUsersCount =  lobby.users.filter(user => isUserConnected(user.id)).length;
    if (lobby.usersSubmitted >= connectedUsersCount) {
        await onNewRound(io, pool, lobby);
        console.log("***round " + lobby.round + " ended***");

    }
}

// Function to handle the submission of story elements
const submitStoryElements = (pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // Get the lobby information
        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        // If the retrieval fails, return an error
        if (!success || !lobby) return {success, error};

        // Check if the user is in the lobby
        if (!isUserInLobby(lobby, userId)) return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };
        // Check if the user has already submitted
        let ready;
        ({data: ready, success, error} = await dbSelectUserReady(client, userId, true));
        // If the retrieval fails, return an error
        if (!success) return {success, error};
        // If the user has not submitted yet, update the user's ready status and increment the users submitted in the lobby
        if (!ready) {
            ({success, error} = await dbUpdateUserReady(client, userId, true));
            // If the update fails, return an error
            if (!success) return {success, error};

            // Update the users submitted in the lobby
            ({success, error} = await dbUpdateLobbyUsersSubmittedIncrement(client, lobbyCode))
            // If the update fails, return an error
            if (!success) return {success, error};
            lobby.usersSubmitted++;
        }

        // Upsert the story elements to the database
        ({success, error} = await dbUpsertleteStoryElements(client, elements))
        // If the upsert fails, return an error
        if (!success && !(error && error.type === ErrorType.NO_STORY_ELEMENTS_TO_UPSERTLETE)) return {success, error};

        return {success: true, data: lobby};
    });
}