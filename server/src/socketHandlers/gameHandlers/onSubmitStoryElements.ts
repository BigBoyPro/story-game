import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {
    ErrorType,
    Lobby,
    LogLevel,
    OpResult,
    processOp,
    SocketEvent,
    StoryElement
} from "../../../../shared/sharedTypes";
import {
    dbSelectLobby, dbSelectUserReady,
    dbTransaction,
    dbUpdateLobbyUsersSubmittedIncrement,
    dbUpdateUserLastActive, dbUpdateUserReady, dbUpsertleteStoryElements
} from "../../db";
import {isUserInLobby} from "../../utils/utils";
import {excludedBroadcastUsersSubmitted, isUserConnected, sendError, sendSubmitted} from "../socketService";
import {onNewRound} from "./roundHandler";


export async function onSubmitStoryElements(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]) {
    console.log("user " + userId + " sent submit story elements");

    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let lobby;
    ({data: lobby, error, success} = await processOp(() =>
        submitStoryElements(pool, userId, lobbyCode, elements)
    ));
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }

    sendSubmitted(userId, true);
    excludedBroadcastUsersSubmitted(userId, lobbyCode, lobby.usersSubmitted);
    console.log("story elements sent by " + userId + " in lobby " + lobbyCode)
    // get number of users connected
    const connectedUsersCount =  lobby.users.filter(user => isUserConnected(user.id)).length;
    if (lobby.usersSubmitted >= connectedUsersCount) {
        await onNewRound(io, pool, lobby);
        console.log("***round " + lobby.round + " ended***");

    }
}

const submitStoryElements = (pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // get lobby
        let {data: lobby, success, error} = await dbSelectLobby(client, lobbyCode, true);
        if (!success || !lobby) return {success, error};
        // check if user is in lobby
        if (!isUserInLobby(lobby, userId)) return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };
        //check if our user has already submitted
        let ready;
        ({data: ready, success, error} = await dbSelectUserReady(client, userId, true));
        if (!success) return {success, error};
        if (!ready) {
            ({success, error} = await dbUpdateUserReady(client, userId, true));
            if (!success) return {success, error};


            // update users submitted
            ({success, error} = await dbUpdateLobbyUsersSubmittedIncrement(client, lobbyCode))
            if (!success) return {success, error};
            lobby.usersSubmitted++;
        }

        // upsert story elements to db
        ({success, error} = await dbUpsertleteStoryElements(client, elements))
        if (!success && !(error && error.type === ErrorType.NO_STORY_ELEMENTS_TO_UPSERTLETE)) return {success, error};

        return {success: true, data: lobby};
    });
}