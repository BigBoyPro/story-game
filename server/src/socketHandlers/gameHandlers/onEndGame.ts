import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {dbDeleteAllStories, dbSelectLobby, dbTransaction, dbUpdateLobbyRound, dbUpdateUserLastActive} from "../../db";
import {broadcastLobbyInfo, sendError} from "../socketService";

export async function onEndGame(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    console.log("user " + userId + " sent end game request");
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let lobby;
    ({data: lobby, error, success} = await processOp(() =>
        endGame(pool, userId, lobbyCode)
    ));
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }
    broadcastLobbyInfo(io, lobby.code, lobby);
    console.log("game ended in lobby " + lobby.code);
}

const endGame = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // get lobby
        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        if (!success || !lobby) return {success, error};

        // check if user is the host
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
        // remove all stories and story elements
        ({success, error} = await dbDeleteAllStories(client, lobbyCode));
        if (!success) return {success, error};

        // reset lobby round
        ({success, error} = await dbUpdateLobbyRound(client, lobbyCode, 0, null, null))
        if (!success) return {success, error};
        lobby.round = 0;
        lobby.roundStartAt = null;
        lobby.roundEndAt = null;

        return {success: true, data: lobby};
    })
};