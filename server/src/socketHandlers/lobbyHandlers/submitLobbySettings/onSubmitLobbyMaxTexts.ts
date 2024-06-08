import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyMaxTexts, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxTexts} from "../../../db";

export const onSubmitLobbyMaxTexts = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxTexts: number)=> {
    console.log("user " + userId + "sent submit lobby max texts");

    const {error, success} = await processOp(() =>
        setLobbyMaxTexts(pool, userId, lobbyCode, maxTexts)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_TEXTS, error);
        return;
    }

    excludedBroadcastLobbyMaxTexts(userId,lobbyCode,maxTexts);
};

export const setLobbyMaxTexts = (pool: Pool, userId: string, lobbyCode: string, maxTexts: number) => {

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

        ({success, error} = await dbUpdateLobbyMaxTexts(client, lobbyCode, maxTexts));
        if (!success) return {success, error};

        return {success: true};
    })

};