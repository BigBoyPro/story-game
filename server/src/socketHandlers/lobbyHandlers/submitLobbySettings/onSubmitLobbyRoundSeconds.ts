import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbyRoundSeconds, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyRoundSeconds} from "../../../db";

export const onSubmitLobbyRoundSeconds = async (io: Server, pool: Pool, userId: string, lobbyCode: string, roundSeconds: number)=> {
    console.log("user " + userId + "sent submit lobby round seconds");

    const {error, success} = await processOp(() =>
        setLobbyRoundSeconds(pool, userId, lobbyCode, roundSeconds)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_ROUND_SECONDS, error);
        return;
    }

    excludedBroadcastLobbyRoundSeconds(userId,lobbyCode,roundSeconds);
};

export const setLobbyRoundSeconds = (pool: Pool, userId: string, lobbyCode: string, roundSeconds: number) => {

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

        ({success, error} = await dbUpdateLobbyRoundSeconds(client, lobbyCode, roundSeconds));
        if (!success) return {success, error};

        return {success: true};
    })

};