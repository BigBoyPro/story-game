import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LobbySettings, LogLevel, OpResult, processOp, User} from "../../../../shared/sharedTypes";
import { broadcastLobbySettings, sendError} from "../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbySettings, dbUpdateUserLobbyCode} from "../../db";

export const onSubmitLobbySettings = async (io: Server, pool: Pool, userId: string, lobbyCode: string, lobbySettings: LobbySettings)=> {
    console.log("user " + userId + " sent set lobby settings request");

    const {error, success} = await processOp(() =>
        setLobbySettings(pool, userId, lobbyCode, lobbySettings)
    );

    if (!success) {
        error && sendError(userId, error);
        return;
    }

    broadcastLobbySettings(io, lobbyCode, lobbySettings);

    console.log("user " + userId + " has set the lobby settings ");
};

export const setLobbySettings = (pool: Pool, userId: string, lobbyCode: string, lobbySettings: LobbySettings) => {

    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<null>> => {

        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        if (!success || !lobby) return {success, error};

        if (lobby.hostUserId !== userId) {
            return {
                success: false,
                error: {
                    logLevel: LogLevel.Error,
                    type: ErrorType.USER_NOT_HOST,
                    error: "Only the host can end the game"
                }
            };
        }

        ({success, error} = await dbUpdateLobbySettings(client, lobbyCode, lobbySettings));
        if (!success) return {success, error};

        return {success: true};
    })

};