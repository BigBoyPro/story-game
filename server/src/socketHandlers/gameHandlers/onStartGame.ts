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

// Main function to handle the start of a game
export async function onStartGame(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string) {
    // Log the start game request by the user
    console.log("user " + userId + " sent start game request");

    // Update the user's last activity
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    // If the update fails, send an error
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let lobby;
    // Attempt to start the game
    ({data: lobby, error, success} = await processOp(() =>
        startGame(pool, userId, lobbyCode)
    ));
    // If the start game fails, send an error
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }
    // Broadcast the lobby information to all users
    broadcastLobbyInfo(io, lobby.code, lobby);
    // Log the start of the game
    console.log("game started in lobby " + lobby.code);

    await onNewRound(io, pool, lobby);
}

// Function to handle the start of the game
const startGame = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    // Start a transaction
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // Get the lobby information
        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        // If the retrieval fails, return an error
        if (!success || !lobby) return {success, error};

        // Check if the user is the host of the lobby
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
    })
};