import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyRoundSeconds, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyRoundSeconds} from "../../../db";

// Main function to handle the submission of round seconds in a lobby
export const onSubmitLobbyRoundSeconds = async (io: Server, pool: Pool, userId: string, lobbyCode: string, roundSeconds: number)=> {
    // Log the submit lobby round seconds request by the user
    console.log("user " + userId + "sent submit lobby round seconds");

    // Attempt to set the round seconds in the lobby
    const {error, success} = await processOp(() =>
        setLobbyRoundSeconds(pool, userId, lobbyCode, roundSeconds)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_ROUND_SECONDS, error);
        return;
    }

    // Broadcast the round seconds in the lobby to all users except the one who submitted
    excludedBroadcastLobbyRoundSeconds(userId,lobbyCode,roundSeconds);
};

// Function to set the round seconds in a lobby
export const setLobbyRoundSeconds = (pool: Pool, userId: string, lobbyCode: string, roundSeconds: number) => {

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

        // Update the round seconds in the lobby
        ({success, error} = await dbUpdateLobbyRoundSeconds(client, lobbyCode, roundSeconds));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};