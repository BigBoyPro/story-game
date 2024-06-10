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

const INACTIVE_USER_SECONDS = 60 * 60;

// Main function to handle inactive users
export const inactiveUsersHandler = async (io: Server, pool: Pool) => {
    // Log the check for inactive users
    console.log("checking for inactive users");

    // Attempt to check for inactive users
    const {data: activeLobbies, error, success} = await processOp(() =>
        inactiveUsersCheck(pool)
    );
    // If the check fails, log an error
    if (!success) {
        console.error("error checking inactive users: " + error);
        return;
    }

    // If there are active lobbies, broadcast the lobby information to all users
    if (Array.isArray(activeLobbies)) {
        for (const lobby of activeLobbies) {
            broadcastLobbyInfo(io,lobby.code, lobby);
        }
    }
    // Log the check for inactive users
    console.log("inactive users checked");
};

// Function to check for inactive users
const inactiveUsersCheck = async (pool: Pool) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby[]>> => {
        // Select users who have been inactive for a certain amount of time
        let {data: inactiveUsers, error, success} = await dbSelectUsersInactive(client, INACTIVE_USER_SECONDS);
        // If the selection fails, return an error
        if (!success || !inactiveUsers) return {success, error};

        // Create a set of inactive user IDs
        const inactiveUserIds = new Set<string>();
        for (const user of inactiveUsers) {
            inactiveUserIds.add(user.id);
        }

        // Select lobbies with a host who is an inactive user
        let {data: lobbies, error: lobbiesError, success: lobbiesSuccess} = await dbSelectLobbiesWithHost(client, inactiveUserIds);
        // If the selection fails, return an error
        if (!lobbiesSuccess || !lobbies) return {success: lobbiesSuccess, error: lobbiesError};

        const activeLobbies = [];
        const lobbiesToRemove = [];
        for (const lobby of lobbies) {
            let activeUser = null;
            // Find an active user in the lobby
            for (const user of lobby.users) {
                if (!inactiveUserIds.has(user.id)) {
                    activeUser = user;
                    break;
                }
            }
            // If there is an active user, update the lobby host
            if (activeUser) {
                if(inactiveUserIds.has(lobby.hostUserId)){
                    ({error, success} = await dbUpdateLobbyHost(client, lobby.code, activeUser.id));
                    // If the update fails, return an error
                    if (!success) return {success, error};
                    activeLobbies.push(lobby);
                }
            } else {
                // Otherwise, add the lobby to the list of lobbies to remove
                lobbiesToRemove.push(lobby.code);
            }
        }

        // Log the lobbies to remove
        console.log("lobbies to remove: ",lobbiesToRemove);

        // Delete the lobbies to remove
        ({error, success} = await dbDeleteLobbies(client, lobbiesToRemove));
        // If the deletion fails, return an error
        if (!success) return {success, error};

        // Delete the inactive users
        ({error, success} =  await dbDeleteUsers(client, Array.from(inactiveUserIds)));
        // If the deletion fails, return an error
        if (!success) return {success, error};

        // Return the active lobbies
        return {success: true, data: activeLobbies};
    });
}