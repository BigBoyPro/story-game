import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {Lobby, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {
    dbDeleteLobby,
    dbSelectLobby,
    dbTransaction,
    dbUpdateLobbyHost,
    dbUpdateUserLastActive,
    dbUpdateUserLobbyCode
} from "../../db";
import {excludedBroadcastLobbyInfo, leave, sendError, sendLobbyInfo} from "../socketService";

export const onLeaveLobby = async (event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) => {
    console.log("user " + userId + " sent leave lobby:" + lobbyCode + " request");

    // update user last active
    let {error, success} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }
    let lobby;
    ({data: lobby, error, success} = await processOp(() =>
        leaveLobby(pool, userId, lobbyCode)
    ))
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    if (lobby) {
        leave(userId, lobby.code);
        excludedBroadcastLobbyInfo(userId, lobby.code, lobby);
    }
    sendLobbyInfo(userId, null);
    console.log("user " + userId + " left lobby " + lobbyCode);
};

const leaveLobby = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby | null>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby | null>> => {
        // get lobby
        let {data: lobby, success, error} = await dbSelectLobby(client, lobbyCode, true);
        if (!success || !lobby) return {success, error};

        let activeUser = null;
        for (const user of lobby.users) {
            if (user.id !== userId) {
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

        // remove user from lobby
        ({success, error} = await dbUpdateUserLobbyCode(client, userId, null))
        if (!success) return {success, error};

        console.log("user " + userId + " removed from lobby " + lobbyCode);
        lobby.users = lobby.users.filter(user => user.id !== userId);

        if (!activeUser) {
            // remove lobby if user is the last one
            ({success, error} = await dbDeleteLobby(client, lobbyCode))
            if (!success) return {success, error};
            console.log("lobby " + lobbyCode + " removed");
            return {success: true, data: null};
        }

        return {success: true, data: lobby};
    });
}