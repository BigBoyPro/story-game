import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {excludedBroadcastLobbySeePrevStoryPart, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbySeePrevStoryPart} from "../../../db";

export const onSubmitLobbySeePrevStoryPart = async (io: Server, pool: Pool, userId: string, lobbyCode: string, seePrevStoryPart: boolean)=> {
    console.log("user " + userId + "sent submit lobby see prev story part");

    const {error, success} = await processOp(() =>
        setLobbySeePrevStoryPart(pool, userId, lobbyCode, seePrevStoryPart)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_SEE_PREV_STORY_PART, error);
        return;
    }

    excludedBroadcastLobbySeePrevStoryPart(userId,lobbyCode,seePrevStoryPart);
};

export const setLobbySeePrevStoryPart = (pool: Pool, userId: string, lobbyCode: string, seePrevStoryPart: boolean) => {

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

        ({success, error} = await dbUpdateLobbySeePrevStoryPart(client, lobbyCode, seePrevStoryPart));
        if (!success) return {success, error};

        return {success: true};
    })

};