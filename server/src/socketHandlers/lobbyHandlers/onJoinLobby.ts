import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {Lobby, OpResult, processOp} from "../../../../shared/sharedTypes";
import {broadcastLobbyInfo, join, sendError} from "../socketService";
import {dbSelectLobby, dbTransaction, dbUpdateUserLobbyCode, dbUpsertUser} from "../../db";

export const onJoinLobby = async (io: Server, pool: Pool, userId: string, nickname: string, lobbyCode: string) => {
    console.log("user " + userId + "sent join lobby:" + lobbyCode + " request");

    const {data: lobby, error, success} = await processOp(() =>
        joinLobby(pool, userId, nickname, lobbyCode));
    if (!success || !lobby) {
        error && sendError(userId, error);
        return;
    }
    join(userId, lobby.code);
    broadcastLobbyInfo(io, lobby.code, lobby);
    console.log("user " + userId + " joined lobby " + lobby.code);
};


const joinLobby = (pool: Pool, userId: string, nickname: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // get lobby
        let {data: lobby, success, error} = await dbSelectLobby(client, lobbyCode);
        if (!success || !lobby) return {success, error};
        // upsert user
        const user = {id: userId, nickname: nickname, lobbyCode: null};
        ({success, error} = await dbUpsertUser(client, user))
        if (!success) return {success, error};

        // join lobby
        ({success, error} = await dbUpdateUserLobbyCode(client, userId, lobbyCode))
        if (!success) return {success, error};

        lobby.users.push(user);

        return {success: true, data: lobby};
    })
}