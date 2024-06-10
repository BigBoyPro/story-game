import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyWithTextToSpeech, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyWithTextToSpeech} from "../../../db";

// Main function to handle the submission of text to speech setting in a lobby
export const onSubmitLobbyWithTextToSpeech = async (io: Server, pool: Pool, userId: string, lobbyCode: string, withTextToSpeech: boolean)=> {
    // Log the submit lobby with text to speech request by the user
    console.log("user " + userId + "sent submit lobby with text to speech");

    // Attempt to set the text to speech setting in the lobby
    const {error, success} = await processOp(() =>
        setLobbyWithTextToSpeech(pool, userId, lobbyCode, withTextToSpeech)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_WITH_TEXT_TO_SPEECH, error);
        return;
    }

    // Broadcast the text to speech setting in the lobby to all users except the one who submitted
    excludedBroadcastLobbyWithTextToSpeech(userId,lobbyCode,withTextToSpeech);
};

// Function to set the text to speech setting in a lobby
export const setLobbyWithTextToSpeech = (pool: Pool, userId: string, lobbyCode: string, withTextToSpeech: boolean) => {

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

        // Update the text to speech setting in the lobby
        ({success, error} = await dbUpdateLobbyWithTextToSpeech(client, lobbyCode, withTextToSpeech));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};