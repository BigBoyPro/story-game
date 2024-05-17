import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, processOp} from "../../../../shared/sharedTypes";
import {
    dbSelectLobby, dbSelectUserReady,
    dbTransaction, dbUpdateLobbyUsersSubmittedDecrement,
    dbUpdateUserLastActive, dbUpdateUserReady
} from "../../db";
import {isUserInLobby} from "../../utils/utils";
import {broadcastUsersSubmitted, sendError} from "../socketService";

export async function onUnsubmitStoryElements(io: Server, pool: Pool, userId: string, lobbyCode: string) {
    console.log("user " + userId + " unsubmitted story elements");

    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    if (!success) {
        error && sendError(userId, error);
        return;
    }

    let lobby;
    ({data: lobby, error, success} = await processOp(() =>
        unsubmitStoryElements(pool, userId, lobbyCode)
    ));
    if (!success || !lobby) {
        error && sendError(userId, error);
        return;
    }
    broadcastUsersSubmitted(io, lobbyCode, lobby.usersSubmitted);
    console.log("story elements unsubmitted by " + userId + " in lobby " + lobbyCode)

}

const unsubmitStoryElements = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // get lobby
        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
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
        if (!ready) return {success: false, error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_SUBMITTED, error: "User has not submitted"}};

        ({success, error} = await dbUpdateUserReady(client, userId, false));
        if (!success) return {success, error};

        // update users submitted
        ({success, error} = await dbUpdateLobbyUsersSubmittedDecrement(client, lobbyCode))
        if (!success) return {success, error};
        lobby.usersSubmitted--;
        return {success: true, data: lobby};
    });
}