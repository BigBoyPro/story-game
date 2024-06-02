import {Pool, PoolClient} from "pg";
import {
    dbDeleteLobbies, dbDeleteUsers,
    dbSelectUsersInactive,
    dbTransaction,
    dbUpdateLobbyHost, dbSelectLobbiesWithHost,
} from "../db";
import {Lobby, OpResult, processOp} from "../../../shared/sharedTypes";
import {Server} from "socket.io";
import {broadcastLobbyInfo} from "./socketService";

const INACTIVE_USER_SECONDS = 15 * 60 * 60;

export const inactiveUsersHandler = async (io: Server, pool: Pool) => {
    console.log("checking for inactive users");

    const {data: activeLobbies, error, success} = await processOp(() =>
        inactiveUsersCheck(pool)
    );
    if (!success) {
        console.error("error checking inactive users: " + error);
        return;
    }

    if (Array.isArray(activeLobbies)) {
        for (const lobby of activeLobbies) {
            broadcastLobbyInfo(io,lobby.code, lobby);
        }
    }
    console.log("inactive users checked");
};

const inactiveUsersCheck = async (pool: Pool) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby[]>> => {
        let {data: inactiveUsers, error, success} = await dbSelectUsersInactive(client, INACTIVE_USER_SECONDS);
        if (!success || !inactiveUsers) return {success, error};

        const inactiveUserIds = new Set<string>();

        for (const user of inactiveUsers) {
            inactiveUserIds.add(user.id);
        }


        let {data: lobbies, error: lobbiesError, success: lobbiesSuccess} = await dbSelectLobbiesWithHost(client, inactiveUserIds);
        if (!lobbiesSuccess || !lobbies) return {success: lobbiesSuccess, error: lobbiesError};

        const activeLobbies = [];
        const lobbiesToRemove = [];
        for (const lobby of lobbies) {
            let activeUser = null;
            for (const user of lobby.users) {
                if (!inactiveUserIds.has(user.id)) {
                    activeUser = user;
                    break;
                }
            }
            if (activeUser) {
                if(inactiveUserIds.has(lobby.hostUserId)){
                    ({error, success} = await dbUpdateLobbyHost(client, lobby.code, activeUser.id));
                    if (!success) return {success, error};
                    activeLobbies.push(lobby);
                }
            } else {
                lobbiesToRemove.push(lobby.code);
            }
        }

        console.log("lobbies to remove: ",lobbiesToRemove);

        ({error, success} = await dbDeleteLobbies(client, lobbiesToRemove));
        if (!success) return {success, error};

        ({error, success} =  await dbDeleteUsers(client, Array.from(inactiveUserIds)));
        if (!success) return {success, error};

        return {success: true, data: activeLobbies};
    });
}