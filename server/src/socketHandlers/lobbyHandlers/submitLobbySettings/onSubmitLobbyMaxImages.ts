import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyMaxImages, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxImages} from "../../../db";

// Main function to handle the submission of maximum images in a lobby
export const onSubmitLobbyMaxImages = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxImages: number)=> {
    // Log the submit lobby max images request by the user
    console.log("user " + userId + "sent submit lobby max images");

    // Attempt to set the maximum images in the lobby
    const {error, success} = await processOp(() =>
        setLobbyMaxImages(pool, userId, lobbyCode, maxImages)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_IMAGES, error);
        return;
    }

    // Broadcast the maximum images in the lobby to all users except the one who submitted
    excludedBroadcastLobbyMaxImages(userId,lobbyCode,maxImages);
};

// Function to set the maximum images in a lobby
export const setLobbyMaxImages = (pool: Pool, userId: string, lobbyCode: string, maxImages: number) => {

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

        // Update the maximum images in the lobby
        ({success, error} = await dbUpdateLobbyMaxImages(client, lobbyCode, maxImages));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};