import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {Lobby, OpResult, processOp, User} from "../../../../shared/sharedTypes";
import {broadcastLobbyInfo, join, sendError} from "../socketService";
import {dbInsertLobby, dbSelectLobbyCount, dbTransaction, dbUpdateUserLobbyCode, dbUpsertUser} from "../../db";

export const onCreateLobby = async (io: Server, pool: Pool, userId: string, nickname: string) => {
    console.log("user " + userId + " sent create lobby request");

    const {data: lobby, error, success} = await processOp(() =>
        createLobby(pool, userId, nickname)
    );

    if (!success || !lobby) {
        error && sendError(userId, error);
        return;
    }
    join(userId, lobby.code);
    broadcastLobbyInfo(io, lobby.code, lobby);

    console.log("user " + userId + " created lobby " + lobby.code);
};

export const createLobby = (pool: Pool, userId: string, nickname: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // upsert user
        const user: User = {id: userId, nickname: nickname, lobbyCode: null};

        let {success, error} = await dbUpsertUser(client, user);
        if (!success) return {success, error};

        // generate unique lobby code
        let lobbyCode;
        ({data: lobbyCode, success, error} = await generateUniqueLobbyCode(pool));
        if (!success || !lobbyCode) return {success, error};

        // insert lobby
        const lobby: Lobby = {
            code: lobbyCode,
            hostUserId: userId,
            users: [],
            round: 0,
            usersSubmitted: 0,
            roundStartAt: null,
            roundEndAt: null,
            currentStoryIndex: null,
            currentUserIndex: null
        };
        ({success, error} = await dbInsertLobby(client, lobby));
        if (!success) return {success, error};

        // join lobby
        ({success, error} = await dbUpdateUserLobbyCode(client, userId, lobbyCode));
        if (!success) return {success, error};

        lobby.users.push(user);

        return {success: true, data: lobby};
    });
}




const generateUniqueLobbyCode = async (pool: Pool): Promise<OpResult<string>> => {
    let unique = false;
    let lobbyCode = '';
    while (!unique) {
        for (let i = 0; i < 5; i++) {
            // Generate a random number between 65 and 90, for ASCII values of A-Z
            const ascii = Math.floor(Math.random() * 26) + 65;
            // Convert the ASCII value to a character and add it to the lobbyCode
            lobbyCode += String.fromCharCode(ascii);
        }
        const {data: lobbyCount, error, success} = await dbSelectLobbyCount(pool, lobbyCode);
        if (!success) return {success, error};
        unique = lobbyCount === 0;
    }
    return {success: true, data: lobbyCode};
}