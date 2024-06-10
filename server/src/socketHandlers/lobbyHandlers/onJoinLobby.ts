import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp, SocketEvent, User} from "../../../../shared/sharedTypes";
import {broadcastLobbyInfo, join, sendError} from "../socketService";
import {
    dbSelectLobby,
    dbSelectUserLobbyCode,
    dbTransaction,
    dbUpdateUserLobbyCode,
    dbUpsertUser
} from "../../db";

export const onJoinLobby = async (event: SocketEvent, io: Server, pool: Pool, userId: string, nickname: string, lobbyCode: string) => {
    console.log("user " + userId + "sent join lobby:" + lobbyCode + " request");

    const {data: lobby, error, success} = await processOp(() =>
        joinLobby(pool, userId, nickname, lobbyCode));
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }
    join(userId, lobby.code);
    broadcastLobbyInfo(io, lobby.code, lobby);
    console.log("user " + userId + " joined lobby " + lobby.code);
};


const joinLobby = (pool: Pool, userId: string, nickname: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // check if user is already in a lobby
        let {data: userLobbyCode, success, error} = await dbSelectUserLobbyCode(client, userId);
        if(!success && !(error && error.type === ErrorType.USER_NOT_FOUND)) return {success, error};
        if (userLobbyCode) {
            return {success: false, error: {type: ErrorType.USER_ALREADY_IN_LOBBY, logLevel: LogLevel.Error, error: "User is already in a lobby"}};
        }

        // get lobby
        let lobby;
        ({data: lobby, success, error} = await dbSelectLobby(client, lobbyCode, true));
        if (!success || !lobby) {
            if(error && error.type === ErrorType.LOBBY_NOT_FOUND) {
                error.logLevel = LogLevel.Warning;
            }
            return {success, error};
        }

        //if lobby is already playing
        if (lobby.round !== 0) {
            return {success: false, error: {type: ErrorType.LOBBY_ALREADY_PLAYING, logLevel: LogLevel.Warning, error: "Lobby is already playing"}}
        }
        // upsert user
        const user : User = {id: userId, nickname: nickname, lobbyCode: null, ready: false, connected: true};
        ({success, error} = await dbUpsertUser(client, user, true))
        if (!success) return {success, error};

        // join lobby
        ({success, error} = await dbUpdateUserLobbyCode(client, userId, lobbyCode))
        if (!success) return {success, error};
        lobby.users.push(user);


        return {success: true, data: lobby};
    })
}