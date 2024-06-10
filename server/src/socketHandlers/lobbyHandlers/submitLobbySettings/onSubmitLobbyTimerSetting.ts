import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent, TimerSetting} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyTimerSetting, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyTimerSetting} from "../../../db";

// Main function to handle the submission of timer setting in a lobby
export const onSubmitLobbyTimerSetting = async (io: Server, pool: Pool, userId: string, lobbyCode: string, timerSetting: TimerSetting)=> {
    // Log the submit lobby timer setting request by the user
    console.log("user " + userId + "sent submit lobby timer setting");

    // Attempt to set the timer setting in the lobby
    const {error, success} = await processOp(() =>
        setLobbyTimerSetting(pool, userId, lobbyCode, timerSetting)
    );

    // If the setting fails, send an error
    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_TIMER_SETTING, error);
        return;
    }

    // Broadcast the timer setting in the lobby to all users except the one who submitted
    excludedBroadcastLobbyTimerSetting(userId,lobbyCode,timerSetting);
};

// Function to set the timer setting in a lobby
export const setLobbyTimerSetting = (pool: Pool, userId: string, lobbyCode: string, timerSetting: TimerSetting) => {

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

        // Update the timer setting in the lobby
        ({success, error} = await dbUpdateLobbyTimerSetting(client, lobbyCode, timerSetting));
        // If the update fails, return an error
        if (!success) return {success, error};

        // Return success
        return {success: true};
    })

};