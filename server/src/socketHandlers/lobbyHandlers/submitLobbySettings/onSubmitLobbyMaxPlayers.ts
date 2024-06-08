import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {broadcastLobbyMaxPlayers, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxPlayers} from "../../../db";

export const onSubmitLobbyMaxPlayers = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxPlayers: number)=> {
    console.log("user " + userId + " sent set lobby settings request");

    const {error, success} = await processOp(() =>
        setLobbyMaxPlayers(pool, userId, lobbyCode, maxPlayers)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_PLAYERS, error);
        return;
    }

    broadcastLobbyMaxPlayers(io, lobbyCode, maxPlayers);

    console.log("user " + userId + " has set the lobby settings ");
};

export const setLobbyMaxPlayers = (pool: Pool, userId: string, lobbyCode: string, maxPlayers: number) => {

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

        ({success, error} = await dbUpdateLobbyMaxPlayers(client, lobbyCode, maxPlayers));
        if (!success) return {success, error};

        return {success: true};
    })

};