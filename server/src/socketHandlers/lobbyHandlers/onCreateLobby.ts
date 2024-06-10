import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {
    DEFAULT_LOBBY_SETTINGS,
    ErrorType,
    Lobby,
    LogLevel,
    OpResult,
    processOp,
    SocketEvent,
    User
} from "../../../../shared/sharedTypes";
import {broadcastLobbyInfo, join, sendError} from "../socketService";
import {
    dbInsertLobby,
    dbSelectLobbyCount, dbSelectUserLobbyCode,
    dbTransaction,
    dbUpdateUserLobbyCode,
    dbUpsertUser
} from "../../db";

export const onCreateLobby = async (event: SocketEvent ,io: Server, pool: Pool, userId: string, nickname: string) => {
    console.log("user " + userId + " sent create lobby request");

    const {data: lobby, error, success} = await processOp(() =>
        createLobby(pool, userId, nickname)
    );

    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }
    join(userId, lobby.code);
    broadcastLobbyInfo(io, lobby.code, lobby);

    console.log("user " + userId + " created lobby " + lobby.code);
};

export const createLobby = (pool: Pool, userId: string, nickname: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // check if user is already in a lobby
        let {data: userLobbyCode, success, error} = await dbSelectUserLobbyCode(client, userId);
        if(!success && !(error && error.type === ErrorType.USER_NOT_FOUND)) return {success, error};
        if (userLobbyCode) {
            return {success: false, error: {type: ErrorType.USER_ALREADY_IN_LOBBY, logLevel: LogLevel.Error, error: "User is already in a lobby"}};
        }

        // upsert user
        const user: User = {id: userId, nickname: nickname, lobbyCode: null, ready: false, connected: true};

        ({success, error} = await dbUpsertUser(client, user, true))
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
            roundsCount: 1,
            usersSubmitted: 0,
            userIndexOrder: null,
            roundStartAt: null,
            roundEndAt: null,
            currentStoryIndex: null,
            currentUserIndex: null,
            //
            lobbySettings: DEFAULT_LOBBY_SETTINGS
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