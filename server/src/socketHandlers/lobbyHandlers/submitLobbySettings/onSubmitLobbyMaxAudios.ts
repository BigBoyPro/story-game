import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyMaxAudios, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxAudios} from "../../../db";

// Main function to handle the submission of maximum audios in a lobby
export const onSubmitLobbyMaxAudios = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxAudios: number)=> {
    // Log the submit lobby max audios request by the user
    console.log("user " + userId + "sent submit lobby max audios");

    // Attempt to set the maximum audios in the lobby
    const {error, success} = await processOp(() =>
        setLobbyMaxAudios(pool, userId, lobbyCode, maxAudios)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_AUDIOS, error);
        return;
    }

    // Broadcast the maximum audios in the lobby to all users except the one who submitted
    excludedBroadcastLobbyMaxAudios(userId,lobbyCode,maxAudios);

};

// Function to set the maximum audios in a lobby
export const setLobbyMaxAudios = (pool: Pool, userId: string, lobbyCode: string, maxAudios: number) => {

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

        // Update the maximum audios in the lobby
        ({success, error} = await dbUpdateLobbyMaxAudios(client, lobbyCode, maxAudios));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};