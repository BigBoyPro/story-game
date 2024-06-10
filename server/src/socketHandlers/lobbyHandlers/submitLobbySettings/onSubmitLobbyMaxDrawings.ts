import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyMaxDrawings, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxDrawings} from "../../../db";

// Main function to handle the submission of maximum drawings in a lobby
export const onSubmitLobbyMaxDrawings = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxDrawings: number)=> {
    // Log the submit lobby max drawings request by the user
    console.log("user " + userId + "sent submit lobby max drawings");

    // Attempt to set the maximum drawings in the lobby
    const {error, success} = await processOp(() =>
        setLobbySettings(pool, userId, lobbyCode, maxDrawings)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_DRAWINGS, error);
        return;
    }

    // Broadcast the maximum drawings in the lobby to all users except the one who submitted
    excludedBroadcastLobbyMaxDrawings(userId,lobbyCode,maxDrawings);
};

// Function to set the maximum drawings in a lobby
export const setLobbySettings = (pool: Pool, userId: string, lobbyCode: string, maxDrawings: number) => {

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

        // Update the maximum drawings in the lobby
        ({success, error} = await dbUpdateLobbyMaxDrawings(client, lobbyCode, maxDrawings));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};