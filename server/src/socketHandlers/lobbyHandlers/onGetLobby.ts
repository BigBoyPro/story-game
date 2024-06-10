import {Pool} from "pg";
import {Lobby, OpResult, processOp, SocketEvent} from "../../../../shared/sharedTypes";
import {join, sendError, sendLobbyInfo} from "../socketService";
import {dbSelectLobby, dbSelectUserLobbyCode, dbUpdateUserConnected} from "../../db";

export const onGetLobby = async (event: SocketEvent, pool: Pool, userId: string) => {
    console.log("user " + userId + " sent get lobby request");

    const {data: lobby, error, success} = await processOp(() =>
        getLobby(pool, userId)
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

const getLobby = async (pool: Pool, userId: string): Promise<OpResult<Lobby | null>> => {
    // get user lobby
    let {data: lobbyCode, error, success} = await dbSelectUserLobbyCode(pool, userId);
    if (!success) return {success, error};

    ({success, error} = await dbUpdateUserConnected(pool, userId, true));
    if (!success) return {success, error};

    if (!lobbyCode) {
        return {success: true, data: null};
    }
    return await dbSelectLobby(pool, lobbyCode);
};