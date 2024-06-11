import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {
    dbSelectLobby, dbSelectUserReady,
    dbTransaction, dbUpdateLobbyUsersSubmittedDecrement,
    dbUpdateUserLastActive, dbUpdateUserReady
} from "../../db";
import {isUserInLobby} from "../../utils/utils";
import {broadcastUsersSubmitted, sendError, sendSubmitted} from "../socketService";

// Main function to handle the unsubmission of story elements
export async function onUnsubmitStoryElements(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    // Log the unsubmit story elements request by the user
    console.log("user " + userId + " unsubmitted story elements");

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
    // Attempt to unsubmit story elements
    ({data: lobby, error, success} = await processOp(() =>
        unsubmitStoryElements(pool, userId, lobbyCode)
    ));
    // If the unsubmission fails, send an error
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }
    // Send the submitted status to the user
    sendSubmitted(userId, false);
    // Broadcast the users submitted to all users except the one who unsubmitted
    broadcastUsersSubmitted(io, lobbyCode, lobby.usersSubmitted);
    // Log the unsubmission of story elements
    console.log("story elements unsubmitted by " + userId + " in lobby " + lobbyCode)

}

// Function to handle the unsubmission of story elements
const unsubmitStoryElements = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
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
        // If the user has submitted, update the user's ready status and decrement the users submitted in the lobby
        if (ready) {
            ({success, error} = await dbUpdateUserReady(client, userId, false));
            // If the update fails, return an error
            if (!success) return {success, error};

            // Update the users submitted in the lobby
            ({success, error} = await dbUpdateLobbyUsersSubmittedDecrement(client, lobbyCode))
            // If the update fails, return an error
            if (!success) return {success, error};
            lobby.usersSubmitted--;
        }
        // Return the updated lobby
        return {success: true, data: lobby};
    });
}