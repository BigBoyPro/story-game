import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent, TimerSetting} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyTimerSetting, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyTimerSetting} from "../../../db";

export const onSubmitLobbyTimerSetting = async (io: Server, pool: Pool, userId: string, lobbyCode: string, timerSetting: TimerSetting)=> {
    console.log("user " + userId + "sent submit lobby timer setting");

    const {error, success} = await processOp(() =>
        setLobbyTimerSetting(pool, userId, lobbyCode, timerSetting)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_TIMER_SETTING, error);
        return;
    }

    excludedBroadcastLobbyTimerSetting(userId,lobbyCode,timerSetting);
};

export const setLobbyTimerSetting = (pool: Pool, userId: string, lobbyCode: string, timerSetting: TimerSetting) => {

    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<null>> => {

        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        if (!success || !lobby) return {success, error};

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

        ({success, error} = await dbUpdateLobbyTimerSetting(client, lobbyCode, timerSetting));
        if (!success) return {success, error};

        return {success: true};
    })

};