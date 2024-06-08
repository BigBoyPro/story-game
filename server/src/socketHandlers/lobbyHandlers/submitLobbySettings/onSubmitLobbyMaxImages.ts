import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {broadcastLobbyMaxImages, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyMaxImages} from "../../../db";

export const onSubmitLobbyMaxImages = async (io: Server, pool: Pool, userId: string, lobbyCode: string, maxImages: number)=> {
    console.log("user " + userId + " sent set lobby settings request");

    const {error, success} = await processOp(() =>
        setLobbyMaxImages(pool, userId, lobbyCode, maxImages)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_MAX_IMAGES, error);
        return;
    }

    broadcastLobbyMaxImages(io, lobbyCode, maxImages);

    console.log("user " + userId + " has set the lobby settings ");
};

export const setLobbyMaxImages = (pool: Pool, userId: string, lobbyCode: string, maxImages: number) => {

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

        ({success, error} = await dbUpdateLobbyMaxImages(client, lobbyCode, maxImages));
        if (!success) return {success, error};

        return {success: true};
    })

};