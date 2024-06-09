import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyRound, dbUpdateUserLastActive} from "../../db";
import {broadcastLobbyInfo, sendError} from "../socketService";

// Main function to handle the start of a game
export async function onStartGame(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    // Log the start game request by the user
    console.log("user " + userId + " sent start game request");

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
    // Attempt to start the game
    ({data: lobby, error, success} = await processOp(() =>
        startGame(pool, userId, lobbyCode)
    ));
    // If the start game fails, send an error
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }
    // Broadcast the lobby information to all users
    broadcastLobbyInfo(io, lobby.code, lobby);
    // Log the start of the game
    console.log("game started in lobby " + lobby.code);
}

// Function to handle the start of the game
const startGame = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
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
                    error: "Only the host can start the game"
                }
            };
        }
        // Update the lobby round to 1
        ({success, error} = await dbUpdateLobbyRound(client, lobbyCode, 1, null, null))
        // If the update fails, return an error
        if (!success) return {success, error};
        lobby.round = 1;

        // Return the updated lobby
        return {success: true, data: lobby};
    })
};