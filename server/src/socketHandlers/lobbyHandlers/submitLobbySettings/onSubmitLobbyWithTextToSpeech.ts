import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType , LogLevel, OpResult, processOp, SocketEvent} from "../../../../../shared/sharedTypes";
import {broadcastLobbyWithTextToSpeech, sendError} from "../../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateLobbyWithTextToSpeech} from "../../../db";

export const onSubmitLobbyWithTextToSpeech = async (io: Server, pool: Pool, userId: string, lobbyCode: string, withTextToSpeech: boolean)=> {
    console.log("user " + userId + " sent set lobby settings request");

    const {error, success} = await processOp(() =>
        setLobbyWithTextToSpeech(pool, userId, lobbyCode, withTextToSpeech)
    );

    if (!success) {
        error && sendError(userId, SocketEvent.SUBMIT_LOBBY_WITH_TEXT_TO_SPEECH, error);
        return;
    }

    broadcastLobbyWithTextToSpeech(io, lobbyCode, withTextToSpeech);

    console.log("user " + userId + " has set the lobby settings ");
};

export const setLobbyWithTextToSpeech = (pool: Pool, userId: string, lobbyCode: string, withTextToSpeech: boolean) => {

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

        ({success, error} = await dbUpdateLobbyWithTextToSpeech(client, lobbyCode, withTextToSpeech));
        if (!success) return {success, error};

        return {success: true};
    })

};