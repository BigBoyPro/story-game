import {Pool, PoolClient} from "pg";
import {Lobby, OpResult, processOp, StoryElement, StoryElementType} from "../../../../shared/sharedTypes";
import {Server} from "socket.io";
import {
    dbInsertStoryElements,
    dbSelectLobby,
    dbSelectStoryElementDistinctUserIdsForRound,
    dbSelectStoryIdByIndex,
    dbTransaction, dbUpdateLobbyRound, dbUpdateLobbyUsersSubmitted
} from "../../db";

import {storyIndexForUser} from "../../utils/utils";

const ROUND_MILLISECONDS = 5 * 60 * 1000;
const USERS_TIMEOUT_MILLISECONDS = 10 * 1000;

const lobbyTimeouts = new Map<string, NodeJS.Timeout>();

export const onNewRound = async (io : Server, pool: Pool, lobbyCode: string) => {
    const lobbyRes = await processOp(() =>
        newRound(pool, lobbyCode)
    )
    if (!lobbyRes.success || !lobbyRes.data) {
        console.error("error starting new round: " + lobbyRes.error);
        return;
    }
    const lobby = lobbyRes.data;

    io.to(lobby.code).emit("lobby info", lobby);
    if (lobby.round > 0) waitForRound(io, pool, lobby);
};

const waitForRound = (io: Server, pool: Pool, lobby: Lobby) => {
    let roundTimer: NodeJS.Timeout | null = null;
    console.log("***waiting for round : " + lobby.round + "***");

    roundTimer = setInterval(async () => {
        // check if round ended
        if (lobby.roundEndAt && Date.now() >= lobby.roundEndAt.getTime()) {
            console.log("***round " + lobby.round + " ended***");
            if (roundTimer) clearInterval(roundTimer);
            roundTimer = null
            // timeout to wait for story elements from all users then start new round
            clearLobbyTimeouts(lobby.code);

            // ask for story elements
            onEndRound(io, pool, lobby);
            console.log("waiting for story elements from all users");
        }
    }, 500);
    clearLobbyTimeouts(lobby.code);
    setLobbyTimeout(lobby.code, roundTimer);
};

const onEndRound = (io : Server, pool: Pool, lobby: Lobby) => {
    io.to(lobby.code).emit("get story elements");
    // set timeout for users to submit story elements
    setLobbyTimeout(lobby.code, setTimeout(async () => {
        await onNewRound(io ,pool, lobby.code);
    }, USERS_TIMEOUT_MILLISECONDS));
};



const newRound = (pool: Pool, lobbyCode: string) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        console.log("***starting new round***");
        clearLobbyTimeouts(lobbyCode);

        const lobbyRes = await dbSelectLobby(client, lobbyCode, true);
        if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};

        const lobby = lobbyRes.data;

        console.log("round: " + lobby.round);

        if (lobby.usersSubmitted < lobby.users.length && lobby.round > 0) {
            // push an empty story element for each user who hasn't submitted
            const submittedUserIdsRes = await dbSelectStoryElementDistinctUserIdsForRound(client, lobby.code, lobby.round);
            if (!submittedUserIdsRes.success || !submittedUserIdsRes.data) return {success: false, error: submittedUserIdsRes.error};

            const submittedUserIds = submittedUserIdsRes.data;

            const storyElements: StoryElement[] = [];

            for (const user of lobby.users) {
                if (!submittedUserIds.includes(user.id)) {
                    console.log("user " + user.id + " has not submitted");
                    const storyIndex = storyIndexForUser(lobby, user.id);

                    const storyIdRes = await dbSelectStoryIdByIndex(client, lobbyCode, storyIndex);
                    if (!storyIdRes.success || !storyIdRes.data) return {success: false, error: storyIdRes.error};

                    const storyId = storyIdRes.data;

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
                const insertStoryElementsRes = await dbInsertStoryElements(client, storyElements);
                if (!insertStoryElementsRes.success) return {success: false, error: insertStoryElementsRes.error};
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
        const updateUsersSubmittedRes = await dbUpdateLobbyUsersSubmitted(client, lobbyCode, 0)
        if (!updateUsersSubmittedRes.success) return {success: false, error: updateUsersSubmittedRes.error};
        lobby.usersSubmitted = 0;
        console.log("users submitted reset to 0");

        const updateRoundRes = await dbUpdateLobbyRound(client, lobbyCode, newLobbyRound, roundStartTime, roundEndTime);
        if (!updateRoundRes.success) return {success: false, error: updateRoundRes.error};

        lobby.round = newLobbyRound;
        lobby.roundStartAt = roundStartTime;
        lobby.roundEndAt = roundEndTime;

        return {success: true, data: lobby};
    });
};

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

