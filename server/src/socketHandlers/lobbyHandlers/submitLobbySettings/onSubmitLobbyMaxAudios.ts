import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {broadcastLobbyMaxAudios, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxAudios} from "../../../db";

export const onSubmitLobbyMaxAudios = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxAudios: number)=> {
    console.log("user " + userId + " sent set lobby settings request");

    const {error, success} = await processOp(() =>
        setLobbyMaxAudios(pool, userId, lobbyCode, maxAudios)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_AUDIOS, error);
        return;
    }

    broadcastLobbyMaxAudios(io, lobbyCode, maxAudios);

    console.log("user " + userId + " has set the lobby settings ");
};

export const setLobbyMaxAudios = (pool: Pool, userId: string, lobbyCode: string, maxAudios: number) => {

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

        ({success, error} = await dbUpdateLobbyMaxAudios(client, lobbyCode, maxAudios));
        if (!success) return {success, error};

        return {success: true};
    })

};