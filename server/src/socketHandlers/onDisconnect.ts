import {OpResult, processOp, SocketEvent} from "../../../shared/sharedTypes";
import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {
    dbSelectUserLobbyCode,
    dbTransaction,
} from "../db";
import {isUserConnected, sendError} from "./socketService";
import {onLeaveLobby} from "./lobbyHandlers";

const DISCONNECT_TIMEOUT = 10000;

export async function onDisconnect(event: SocketEvent, io: Server, pool: Pool, userId: string) {

    let {data: lobbyCode, error, success} = await processOp(() =>
        disconnect(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }
    if (lobbyCode) {
        // if user is in a lobby wait for him to reconnect and if he doesn't reconnect in 10 seconds remove him from the lobby by calling onLeaveLobby
        console.log("user " + userId + " disconnected from lobby " + lobbyCode);
        setTimeout(async () => {
            console.log("checking if user " + userId + " reconnected");
            if (!isUserConnected(userId)) {
                await onLeaveLobby(event, io, pool, userId, lobbyCode)
            }
        }, DISCONNECT_TIMEOUT);

    }
}

const disconnect = (pool: Pool, userId: string): Promise<OpResult<string|null>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<string|null>> => {
        // get lobby code
        let {data: lobbyCode, error, success} = await dbSelectUserLobbyCode(client, userId);
        if (!success ) return {success, error};
        if(!lobbyCode) return {success: true, data: null};

        return {success: true, data: lobbyCode};
    })
};