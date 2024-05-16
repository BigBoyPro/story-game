import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp, StoryElement} from "../../../../shared/sharedTypes";
import {
    dbInsertStoryElements,
    dbSelectLobby,
    dbTransaction,
    dbUpdateLobbyUsersSubmittedIncrement,
    dbUpdateUserLastActive
} from "../../db";
import {isUserInLobby} from "../../utils/utils";
import {broadcastUsersSubmitted, sendError} from "../socketService";
import {onNewRound} from "./roundHandler";


export async function onStoryElements(io: Server, pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]) {
    console.log("user " + userId + " sent story elements");

    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, error);
        return;
    }

    let lobby;
    ({data: lobby, error, success} = await processOp(() =>
        submitStoryElements(pool, userId, lobbyCode, elements)
    ));
    if (!success || !lobby) {
        error && sendError(userId, error);
        return;
    }

    broadcastUsersSubmitted(io, lobbyCode, lobby.usersSubmitted);
    console.log("story elements sent by " + userId + " in lobby " + lobbyCode)

    if (lobby.usersSubmitted >= lobby.users.length) {
        await onNewRound(io, pool, lobby);
    }
}

const submitStoryElements = (pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {

        // get lobby
        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        if (!success || !lobby) return {success, error};

        // check if user is in lobby
        if (!isUserInLobby(lobby, userId)) return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };

        // insert story elements to db
        ({success, error} = await dbInsertStoryElements(client, elements))
        if (!success) return {success, error};


        // check if all users have submitted their story elements
        let newLobby: Lobby = lobby;
        // update users submitted
        ({success, error} = await dbUpdateLobbyUsersSubmittedIncrement(client, lobbyCode))
        if (!success) return {success, error};
        newLobby.usersSubmitted++;
        const allUsersSubmitted = newLobby.usersSubmitted >= newLobby.users.length;
        if (allUsersSubmitted) {
            console.log("***round " + lobby.round + " ended***");
        }
        return {success: true, data: newLobby};
    });
}