import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbySeePrevStoryPart, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbySeePrevStoryPart} from "../../../db";

// Main function to handle the submission of see previous story part setting in a lobby
export const onSubmitLobbySeePrevStoryPart = async (io: Server, pool: Pool, userId: string, lobbyCode: string, seePrevStoryPart: boolean)=> {
    // Log the submit lobby see previous story part request by the user
    console.log("user " + userId + "sent submit lobby see previous story part");

    // Attempt to set the see previous story part setting in the lobby
    const {error, success} = await processOp(() =>
        setLobbySeePrevStoryPart(pool, userId, lobbyCode, seePrevStoryPart)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_SEE_PREV_STORY_PART, error);
        return;
    }

    // Broadcast the see previous story part setting in the lobby to all users except the one who submitted
    excludedBroadcastLobbySeePrevStoryPart(userId,lobbyCode,seePrevStoryPart);
};

// Function to set the see previous story part setting in a lobby
export const setLobbySeePrevStoryPart = (pool: Pool, userId: string, lobbyCode: string, seePrevStoryPart: boolean) => {

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

        // Update the see previous story part setting in the lobby
        ({success, error} = await dbUpdateLobbySeePrevStoryPart(client, lobbyCode, seePrevStoryPart));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};