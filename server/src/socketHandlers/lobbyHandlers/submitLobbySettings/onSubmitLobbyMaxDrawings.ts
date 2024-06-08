import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyMaxDrawings, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxDrawings} from "../../../db";

export const onSubmitLobbyMaxDrawings = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxDrawings: number)=> {
    console.log("user " + userId + "sent submit lobby max drawings");

    const {error, success} = await processOp(() =>
        setLobbySettings(pool, userId, lobbyCode, maxDrawings)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_DRAWINGS, error);
        return;
    }

    excludedBroadcastLobbyMaxDrawings(userId,lobbyCode,maxDrawings);
};

export const setLobbySettings = (pool: Pool, userId: string, lobbyCode: string, maxDrawings: number) => {

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

        ({success, error} = await dbUpdateLobbyMaxDrawings(client, lobbyCode, maxDrawings));
        if (!success) return {success, error};

        return {success: true};
    })

};