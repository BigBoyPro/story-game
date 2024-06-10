import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp, SocketEvent, Story} from "../../../../shared/sharedTypes";
import {
    dbInsertStory,
    dbSelectLobby,
    dbTransaction,
    dbUpdateLobbyRoundsCount,
    dbUpdateLobbyUserIndexOrder,
    dbUpdateUserLastActive
} from "../../db";
import {broadcastLobbyInfo, sendError} from "../socketService";
import {onNewRound} from "./roundHandler";


export async function onStartGame(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    console.log("user " + userId + " sent start game request");
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }
    let lobby;
    ({data: lobby, success, error} = await processOp(() =>
        startGame(pool, userId, lobbyCode)
    ));
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }

    broadcastLobbyInfo(io, lobbyCode, lobby);
    console.log("started game in lobby " + lobbyCode);

    await onNewRound(io, pool, lobby);
}


const startGame = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
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
                    error: "Only the host can start the game"
                }
            };
        }

        // check if lobby is already started
        if (lobby.round !== 0) {
            return {
                success: false,
                error: {
                    logLevel: LogLevel.Error,
                    type: ErrorType.GAME_ALREADY_STARTED,
                    error: "Game is already started"
                }
            };
        }

        // update rounds count
        ({success, error} = await dbUpdateLobbyRoundsCount(client, lobbyCode, lobby.users.length));
        if (!success) return {success, error};

        // update user index order
        const userIndexOrder : {[key: string]: number} = {};
        for (let i = 0; i < lobby.users.length; i++) {
            userIndexOrder[lobby.users[i].id] = i;
        }
        ({success, error} = await dbUpdateLobbyUserIndexOrder(client, lobbyCode, userIndexOrder));


        // create all stories
        const users = lobby.users;
        const storyNames = ["Once upon a time", "In a galaxy far far away", "A long time ago in a land of magic", "In a world of mystery", "In a land of dragons", "In a kingdom of knights"];
        for (let i = 0; i < users.length; i++) {
            const storyName = storyNames[i % storyNames.length];
            const story: Story = {
                id: -1,
                index: i,
                lobbyCode: lobbyCode,
                name: storyName,
                elements: []
            };
            ({success, error} = await dbInsertStory(client, story))
            if (!success) return {success, error};
        }
        return {success: true, data: lobby};
    });

}