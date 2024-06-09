import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyMaxTexts, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxTexts} from "../../../db";

// Main function to handle the submission of maximum texts in a lobby
export const onSubmitLobbyMaxTexts = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxTexts: number)=> {
    // Log the submit lobby max texts request by the user
    console.log("user " + userId + "sent submit lobby max texts");

    // Attempt to set the maximum texts in the lobby
    const {error, success} = await processOp(() =>
        setLobbyMaxTexts(pool, userId, lobbyCode, maxTexts)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_TEXTS, error);
        return;
    }

    // Broadcast the maximum texts in the lobby to all users except the one who submitted
    excludedBroadcastLobbyMaxTexts(userId,lobbyCode,maxTexts);
};

// Function to set the maximum texts in a lobby
export const setLobbyMaxTexts = (pool: Pool, userId: string, lobbyCode: string, maxTexts: number) => {

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

        // Update the maximum texts in the lobby
        ({success, error} = await dbUpdateLobbyMaxTexts(client, lobbyCode, maxTexts));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};