import {Pool, PoolClient} from "pg";
import {Lobby, OpResult, processOp, StoryElement, StoryElementType} from "../../../../shared/sharedTypes";
import {Server} from "socket.io";
import {
    dbInsertStoryElements, dbLockRowLobby,
    dbSelectStoryElementDistinctUserIdsForRound,
    dbSelectStoryIdByIndex,
    dbTransaction, dbUpdateLobbyRound, dbUpdateLobbyUsersSubmitted, dbUpdateUsersReady
} from "../../db";

import {storyIndexForUser} from "../../utils/utils";

const ROUND_MILLISECONDS = 5 * 60 * 1000;
const USERS_TIMEOUT_MILLISECONDS = 10 * 1000;

const lobbyTimeouts = new Map<string, NodeJS.Timeout>();

export const onNewRound = async (io : Server, pool: Pool, lobby: Lobby) => {
    const {data: newLobby, error, success} = await processOp(() =>
        newRound(pool, lobby)
    )
    if (!success || !newLobby) {
        console.error("error starting new round");
        return;
    }

    io.to(newLobby.code).emit("lobby info", newLobby);
    if (newLobby.round > 0) waitForRound(io, pool, newLobby);
};

const waitForRound = (io: Server, pool: Pool, lobby: Lobby) => {
    let roundWaitInterval: NodeJS.Timeout | null = null;
    console.log("***waiting for round : " + lobby.round + "***");

    roundWaitInterval = setInterval(async () => {
        // check if round ended
        if (lobby.roundEndAt && Date.now() >= lobby.roundEndAt.getTime()) {
            console.log("***round " + lobby.round + " ended***");
            if (roundWaitInterval) clearInterval(roundWaitInterval);
            roundWaitInterval = null
            // timeout to wait for story elements from all users then start new round
            clearLobbyTimeouts(lobby.code);

            // ask for story elements
            onEndRound(io, pool, lobby);
            console.log("waiting for story elements from all users");
        }
    }, 500);
    clearLobbyTimeouts(lobby.code);
    setLobbyTimeout(lobby.code, roundWaitInterval);
};

const onEndRound = (io : Server, pool: Pool, lobby: Lobby) => {
    io.to(lobby.code).emit("get story elements");
    // set timeout for users to submit story elements
    setLobbyTimeout(lobby.code, setTimeout(async () => {
        await onNewRound(io ,pool, lobby);
    }, USERS_TIMEOUT_MILLISECONDS));
};


const newRound = (pool: Pool, lobby: Lobby) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        console.log("***starting new round***");
        clearLobbyTimeouts(lobby.code);

        console.log("round: " + lobby.round);

        if (lobby.usersSubmitted < lobby.users.length && lobby.round > 0) {
            // push an empty story element for each user who hasn't submitted
            const {data: submittedUserIds, error, success} = await dbSelectStoryElementDistinctUserIdsForRound(client, lobby.code, lobby.round);
            if (!success || !submittedUserIds) return {success: false, error: error};


            const storyElements: StoryElement[] = [];
            for (const user of lobby.users) {
                if (!submittedUserIds.includes(user.id)) {
                    console.log("user " + user.id + " has not submitted");
                    const storyIndex = storyIndexForUser(lobby, user.id);

                    const {data: storyId, error, success} = await dbSelectStoryIdByIndex(client, lobby.code, storyIndex);
                    if (!success || !storyId) return {success, error};

                    const emptyStoryElement: StoryElement = {
                        index: storyIndex,
                        userId: user.id,
                        storyId: storyId,
                        round: lobby.round,
                        type: StoryElementType.Empty,
                        content: ""
                    };
                    storyElements.push(emptyStoryElement);
                }
            }
            if (storyElements.length > 0) {
                const {error, success} = await dbInsertStoryElements(client, storyElements);
                if (!success) return {success, error};
            }
        }
        // proceed to the next round
        let newLobbyRound = lobby.round + 1;
        // set round start time now + 2 seconds for the users to receive the lobby info before the round starts
        const shiftedNow = Date.now() + 2 * 1000;
        let roundStartTime: (Date | null) = new Date(shiftedNow);
        let roundEndTime: (Date | null) = new Date(shiftedNow + ROUND_MILLISECONDS);

        if (newLobbyRound > lobby.users.length) {
            newLobbyRound = -1;
            roundStartTime = null;
            roundEndTime = null;
        }

        //lock the lobby row
        let {error, success} = await dbLockRowLobby(client, lobby.code);
        if (!success) return {success, error};

        ({error, success} = await dbUpdateLobbyUsersSubmitted(client, lobby.code, 0));
        if (!success) return {success, error};
        lobby.usersSubmitted = 0;
        console.log("users submitted reset to 0");

        // unready all players
        const userIds = lobby.users.map(user => user.id);
        ({error, success} = await dbUpdateUsersReady(client, userIds, false));


        ({error, success} = await dbUpdateLobbyRound(client, lobby.code, newLobbyRound, roundStartTime, roundEndTime));
        if (!success) return {success, error};

        lobby.round = newLobbyRound;
        lobby.roundStartAt = roundStartTime;
        lobby.roundEndAt = roundEndTime;

        return {success: true, data: lobby};
    });
};

export const onRestartRound = async (io: Server, pool: Pool, lobby: Lobby) => {
    const {data: newLobby, error, success} = await processOp(() =>
        restartRound(pool, lobby)
    )
    if (!success || !newLobby) {
        console.error("error restarting round");
        return;
    }

    io.to(newLobby.code).emit("lobby info", newLobby);
    waitForRound(io, pool, newLobby);
}

const restartRound = (pool: Pool, lobby: Lobby) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        console.log("***restarting round***");
        clearLobbyTimeouts(lobby.code);

        console.log("round: " + lobby.round);

        let {data: submittedUserIds, error, success} = await dbSelectStoryElementDistinctUserIdsForRound(client, lobby.code, lobby.round);
        if (!success || !submittedUserIds) return {success: false, error};

        // set round start time now + 2 seconds for the users to receive the lobby info before the round starts
        const shiftedNow = Date.now() + 2 * 1000;
        let roundStartTime: (Date | null) = new Date(shiftedNow);
        let roundEndTime: (Date | null) = new Date(shiftedNow + ROUND_MILLISECONDS);

        //lock the lobby row
        ({error, success} = await dbLockRowLobby(client, lobby.code));
        if (!success) return {success, error};


        ({error, success} = await dbUpdateLobbyRound(client, lobby.code, lobby.round, roundStartTime, roundEndTime));
        if (!success) return {success, error};

        lobby.roundStartAt = roundStartTime;
        lobby.roundEndAt = roundEndTime;

        return {success: true, data: lobby};
    });
}

export const setLobbyTimeout = (lobbyCode: string, timeout: NodeJS.Timeout) => {
    lobbyTimeouts.set(lobbyCode, timeout);
}

const clearLobbyTimeouts = (lobbyCode: string) => {
    if (lobbyTimeouts.has(lobbyCode)) {
        clearTimeout(lobbyTimeouts.get(lobbyCode));
        clearInterval(lobbyTimeouts.get(lobbyCode));
        lobbyTimeouts.delete(lobbyCode);
    }
};
