import {Lobby, OpResult, processOp, SocketEvent} from "../../../shared/sharedTypes";
import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {
    dbSelectLobby,
    dbSelectUserLobbyCode,
    dbTransaction, dbUpdateLobbyHost,
} from "../db";
import {broadcastLobbyInfo, isUserConnected, sendError} from "./socketService";

export async function onDisconnect(event: SocketEvent, io: Server, pool: Pool, userId: string) {

    let {data: lobby, error, success} = await processOp(() =>
        disconnect(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }
    if (lobby) {
        broadcastLobbyInfo(io, lobby.code, lobby);
    }
}

const disconnect = (pool: Pool, userId: string): Promise<OpResult<Lobby|null>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby|null>> => {
        // get lobby code
        let {data: lobbyCode, error, success} = await dbSelectUserLobbyCode(client, userId);
        if (!success ) return {success, error};
        if(!lobbyCode) return {success: true, data: null};

        // get lobby
        let lobby;
        ({data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true));
        if (!success || !lobby) return {success, error};

        let activeUser = null;
        for (const user of lobby.users) {
            if (user.id !== userId && isUserConnected(user.id)) {
                activeUser = user;
                break;
            }
        }
        // if user is host change host
        if (lobby.hostUserId === userId) {
            if (activeUser) {
                ({success, error} = await dbUpdateLobbyHost(client, lobbyCode, activeUser.id))
                if (!success) return {success, error};
                lobby.hostUserId = activeUser.id;

                console.log("host changed to " + activeUser.id);
            }
        }

        return {success: true, data: lobby};
    })
};