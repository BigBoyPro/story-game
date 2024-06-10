import {Pool} from "pg";
import {Lobby, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {join, sendError, sendLobbyInfo} from "../socketService";
import {dbSelectLobby, dbSelectUserLobbyCode} from "../../db";

export const onGetLobby = async (event: SocketEvent, pool: Pool, userId: string) => {
    console.log("user " + userId + " sent get lobby request");

    const {data: lobby, error, success} = await processOp(() =>
        getLobbyForUser(pool, userId)
    );
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    if (lobby) {
        join(userId, lobby.code);
        sendLobbyInfo(userId, lobby);
        console.log("lobby info sent to " + userId);
    }
};

const getLobbyForUser = async (pool: Pool, userId: string): Promise<OpResult<Lobby | null>> => {
    // get user lobby
    const lobbyCodeRes = await dbSelectUserLobbyCode(pool, userId);
    if (!lobbyCodeRes.success) return {success: false, error: lobbyCodeRes.error};
    const lobbyCode = lobbyCodeRes.data;

    if (!lobbyCode) {
        return {success: true, data: null};
    }
    return await dbSelectLobby(pool, lobbyCode);
};