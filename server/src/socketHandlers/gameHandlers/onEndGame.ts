import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {
    dbDeleteAllStories,
    dbSelectLobby,
    dbTransaction,
    dbUpdateLobbyRound,
    dbUpdateLobbyUserIndexOrder,
    dbUpdateUserLastActive
} from "../../db";
import {broadcastLobbyInfo, sendError} from "../socketService";

// Main function to handle the end of a game
export async function onEndGame(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    // Log the end game request by the user
    console.log("user " + userId + " sent end game request");

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
    // Attempt to end the game
    ({data: lobby, error, success} = await processOp(() =>
        endGame(pool, userId, lobbyCode)
    ));
    // If the end game fails, send an error
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }
    // Broadcast the lobby information to all users
    broadcastLobbyInfo(io, lobby.code, lobby);
    // Log the end of the game
    console.log("game ended in lobby " + lobby.code);
}

// Function to handle the end of the game
const endGame = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    // Start a transaction
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // Get the lobby information
        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        // If the retrieval fails, return an error
        if (!success || !lobby) return {success, error};

        // Check if the user is the host of the lobby
        if (lobby.hostUserId !== userId) {
            return {
                success: false,
                error: {
                    logLevel: LogLevel.Error,
                    type: ErrorType.USER_NOT_HOST,
                    error: "Only the host can end the game"
                }
            };
        }
        // Delete all stories and story elements
        ({success, error} = await dbDeleteAllStories(client, lobbyCode));
        // If the deletion fails, return an error
        if (!success) return {success, error};

        // Reset the lobby round
        ({success, error} = await dbUpdateLobbyRound(client, lobbyCode, 0, null, null))
        // If the reset fails, return an error
        if (!success) return {success, error};
        lobby.round = 0;
        lobby.roundStartAt = null;
        lobby.roundEndAt = null;

        // Reset the user index order
        ({success, error} = await dbUpdateLobbyUserIndexOrder(client, lobbyCode, null));
        // If the reset fails, return an error
        if (!success) return {success, error};
        lobby.userIndexOrder = null;

        // purge all disconnected users that have a different lobby code
        lobby.users = lobby.users.filter(user => user.lobbyCode === lobbyCode);

        // Return the updated lobby
        return {success: true, data: lobby};
    })
};