import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {Lobby, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {
    dbDeleteLobby,
    dbSelectLobby,
    dbTransaction,
    dbUpdateLobbyHost, dbUpdateLobbyUsersSubmittedDecrement,
    dbUpdateUserLastActive,
    dbUpdateUserLobbyCode, dbUpdateUserReady
} from "../../db";
import {broadcastLobbyInfo, isUserConnected, leave, sendError, sendLobbyInfo} from "../socketService";
import {onNewRound} from "../gameHandlers/roundHandler";

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
        broadcastLobbyInfo(io, lobby.code, lobby);
    }
    sendLobbyInfo(userId, null);
    console.log("user " + userId + " left lobby " + lobbyCode);

    // if game is in progress and all users submitted
    if (lobby && lobby.round > 0) {
        const connectedUsersCount = lobby.users.filter(user => isUserConnected(user.id) && user.lobbyCode === lobbyCode).length;
        if (lobby.usersSubmitted >= connectedUsersCount) {
            await onNewRound(io, pool, lobby);
        }
    }

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

        const connectedUser = activeUser && isUserConnected(activeUser.id) && activeUser.lobbyCode === lobbyCode ? activeUser : null;
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
        const user = lobby.users.find(user => user.id === userId);


        if (!connectedUser && lobby.users.length === 1) {
            // remove lobby if user is the last one
            ({success, error} = await dbDeleteLobby(client, lobbyCode))
            if (!success) return {success, error};
            console.log("lobby " + lobbyCode + " removed");
            return {success: true, data: null};
        }

        if (lobby.round !== 0) {
            // if user is in order add disconnected user
            if (user) {
                // if user is in order add disconnected user
                if (lobby.userIndexOrder && lobby.userIndexOrder[userId] !== undefined) {
                    console.log("user " + userId + " is in order");
                    lobby.users = lobby.users.map(u => u.id === userId ? {
                        ...user,
                        nickname: "Disconnected x(",
                        ready: false,
                        lobbyCode: null
                    } : u);
                }
            }
            if (lobby.round > 0) {
                // don't wait for user
                if (user && user.ready) {
                    // update users submitted
                    ({success, error} = await dbUpdateLobbyUsersSubmittedDecrement(client, lobbyCode))
                    if (!success) return {success, error};
                    lobby.usersSubmitted--;

                    // update user ready
                    ({success, error} = await dbUpdateUserReady(client, userId, false))
                    if (!success) return {success, error};
                }
            }
        } else {
            console.log("user " + userId + " is not in order");
            lobby.users = lobby.users.filter(user => user.id !== userId);
        }

        return {success: true, data: lobby};
    });
}