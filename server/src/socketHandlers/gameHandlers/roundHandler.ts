import {Pool, PoolClient} from "pg";
import {
    ErrorType,
    Lobby,
    LogLevel,
    OpResult,
    processOp,
    StoryElement,
    StoryElementType
} from "../../../../shared/sharedTypes";
import {Server} from "socket.io";
import {
    dbInsertStoryElements, dbLockRowLobby,
    dbSelectStoryElementDistinctUserIdsForRound,
    dbSelectStoryIdByIndex,
    dbTransaction, dbUpdateLobbyRound, dbUpdateLobbyUsersSubmitted, dbUpdateUsersReady
} from "../../db";

import {storyIndexForUser} from "../../utils/utils";
import {broadcastGetStoryElements, broadcastLobbyInfo} from "../socketService";

const USERS_TIMEOUT_MILLISECONDS = 30 * 1000;

const LOADING_TIMEOUT_MILLISECONDS = 3 * 1000;
const REMAINING_MILLISECONDS_FOR_ACCELERATION = 20 * 1000;

const lobbyTimeouts = new Map<string, NodeJS.Timeout>();

// Function to handle the start of a new round
export const onNewRound = async (io : Server, pool: Pool, lobby: Lobby) => {

    const {data: newLobby, success, error} = await processOp(() =>
        newRound(pool, lobby)
    )
    if (!success || !newLobby) {
        console.error("error starting new round : ", error);
        return;
    }
    setTimeout(() => {
        broadcastLobbyInfo(io, newLobby.code, newLobby);
    }, LOADING_TIMEOUT_MILLISECONDS);
    if (newLobby.round > 0) waitForRound(io, pool, newLobby);
};

// Function to wait for a round to end
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
    }, 1000);
    clearLobbyTimeouts(lobby.code);
    setLobbyTimeout(lobby.code, roundWaitInterval);
};

// Function to handle the end of a round
const onEndRound = (io : Server, pool: Pool, lobby: Lobby) => {
    broadcastGetStoryElements(io, lobby.code);
    // set timeout for users to submit story elements
    setLobbyTimeout(lobby.code, setTimeout(async () => {
        await onNewRound(io ,pool, lobby);
    }, USERS_TIMEOUT_MILLISECONDS));
};

// Function to start a new round
const newRound = (pool: Pool, lobby: Lobby) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        console.log("***starting new round***");
        clearLobbyTimeouts(lobby.code);
        let error, success;
        console.log("round: " + lobby.round);
        // get number of users in the story


        if (lobby.usersSubmitted < lobby.roundsCount && lobby.round > 0) {
            // push an empty story element for each user who hasn't submitted
            let submittedUserIds;
            ({data: submittedUserIds, error, success} = await dbSelectStoryElementDistinctUserIdsForRound(client, lobby.code, lobby.round));
            if (!success || !submittedUserIds) return {success: false, error: error};
            if(lobby.userIndexOrder === null)
                return {success: false, error: {type: ErrorType.USER_INDEX_ORDER_IS_NULL, logLevel: LogLevel.Error, error: "user index is null"}};

            const storyElements: StoryElement[] = [];
            for (let key in lobby.userIndexOrder) {
                if (!submittedUserIds.includes(key)) {
                    console.log("user " + key + " has not submitted");
                    // get user index
                    const userIndex = lobby.userIndexOrder[key]
                    const storyIndex = storyIndexForUser(lobby.code, userIndex, lobby.round, lobby.roundsCount );
                    let storyId;
                    ({data: storyId, error, success} = await dbSelectStoryIdByIndex(client, lobby.code, storyIndex));
                    if (!success || !storyId) return {success, error};

                    const emptyStoryElement: StoryElement = {
                        index: 0,
                        userId: key,
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
        const shiftedNow = Date.now() + LOADING_TIMEOUT_MILLISECONDS;
        let roundStartTime: (Date | null) = new Date(shiftedNow);
        let roundEndTime: (Date | null) = new Date(shiftedNow + lobby.lobbySettings.roundSeconds * 1000);

        if (newLobbyRound > lobby.roundsCount ) {
            // end game
            newLobbyRound = -1;
            roundStartTime = null;
            roundEndTime = null;
        }

        //lock the lobby row
        ({error, success} = await dbLockRowLobby(client, lobby.code));
        if (!success) return {success, error};

        ({error, success} = await dbUpdateLobbyUsersSubmitted(client, lobby.code, 0));
        if (!success) return {success, error};
        lobby.usersSubmitted = 0;
        console.log("users submitted reset to 0");

        // unready all players
        const userIds = lobby.users.map(user => user.id);
        ({error, success} = await dbUpdateUsersReady(client, userIds, false));
        if (!success) return {success, error};

        ({error, success} = await dbUpdateLobbyRound(client, lobby.code, newLobbyRound, roundStartTime, roundEndTime));
        if (!success) return {success, error};

        lobby.round = newLobbyRound;
        lobby.roundStartAt = roundStartTime;
        lobby.roundEndAt = roundEndTime;

        return {success: true, data: lobby};
    });
};
// Accelerate the round timer (DYNAMIC TIMER SETTING)
export const onAccelerateRoundTimer = async (io: Server, pool: Pool, lobby: Lobby) => {
    const {data: newLobby, success} = await processOp(() =>
        accelerateRoundTimer(pool, lobby)
    )
    if (!success || !newLobby) {
        console.error("error accelerating round timer");
        return;
    }

    console.log("broadcasting lobby info");
    broadcastLobbyInfo(io, newLobby.code, newLobby);
    clearLobbyTimeouts(lobby.code);
    waitForRound(io, pool, newLobby);
}

const accelerateRoundTimer = (pool: Pool, lobby: Lobby) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        console.log("***accelerating round timer***");
        clearLobbyTimeouts(lobby.code);

        console.log("round: " + lobby.round);

        if(!lobby.roundStartAt || !lobby.roundEndAt) return {success: false, error: {type: ErrorType.ROUND_START_END_NULL, logLevel: LogLevel.Error, error: "round start or end time is null"}};
        const shiftedNow = Date.now() + LOADING_TIMEOUT_MILLISECONDS;
        let roundEndTime: (Date | null) = new Date(shiftedNow + REMAINING_MILLISECONDS_FOR_ACCELERATION);

        //lock the lobby row
        let {error, success} = await dbLockRowLobby(client, lobby.code);
        if (!success) return {success, error};

        ({error, success} = await dbUpdateLobbyRound(client, lobby.code, lobby.round, lobby.roundStartAt, roundEndTime));
        if (!success) return {success, error};

        lobby.roundEndAt = roundEndTime;

        return {success: true, data: lobby};
    });

}






// Function to handle the restart of a round
export const onRestartRound = async (io: Server, pool: Pool, lobby: Lobby) => {
    const {data: newLobby, success} = await processOp(() =>
        restartRound(pool, lobby)
    )
    if (!success || !newLobby) {
        console.error("error restarting round");
        return;
    }

    setTimeout(() => {
        broadcastLobbyInfo(io, newLobby.code, newLobby);
    }, LOADING_TIMEOUT_MILLISECONDS);
    waitForRound(io, pool, newLobby);
}

// Function to restart a round
const restartRound = (pool: Pool, lobby: Lobby) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        console.log("***restarting round***");
        clearLobbyTimeouts(lobby.code);

        console.log("round: " + lobby.round);

        let {data: submittedUserIds, error, success} = await dbSelectStoryElementDistinctUserIdsForRound(client, lobby.code, lobby.round);
        if (!success || !submittedUserIds) return {success: false, error};

        // set round start time now + 2 seconds for the users to receive the lobby info before the round starts
        const shiftedNow = Date.now() + LOADING_TIMEOUT_MILLISECONDS;
        let roundStartTime: (Date | null) = new Date(shiftedNow);
        let roundEndTime: (Date | null) = new Date(shiftedNow + lobby.lobbySettings.roundSeconds * 1000);

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

// Function to set a timeout for a lobby
export const setLobbyTimeout = (lobbyCode: string, timeout: NodeJS.Timeout) => {
    lobbyTimeouts.set(lobbyCode, timeout);
}

// Function to clear all timeouts for a lobby
const clearLobbyTimeouts = (lobbyCode: string) => {
    if (lobbyTimeouts.has(lobbyCode)) {
        clearTimeout(lobbyTimeouts.get(lobbyCode));
        clearInterval(lobbyTimeouts.get(lobbyCode));
        lobbyTimeouts.delete(lobbyCode);
    }
};

