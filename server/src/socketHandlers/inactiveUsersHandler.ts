import {Pool, PoolClient} from "pg";
import {
    dbDeleteLobby, dbDeleteUser,
    dbSelectInactiveUsers,
    dbSelectLobby,
    dbSelectUserLobbyCode,
    dbTransaction,
    dbUpdateLobbyHost,
    dbUpdateUserLobbyCode
} from "../db";
import {Lobby, OpResult, processOp} from "../../../shared/sharedTypes";
import {Server} from "socket.io";


export const inactiveUsersHandler = async (io: Server, pool: Pool) => {
    console.log("checking for inactive users");

    const activeLobbiesRes = await processOp(() =>
        inactiveUsersCheck(pool)
    );
    if (!activeLobbiesRes.success) {
        console.error("error checking inactive users: " + activeLobbiesRes.error);
        return;
    }

    const activeLobbies = activeLobbiesRes.data;
    if (Array.isArray(activeLobbies)) {
        for (const lobby of activeLobbies) {
            io.to(lobby.code).emit("lobby info", lobby);
        }
    }
    console.log("inactive users checked");
};


const inactiveUsersCheck = (pool: Pool) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby[]>> => {
        // Get all users who haven't been active for 5 minutes
        console.log("checking for inactive users");
        let {data: shortInactiveUsers, error, success} = await dbSelectInactiveUsers(client, 5 * 60);
        if (!success || !shortInactiveUsers) return {success, error};

        const activeLobbiesMap = new Map<string, Lobby>();

        // Remove each inactive user
        for (const inactiveUser of shortInactiveUsers) {

            let {data: lobbyCode, error, success} = await dbSelectUserLobbyCode(pool, inactiveUser.id);
            if (!success) return {success, error};

            let lobby: (Lobby | null) = null;
            if (lobbyCode) {
                let {data: lobby, error, success} = await dbSelectLobby(pool, lobbyCode, true);
                if (!success || !lobby) return {success, error};
                activeLobbiesMap.set(lobbyCode, lobby);

                const otherUser = lobby.users.find(user => user.id !== inactiveUser.id);
                // if user is host change host
                if (lobby.hostUserId === inactiveUser.id) {
                    if (otherUser) {
                        const updateHostRes = await dbUpdateLobbyHost(client, lobbyCode, otherUser.id);
                        if (!updateHostRes.success) return {success: false, error: updateHostRes.error};

                        lobby.hostUserId = otherUser.id;
                        console.log("host changed to " + otherUser.id);
                    }
                }

                // if game is in progress leave user in lobby
                if (lobby.round != 0) continue;

                // remove user from lobby
                ({success, error} = await dbUpdateUserLobbyCode(client, inactiveUser.id, null))
                if (!success) return {success, error};

                // remove lobby if user is the last one
                if (!otherUser) {
                    ({success, error} = await dbDeleteLobby(client, lobbyCode))
                    if (!success) return {success, error};
                    activeLobbiesMap.delete(lobbyCode);
                }

                lobby.users = lobby.users.filter(user => user.id !== inactiveUser.id);
            }
            // remove user from db
            ({success, error} = await dbDeleteUser(client, inactiveUser.id))
            if (!success) return {success, error};
            console.log("user " + inactiveUser.id + " removed from db");
        }
        return {success: true, data: Array.from(activeLobbiesMap.values())};
    });
}
