import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyMaxPlayers, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxPlayers} from "../../../db";

// Main function to handle the submission of maximum players in a lobby
export const onSubmitLobbyMaxPlayers = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxPlayers: number)=> {
    // Log the submit lobby max players request by the user
    console.log("user " + userId + "sent submit lobby max players");

    // Attempt to set the maximum players in the lobby
    const {error, success} = await processOp(() =>
        setLobbyMaxPlayers(pool, userId, lobbyCode, maxPlayers)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_PLAYERS, error);
        return;
    }

    // Broadcast the maximum players in the lobby to all users except the one who submitted
    excludedBroadcastLobbyMaxPlayers(userId,lobbyCode,maxPlayers);
};

// Function to set the maximum players in a lobby
export const setLobbyMaxPlayers = (pool: Pool, userId: string, lobbyCode: string, maxPlayers: number) => {

    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<null>> => {

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
                    error: "Only the host can change this setting"
                }
            };
        }

        // Update the maximum players in the lobby
        ({success, error} = await dbUpdateLobbyMaxPlayers(client, lobbyCode, maxPlayers));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};