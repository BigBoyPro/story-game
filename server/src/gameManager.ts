import {
    dbDeleteAllStories,
    dbDeleteLobby,
    dbDeleteUser,
    dbInsertLobby,
    dbInsertStory,
    dbInsertStoryElements,
    dbSelectInactiveUsers,
    dbSelectLobby,
    dbSelectLobbyCount,
    dbSelectStoryElementDistinctUserIdsForRound,
    dbSelectStoryIdByIndex,
    dbSelectStoryWithIndex,
    dbSelectUserLobbyCode,
    dbTransaction,
    dbUpdateLobbyHost,
    dbUpdateLobbyRound,
    dbUpdateLobbyUsersSubmitted,
    dbUpdateLobbyUsersSubmittedIncrement,
    dbUpdateUserLobbyCode,
    dbUpsertUser
} from "./db";
import {Pool, PoolClient} from "pg";
import {
    ErrorType,
    Lobby,
    LogLevel,
    OpResult,
    Story,
    StoryElement,
    StoryElementType,
    User
} from "../../shared/sharedTypes";
import shuffleSeed from "shuffle-seed";
import {endRound} from "./server";

const ROUND_MILLISECONDS = 5 * 60 * 1000;
const lobbyTimeouts = new Map<string, NodeJS.Timeout>();

export const startRound = (pool: Pool, lobbyCode: string) => {
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




export const waitForRound = (pool: Pool, lobby: Lobby) => {
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
                endRound(pool, lobby);
                console.log("waiting for story elements from all users");
            }
    }, 500);
    clearLobbyTimeouts(lobby.code);
    setLobbyTimeout(lobby.code, roundTimer);
};


export const getLobbyForUser = async (pool: Pool, userId: string): Promise<OpResult<Lobby | null>> => {
    // get user lobby
    const lobbyCodeRes = await dbSelectUserLobbyCode(pool, userId);
    if (!lobbyCodeRes.success) return {success: false, error: lobbyCodeRes.error};
    const lobbyCode = lobbyCodeRes.data;

    if (!lobbyCode) {
        return {success: true, data: null};
    }
    return await dbSelectLobby(pool, lobbyCode);
};

export const createLobby = (pool: Pool, userId: string, nickname: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // upsert user
        const user: User = {id: userId, nickname: nickname, lobbyCode: null};

        const upsertUserRes = await dbUpsertUser(client, user);
        if (!upsertUserRes.success) return {success: false, error: upsertUserRes.error};


        // generate unique lobby code
        const lobbyCodeRes = await generateUniqueLobbyCode(pool);
        if (!lobbyCodeRes.success || !lobbyCodeRes.data) return {success: false, error: lobbyCodeRes.error};
        const lobbyCode = lobbyCodeRes.data;

        // insert lobby
        const lobby: Lobby = {
            code: lobbyCode,
            hostUserId: userId,
            users: [],
            round: 0,
            usersSubmitted: 0,
            roundStartAt: null,
            roundEndAt: null
        };
        const insertLobbyRes = await dbInsertLobby(client, lobby);
        if (!insertLobbyRes.success) return {success: false, error: insertLobbyRes.error};

        // join lobby
        const updateLobbyCodeRes = await dbUpdateUserLobbyCode(client, userId, lobbyCode);
        if (!updateLobbyCodeRes.success) return {success: false, error: updateLobbyCodeRes.error};
        lobby.users.push(user);


        return {success: true, data: lobby};
    });
}
export const joinLobby = (pool: Pool, userId: string, nickname: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // get lobby
        const lobbyRes = await dbSelectLobby(client, lobbyCode);
        if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};
        const lobby = lobbyRes.data;
        // upsert user
        const user = {id: userId, nickname: nickname, lobbyCode: null};
        const upsertUserRes = await dbUpsertUser(client, user);
        if (!upsertUserRes.success) return {success: false, error: upsertUserRes.error};

        // join lobby
        const updateLobbyCodeRes = await dbUpdateUserLobbyCode(client, userId, lobbyCode);
        if (!updateLobbyCodeRes.success) return {success: false, error: updateLobbyCodeRes.error};

        lobby.users.push(user);
        return {success: true, data: lobby};
    })
}
export const leaveLobby = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby | null>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby | null>> => {
        // get lobby
        const lobbyRes = await dbSelectLobby(client, lobbyCode, true);
        if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};
        const lobby = lobbyRes.data;
        const otherUser = lobby.users.find(user => user.id !== userId);
        // if user is host change host
        if (lobby.hostUserId === userId) {
            if (otherUser) {
                const updateHostRes = await dbUpdateLobbyHost(client, lobbyCode, otherUser.id);
                if (!updateHostRes.success) return {success: false, error: updateHostRes.error};

                lobby.hostUserId = otherUser.id;
                console.log("host changed to " + otherUser.id);
            }
        }

        // remove user from lobby
        const updateLobbyCodeRes = await dbUpdateUserLobbyCode(client, userId, null);
        if (!updateLobbyCodeRes.success) return {success: false, error: updateLobbyCodeRes.error};

        console.log("user " + userId + " removed from lobby " + lobbyCode);
        lobby.users = lobby.users.filter(user => user.id !== userId);

        if (!otherUser) {
            // remove lobby if user is the last one
            const deleteLobbyRes = await dbDeleteLobby(client, lobbyCode);
            if (!deleteLobbyRes.success) return {success: false, error: deleteLobbyRes.error};
            console.log("lobby " + lobbyCode + " removed");
            return {success: true, data: null};
        }

        return {success: true, data: lobby};
    });
}
export const startGame = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {

        // get lobby
        const lobbyRes = await dbSelectLobby(client, lobbyCode, true);
        if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};
        const lobby = lobbyRes.data;

        // check if user is the host
        if (lobby.hostUserId !== userId) {
            return {
                success: false,
                error: {
                    logLevel: LogLevel.Error,
                    type: ErrorType.USER_NOT_HOST,
                    error: "Only the host can start the game"
                }
            };
        }

        // check if lobby is already started
        if (lobby.round !== 0) {
            return {
                success: false,
                error: {
                    logLevel: LogLevel.Error,
                    type: ErrorType.GAME_ALREADY_STARTED,
                    error: "Game is already started"
                }
            };
        }

        // create all stories
        const users = lobby.users;
        const storyNames = ["Once upon a time", "In a galaxy far far away", "A long time ago in a land of magic", "In a world of mystery", "In a land of dragons", "In a kingdom of knights"];
        for (let i = 0; i < users.length; i++) {
            const storyName = storyNames[i % storyNames.length];
            const story: Story = {
                id: -1,
                index: i,
                lobbyCode: lobbyCode,
                name: storyName,
                elements: []
            };
            const insertStoryRes = await dbInsertStory(client, story);
            if (!insertStoryRes.success) return {success: false, error: insertStoryRes.error};
        }
        return {success: true, data: lobby};
    });

}
export const submitStoryElements = (pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {

        // get lobby
        const lobbyRes = await dbSelectLobby(client, lobbyCode, true);
        if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};
        const lobby = lobbyRes.data;

        // check if user is in lobby
        if (!isUserInLobby(lobby, userId)) return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };

        // insert story elements to db
        const insertStoryElementsRes = await dbInsertStoryElements(client, elements);
        if (!insertStoryElementsRes.success) return {success: false, error: insertStoryElementsRes.error};


        // check if all users have submitted their story elements
        let newLobby: Lobby = lobby;
        // update users submitted
        const incrementUsersSubmittedRes = await dbUpdateLobbyUsersSubmittedIncrement(client, lobbyCode);
        if (!incrementUsersSubmittedRes.success) return {success: false, error: incrementUsersSubmittedRes.error};
        newLobby.usersSubmitted++;
        const allUsersSubmitted = newLobby.usersSubmitted >= newLobby.users.length;
        if (allUsersSubmitted) {

            console.log("***round " + lobby.round + " ended***");
        }

        return {success: true, data: newLobby};
    });
}
export const endGame = (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // get lobby
        const lobbyRes = await dbSelectLobby(client, lobbyCode, true);
        if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};
        const lobby = lobbyRes.data;

        // check if user is host
        if (lobby.hostUserId !== userId) {
            return {
                success: false,
                error: {
                    logLevel: LogLevel.Error,
                    type: ErrorType.USER_NOT_HOST,
                    error: "Only the host can end the game"
                }
            };
        }
        // remove all stories and story elements
        const deleteStoriesRes = await dbDeleteAllStories(client, lobbyCode);
        if (!deleteStoriesRes.success) return {success: false, error: deleteStoriesRes.error};

        // reset lobby round
        const updateRoundRes = await dbUpdateLobbyRound(client, lobbyCode, 0, null, null);
        if (!updateRoundRes.success) return {success: false, error: updateRoundRes.error};
        lobby.round = 0;
        lobby.roundStartAt = null;
        lobby.roundEndAt = null;

        return {success: true, data: lobby};
    })
};
export const getStory = async (pool: Pool, userId: string, lobbyCode: string): Promise<OpResult<Story>> => {
    const lobbyRes = await dbSelectLobby(pool, lobbyCode, true);
    if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};
    const lobby = lobbyRes.data;

    // check if user is in lobby
    if (!isUserInLobby(lobby, userId))
        return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };


    // shuffle the user order based on the lobby code
    const storyIndex = storyIndexForUser(lobby, userId);
    // get the story for the user
    return await dbSelectStoryWithIndex(pool, storyIndex, lobbyCode);
}
export const checkInactiveUsers = (pool: Pool) => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby[]>> => {
        // Get all users who haven't been active for 5 minutes
        console.log("checking for inactive users");
        const shortInactiveUsersRes = await dbSelectInactiveUsers(client, 5 * 60);
        if (!shortInactiveUsersRes.success || !shortInactiveUsersRes.data)
            return {success: false, error: shortInactiveUsersRes.error};
        const shortInactiveUsers = shortInactiveUsersRes.data;

        const activeLobbiesMap = new Map<string, Lobby>();

        // Remove each inactive user
        for (const inactiveUser of shortInactiveUsers) {

            const lobbyCodeRes = await dbSelectUserLobbyCode(pool, inactiveUser.id);
            if (!lobbyCodeRes.success) return {success: false, error: lobbyCodeRes.error};
            const lobbyCode = lobbyCodeRes.data;

            let lobby: (Lobby | null) = null;
            if (lobbyCode) {
                const lobbyRes = await dbSelectLobby(client, lobbyCode, true);
                if (!lobbyRes.success || !lobbyRes.data) return {success: false, error: lobbyRes.error};
                lobby = lobbyRes.data;
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
                const updateLobbyCodeRes = await dbUpdateUserLobbyCode(client, inactiveUser.id, null);
                if (!updateLobbyCodeRes.success) return {success: false, error: updateLobbyCodeRes.error};

                // remove lobby if user is the last one
                if (!otherUser) {
                    const deleteLobbyRes = await dbDeleteLobby(client, lobbyCode);
                    if (!deleteLobbyRes.success) return {success: false, error: deleteLobbyRes.error};
                    activeLobbiesMap.delete(lobbyCode);
                }

                lobby.users = lobby.users.filter(user => user.id !== inactiveUser.id);
            }
            // remove user from db
            const deleteUserRes = await dbDeleteUser(client, inactiveUser.id);
            if (!deleteUserRes.success) return {success: false, error: deleteUserRes.error};
            console.log("user " + inactiveUser.id + " removed from db");
        }
        return {success: true, data: Array.from(activeLobbiesMap.values())};
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

const isUserInLobby = (lobby: Lobby, userId: string): boolean => {
    return lobby.users.find(user => user.id === userId) !== undefined;
}

const generateUniqueLobbyCode = async (pool: Pool): Promise<OpResult<string>> => {
    let unique = false;
    let lobbyCode = '';
    while (!unique) {
        for (let i = 0; i < 5; i++) {
            // Generate a random number between 65 and 90, for ASCII values of A-Z
            const ascii = Math.floor(Math.random() * 26) + 65;
            // Convert the ASCII value to a character and add it to the lobbyCode
            lobbyCode += String.fromCharCode(ascii);
        }
        const lobbyCountRes = await dbSelectLobbyCount(pool, lobbyCode);
        if (!lobbyCountRes.success) return {success: false, error: lobbyCountRes.error};
        unique = lobbyCountRes.data === 0;
    }
    return {success: true, data: lobbyCode};
}

const storyIndexForUser = (lobby: Lobby, userId: string) => {
    const shuffledUsers = shuffleSeed.shuffle(lobby.users, lobby.code);
    // get the user index
    const userIndex = shuffledUsers.findIndex(user => user.id === userId);
    return (userIndex + 1 + lobby.round) % lobby.users.length;
};



