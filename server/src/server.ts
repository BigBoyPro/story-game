import {Lobby, Story, StoryElement, StoryElementType, User} from "../../shared/sharedTypes";
import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server, Socket as BaseSocket} from 'socket.io';
import {Pool, PoolClient} from 'pg';
import shuffleSeed from 'shuffle-seed';

interface Socket extends BaseSocket {
    userId?: string;
}

require('dotenv').config();


const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;


if (!SUPABASE_DATABASE_URL) {
    throw new Error('SUPABASE_DATABASE_URL must be set');
}

const pool = new Pool({
    connectionString: SUPABASE_DATABASE_URL
});
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());

const io = new Server(server, {
    cors: {
        origin: "*", // replace with your client's origin
        methods: ["GET", "POST"]
    }
});

const ROUND_MILLISECONDS =  30 * 1000;
const USERS_TIMEOUT_MILLISECONDS = 10 * 1000;
const INACTIVE_USERS_CHECK_MILLISECONDS = 2 * 60 * 1000;


const lobbyTimeouts = new Map<string, NodeJS.Timeout>();


const startNewRound = async (lobbyCode: string) => {
    const begin = async (): Promise<PoolClient> => {
        console.log("***starting new round***");
        return await dbBeginTransaction(pool);
    }
    const success = async (client: PoolClient, lobby: Lobby) => {
        await dbCommitTransaction(client);
        io.to(lobby.code).emit("lobby info", lobby);
    }
    const fail = async (client: PoolClient) => {
        await dbRollbackTransaction(client);
        console.error("error waiting for story elements");
        return null;
    }
    const client = await begin();

    const lobby = await dbSelectLobby(client, null, lobbyCode,true);
    if (!lobby) return await fail(client);

    console.log("round: " + lobby.round);

    if (lobby.usersSubmitted < lobby.users.length && lobby.round > 0) {
        // push an empty story element for each user who hasn't submitted
        const submittedUserIds = await dbSelectStoryElementDistinctUserIdsForRound(client, null, lobby.code, lobby.round);
        if (!submittedUserIds) return await fail(client);
        const storyElements: StoryElement[] = [];
        for (const user of lobby.users) {
            if (!submittedUserIds.includes(user.id)) {
                console.log("user " + user.id + " has not submitted");
                const storyIndex = getStoryIndexForUser(lobby, user.id);
                const storyId = await dbSelectStoryIdByIndex(client, null, lobbyCode, storyIndex);
                const storyElement: StoryElement = {
                    index: storyIndex,
                    userId: user.id,
                    storyId: storyId,
                    round: lobby.round,
                    type: StoryElementType.Empty,
                    content: ""
                };
                storyElements.push(storyElement);
            }
        }
        if(storyElements.length > 0) {
            if (!await dbInsertStoryElements(client, null, storyElements)) return await fail(client);
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

    if (!await dbUpdateLobbyUsersSubmitted(client, null, lobbyCode, 0)) return await fail(client);
    lobby.usersSubmitted = 0;
    console.log("users submitted reset to 0");
    if (!await dbUpdateLobbyRound(client, null, lobbyCode, newLobbyRound, roundStartTime, roundEndTime)) return await fail(client);
    lobby.round = newLobbyRound;
    lobby.roundStartAt = roundStartTime;
    lobby.roundEndAt = roundEndTime;

    await success(client, lobby)

    if (lobby.round > 0) {
        waitForRound(lobby);
    }
};


const waitForRound = (lobby: Lobby) => {
    let roundTimer: NodeJS.Timeout | null = null;
    console.log("***waiting for round : " + lobby.round + "***");
    roundTimer = setInterval(async () => {
        if (lobby.roundEndAt) {
            console.log("seconds left: " + (lobby.roundEndAt.getTime() - Date.now()) / 1000);
            if (Date.now() >= lobby.roundEndAt.getTime()) {
                console.log("***round " + lobby.round + " ended***");
                // ask for story elements
                if(roundTimer) clearInterval(roundTimer);
                roundTimer = null
                io.to(lobby.code).emit("get story elements");
                console.log("waiting for story elements from all users");
                // wait for story elements from all users
                lobbyTimeouts.set(lobby.code, setTimeout(async () => {
                    if(lobbyTimeouts.has(lobby.code)) {
                        await startNewRound(lobby.code);
                    }
                }, USERS_TIMEOUT_MILLISECONDS));
            }
        }
    }, 500);
    if(lobbyTimeouts.has(lobby.code)) {
        clearTimeout(lobbyTimeouts.get(lobby.code));
        clearInterval(lobbyTimeouts.get(lobby.code))
    }
    lobbyTimeouts.set(lobby.code, roundTimer);
};

function getStoryIndexForUser(lobby: Lobby, userId: string) {
    const shuffledUsers = shuffleSeed.shuffle(lobby.users, lobby.code);
    // get the user index
    const userIndex = shuffledUsers.findIndex(user => user.id === userId);
    return (userIndex + 1 + lobby.round) % lobby.users.length;
}

io.on("connection", (socket :Socket) => {
    console.log("a user connected");
    socket.emit("connected");



    socket.on("get lobby", async (userId: string) => {
        const begin = () => {
            socket.userId = userId;
            console.log("user " + userId + " sent get lobby request");
        }
        const success = (lobby: (Lobby | null)) => {
            if (lobby) {
                socket.join(lobby.code);
                socket.emit("lobby info", lobby);
                console.log("lobby info sent to " + userId);
            }else {
                console.log("no lobby info found for " + userId);
            }
        }
        const fail = () => {
            console.error("error getting lobby");
        }

        begin();

        // get user lobby
        const lobbyCode = await dbSelectUserLobbyCode(pool, socket, userId);
        if (!lobbyCode) return success(null);

        const lobby = await dbSelectLobby(pool, socket, lobbyCode);
        if (!lobby) return fail();

        success(lobby)

    });



    socket.on("create lobby", async (userId: string, nickname: string) => {

        const begin = async () : Promise<PoolClient> => {
            console.log("user " + userId + " sent create lobby request");
            return await dbBeginTransaction(pool);
        }
        const success = async (client: PoolClient, lobby: Lobby) => {
            await dbCommitTransaction(client);

            // client join lobby room
            socket.join(lobby.code);
            // send lobby info to all users in lobby
            io.to(lobby.code).emit("lobby info", lobby);
            console.log("user " + userId + " created lobby " + lobby.code);
        }
        const fail = async (client: PoolClient) => {
            await dbRollbackTransaction(client);
            console.error("error creating lobby");
        }

        const client = await begin();

        // upsert user
        const user : User = {id: userId, nickname: nickname, lobbyCode: null};
        if (!await dbUpsertUser(client, socket, user)) return await fail(client);
        console.log("user " + userId + " upserted");

        // generate unique lobby code
        const lobbyCode = await generateUniqueLobbyCode(socket);
        if (!lobbyCode) return await fail(client);

        // insert lobby
        const lobby : Lobby = {code: lobbyCode, hostUserId: userId, users: [], round: 0, usersSubmitted: 0, roundStartAt: null , roundEndAt: null};
        if(!await dbInsertLobby(client, socket, lobby)) return await fail(client);
        console.log("lobby created with code " + lobby);

        // join lobby
        if (!await dbUpdateUserLobbyCode(client, socket, userId, lobbyCode)) return await fail(client);
        lobby.users.push(user);


        await success(client, lobby)

    });




    socket.on("join lobby", async (userId: string, nickname: string, lobbyCode: string) => {

        const begin = async () : Promise<PoolClient> => {
            console.log("user " + userId + "sent join lobby:" + lobbyCode + " request");
            return await dbBeginTransaction(pool);
        }
        const success = async (client: PoolClient, lobby: Lobby) => {
            await dbCommitTransaction(client);
            socket.join(lobby.code);
            io.to(lobby.code).emit("lobby info", lobby);
            console.log("user " + userId + " joined lobby " + lobby.code);
        }
        const fail = async (client: PoolClient) => {
            await dbRollbackTransaction(client);
            console.error("error joining lobby");
        }

        const client = await begin();
        // get lobby
        const lobby = await dbSelectLobby(client, socket, lobbyCode);
        if (!lobby) return await fail(client);

        // upsert user
        const user = {id: userId, nickname: nickname, lobbyCode: null};
        if (!await dbUpsertUser(client, socket, user)) return await fail(client);

        // join lobby
        if (!await dbUpdateUserLobbyCode(client, socket, userId, lobbyCode)) return await fail(client);
        lobby.users.push(user);

        await success(client, lobby)
    });


    socket.on("leave lobby", async (userId: string, lobbyCode: string) => {
        const begin = async () : Promise<PoolClient> => {
            console.log("user " + userId + " sent leave lobby:" + lobbyCode + " request");
            return await dbBeginTransaction(pool);
        }
        const success = async (client: PoolClient, lobby: (Lobby | null)) => {
            await dbCommitTransaction(client);
            socket.leave(lobbyCode);
            socket.emit("left lobby");
            if(lobby) {
                io.to(lobby.code).emit("lobby info", lobby);
            }else {
                console.log("lobby " + lobbyCode + " removed");
            }
            console.log("user " + userId + " left lobby " + lobbyCode);
        }
        const fail = async (client: PoolClient) => {
            await dbRollbackTransaction(client);
            console.error("error leaving lobby by user " + userId);
        }



        const client = await begin();
        // update user last active
        if (!await dbUpdateUserLastActive(client, socket, userId)) return await fail(client);

        // get lobby
        let lobby = await dbSelectLobby(client, socket, lobbyCode, true);
        if (!lobby) return await fail(client);

        // check if user is in lobby
        if (!checkUserInLobby(socket, lobby, userId)) return await fail(client);
        console.log("user " + userId + " is in lobby " + lobbyCode);

        const otherUser = lobby.users.find(user => user.id !== userId);
        // if user is host change host
        if (lobby.hostUserId === userId) {
            if (otherUser) {
                if (!await dbUpdateLobbyHost(client, socket, lobbyCode, otherUser.id)) return await fail(client);
                lobby.hostUserId = otherUser.id;
                console.log("host changed to " + otherUser.id);
            }
        }

        // remove user from lobby
        if (!await dbUpdateUserLobbyCode(client, socket, userId, null)) return await fail(client);
        console.log("user " + userId + " removed from lobby " + lobbyCode);
        lobby.users = lobby.users.filter(user => user.id !== userId);

        if (!otherUser) {
            if (!await dbDeleteLobby(client, socket, lobbyCode)) return await fail(client);
            console.log("lobby " + lobbyCode + " removed");
            lobby = null;
        }

        await success(client, lobby)
    });


    socket.on("start game", async (userId: string, lobbyCode: string) => {
        const begin = async () : Promise<PoolClient> => {
            console.log("user " + userId + " sent start game request");
            return await dbBeginTransaction(pool);
        }
        const success = async (client: PoolClient, lobby: Lobby) => {
            await dbCommitTransaction(client);
            io.to(lobbyCode).emit("lobby info", lobby);
            console.log("started game in lobby " + lobbyCode);
        }
        const fail = async (client: PoolClient) => {
            await dbRollbackTransaction(client);

            console.error("error starting game in lobby " + lobbyCode);
        }
        const client = await begin();
        // update user last active
        if (!await dbUpdateUserLastActive(client, socket, userId)) return await fail(client);

        // get lobby
        const lobby = await dbSelectLobby(client, socket, lobbyCode);
        if (!lobby) return await fail(client);

        // check if user is host
        if (lobby.hostUserId !== userId) {
            console.error("error starting game: user " + userId + " is not host");
            socket.emit("error", {type: "START_GAME_NOT_HOST", message: "Only the host can start the game"});
            return await fail(client);
        }
        console.log("user " + userId + " is host");

        // check if lobby is already started
        if (lobby.round !== 0) {
            console.error("error starting game: game already started");
            socket.emit("error", {type: "GAME_ALREADY_STARTED", message: "The game has already started"});
            return await fail(client);
        }

        // create all stories
        const users = lobby.users;
        const storyNames = ["Once upon a time", "In a galaxy far far away", "A long time ago in a land of magic", "In a world of mystery", "In a land of dragons", "In a kingdom of knights"];
        for (let i = 0; i < users.length; i++) {
            const storyName = storyNames[i % storyNames.length];
            if(!await dbInsertStory(client, socket, lobbyCode, i, storyName)) return await fail(client);
        }

        await success(client, lobby)

        await startNewRound(lobbyCode);

    });



    socket.on("story elements", async (userId: string, lobbyCode: string, elements: StoryElement[]) => {
        const begin = async () : Promise<PoolClient> => {
            console.log("user " + userId + " sent story elements");
            return await dbBeginTransaction(pool);
        }
        const success = async (client: PoolClient, usersSubmitted : number) => {
            await dbCommitTransaction(client);
            io.to(lobbyCode).emit("users submitted", usersSubmitted);
            console.log("story elements sent by " + userId + " in lobby " + lobbyCode)
        }

        const fail = async (client: PoolClient) => {
            await dbRollbackTransaction(client);
            console.error("error sending story elements by " + userId);
        }
        const client = await begin();
        // update user last active
        if (!await dbUpdateUserLastActive(client, socket, userId)) return await fail(client);

        // get lobby
        const lobby = await dbSelectLobby(client, socket, lobbyCode, true);
        if (!lobby) return await fail(client);

        // check if user is in lobby
        if (!checkUserInLobby(socket, lobby, userId)) return await fail(client);

        // insert story elements to db

        if (!await dbInsertStoryElements(client, socket, elements)) return await fail(client);

        // check if all users have submitted their story elements
        let newLobby : (Lobby | null) = lobby;

        const allUserSubmitted = newLobby.usersSubmitted + 1 >= newLobby.users.length;
        if (!allUserSubmitted) {
            console.log("not all users have submitted their story elements");
            // update users submitted
            if(!await dbUpdateLobbyUsersSubmittedIncrement(client, socket, lobbyCode)) return await fail(client);
            newLobby.usersSubmitted++;
            console.log("users submitted incremented to " + newLobby.usersSubmitted);

        } else {
            console.log("all users have submitted their story elements");

            // start new round
            console.log("clearing timeout for lobby " + lobbyCode);
            if(lobbyTimeouts.has(lobbyCode)) {
                clearTimeout(lobbyTimeouts.get(lobbyCode));
                clearInterval(lobbyTimeouts.get(lobbyCode));
                lobbyTimeouts.delete(lobbyCode);
                console.log("timeout or interval cleared for lobby " + lobbyCode);
            }


        }
        await success(client, newLobby.usersSubmitted)

        if(allUserSubmitted) {
            console.log("***round " + lobby.round + " ended***");
            await startNewRound(lobbyCode);
        }
    });





    socket.on("end game", async (userId: string, lobbyCode: string) => {
        const begin = async () : Promise<PoolClient> => {
            console.log("user " + userId + " sent end game request");
            return await dbBeginTransaction(pool);
        }
        const success = async (client: PoolClient, lobby: Lobby) => {
            await dbCommitTransaction(client);
            io.to(lobby.code).emit("lobby info", lobby);
            console.log("game ended in lobby " + lobby.code);
        }
        const fail = async (client: PoolClient) => {
            await dbRollbackTransaction(client);
            console.error("error ending game in lobby " + lobbyCode);
        }

        const client = await begin();
        // update user last active
        if (!await dbUpdateUserLastActive(client, socket, userId)) return await fail(client);

        // get lobby
        const lobby = await dbSelectLobby(client, socket, lobbyCode, true);
        if (!lobby) return await fail(client);

        // check if user is host
        if (lobby.hostUserId !== userId) {
            console.error("user " + userId + " is not host");
            socket.emit("error", {type: "USER_NOT_HOST", message: "Only the host can end the game"});
            return await fail(client);
        }

        // remove all stories and story elements
        if(!await dbDeleteAllStories(client, socket, lobbyCode)) return await fail(client);

        // reset lobby round
        if(!await dbUpdateLobbyRound(client, socket, lobbyCode, 0, null, null)) return await fail(client);
        lobby.round = 0;

        await success(client, lobby)
    });


    socket.on("get story", async (userId: string, lobbyCode: string) => {
        const begin = () => {
            console.log("user " + userId + " sent get story request");
        }
        const success = () => {
            console.log("story sent to " + userId);
        }
        const fail = () => {
            console.error("error getting story");
        }
        begin();
        // update user last active
        if (!await dbUpdateUserLastActive(pool, socket, userId)) return fail();

        const lobby = await dbSelectLobby(pool, socket, lobbyCode);
        if (!lobby) return fail();

        // check if user is in lobby
        if (!checkUserInLobby(socket, lobby, userId)) return fail();


        // shuffle the user order based on the lobby code
        if (!lobby.users) return fail();
        const storyIndex = getStoryIndexForUser(lobby, userId);
        // get the story for the user
        const story = await dbSelectStoryWithIndex(pool, socket, storyIndex, lobbyCode);
        if (!story) return fail();
        socket.emit("story", story);
        success()
    });




    socket.on("next story", async (userId: string, lobbyCode: string, index: number) => {
        const begin = () => {
            console.log("user " + userId + " sent next story request from " + lobbyCode + " with index " + index);
        }
        const success = (story: Story) => {
            console.log("story sent to " + userId + " in lobby " + story.lobbyCode + " with index " + index);
            io.to(story.lobbyCode).emit("next story", story);
        }
        const fail = () => {
            console.error("error getting next story");
        }
        begin();
        // update user last active
        if (!await dbUpdateUserLastActive(pool, socket, userId)) return fail();

        const story = await dbSelectStoryByIndex(pool, socket, lobbyCode, index);
        if (!story) return fail();

        success(story)
    });


    socket.on("disconnect", async () => {
        console.log("user disconnected");

    });
});



server.listen(4000, () => {
    console.log("Server is running on port 4000");
});

setInterval(async () => {

    const begin = async () : Promise<PoolClient> => {
        console.log("checking for inactive users");
        return await dbBeginTransaction(pool);
    }
    const success = async (client: PoolClient, lobbies: Map<string,Lobby>) => {
        await dbCommitTransaction(client);
        for (const lobby of lobbies.values()) {
            io.to(lobby.code).emit("lobby info", lobby);
        }
        console.log("inactive users checked");
    }
    const fail = async (client: PoolClient) => {
        await dbRollbackTransaction(client);

    }

    const client = await begin();

    // Get all users who haven't been active for 5 minutes
    const shortInactiveUsers = await dbSelectInactiveUsers(client, null,5 * 60);
    const activeLobbiesMap = new Map<string, Lobby>();

    // Remove each inactive user
    for (const inactiveUser of shortInactiveUsers) {

        const lobbyCode = await dbSelectUserLobbyCode(client, null, inactiveUser.id);
        let lobby : (Lobby | null) = null;
        if (lobbyCode) {
            lobby = await dbSelectLobby(client, null, lobbyCode, true);
            if (!lobby) return await fail(client);

            activeLobbiesMap.set(lobbyCode, lobby);

            const otherUser = lobby.users.find(user => user.id !== inactiveUser.id);
            // if user is host change host
            if (lobby.hostUserId === inactiveUser.id) {
                if (otherUser) {
                    if (!await dbUpdateLobbyHost(client, null, lobbyCode, otherUser.id)) return await fail(client);
                    lobby.hostUserId = otherUser.id;
                    console.log("host changed to " + otherUser.id);
                }
            }

            // if game is in progress leave user in lobby
            if (lobby.round != 0) continue;

            // remove user from lobby
            if (!await dbUpdateUserLobbyCode(client, null, inactiveUser.id, null)) return await fail(client);
            console.log("user " + +" removed from lobby " + lobbyCode);

            // remove lobby if user is the last one
            if (!otherUser) {
                if (!await dbDeleteLobby(client, null, lobbyCode)) return await fail(client);
                console.log("lobby " + lobbyCode + " removed");
                activeLobbiesMap.delete(lobbyCode);
            }

            lobby.users = lobby.users.filter(user => user.id !== inactiveUser.id);
            // remove user from db

        }
        if (!await dbDeleteUser(client, null, inactiveUser.id)) return await fail(client);
        console.log("user " + inactiveUser.id + " removed from db");
    }

    await success(client, activeLobbiesMap)

},  INACTIVE_USERS_CHECK_MILLISECONDS)
// Run every 2 minutes


const checkUserInLobby = (socket: Socket, lobby: Lobby, userId: string): boolean => {
    if(!isUserInLobby(lobby, userId)) {
        console.error("user " + userId + " is not in lobby " + lobby.code);
        socket.emit("error", {type: "USER_NOT_IN_LOBBY", message: "User is not in lobby"});
        return false;
    }
    return true;
}


const isUserInLobby = (lobby: Lobby, userId: string): boolean => {
    return lobby.users.find(user => user.id === userId) !== undefined;
}


const generateUniqueLobbyCode = async (socket: Socket): Promise<string | null> => {
    let unique = false;
    let lobbyCode = '';
    while (!unique) {
        for(let i = 0; i < 5; i++) {
            // Generate a random number between 65 and 90, for ASCII values of A-Z
            const ascii = Math.floor(Math.random() * 26) + 65;
            // Convert the ASCII value to a character and add it to the lobbyCode
            lobbyCode += String.fromCharCode(ascii);
        }
        try {
            const res = await pool.query('SELECT COUNT(*) FROM lobbies WHERE code = $1', [lobbyCode]);
            const count = res.rows[0].count;
            unique = count == 0;
        } catch (error) {
            console.error("error checking generated lobby code: " + error);
            socket.emit("error", {type: "DB_ERROR_CHECK_GENERATED_LOBBY_CODE", message: "An error occurred while checking generated lobby code"});
            return null;
        }
    }
    return lobbyCode;
}



const dbBeginTransaction = async (pool : Pool) : Promise<PoolClient> => {
    const client = await pool.connect();
    await client.query('BEGIN');
    return client;
};

const dbCommitTransaction = async (client: PoolClient) => {
    await client.query('COMMIT');
    client.release();
};

const dbRollbackTransaction = async (client: PoolClient) => {
    await client.query('ROLLBACK');
    client.release();
};



const dbSelectStoryElements = async (db: (Pool | PoolClient), socket: Socket, storyId: number) : Promise<StoryElement[] | null> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM story_elements
                                    WHERE story_id = $1`, [storyId]);
        const data = res.rows;
        return data.map(row => ({
            index: row.index,
            userId: row.user_id,
            storyId: row.story_id,
            round: row.round,
            type: row.type,
            content: row.content
        }));
    } catch (error) {
        console.error("error getting all story elements: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY_ELEMENTS", message: "An error occurred while getting all story elements" });
        return null;
    }
};



const dbSelectStoryWithIndex = async (db: (Pool | PoolClient), socket: Socket, storyIndex: number, lobbyCode: string) : Promise<Story | null> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM stories
                                    WHERE lobby_code = $1
                                      AND index = $2`, [lobbyCode, storyIndex]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("story not found");
            socket.emit("error", {type: "STORY_NOT_FOUND", message: "Story not found"});
            return null;
        }
        const story = data[0];
        const storyElements = await dbSelectStoryElements(db, socket, story.id);
        if (!storyElements) return null;
        return {
            id: story.id,
            index: story.index,
            lobbyCode: story.lobbyCode,
            name: story.name,
            elements: storyElements
        };
    } catch (error) {
        console.error("error getting story: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY", message: "An error occurred while getting story" });
        return null;
    }
};



const dbSelectUsersForLobby = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string) : Promise<User[] | null>=> {
    try {
        const res = await db.query(`SELECT *
                                    FROM users
                                    WHERE lobby_code = $1
                                    ORDER BY created_at`, [lobbyCode]);
        const data = res.rows;
        return data.map(row => ({id: row.id, nickname: row.nickname, lobbyCode: row.lobby_code}));
    } catch (error) {
        console.error('error fetching lobby users: ' + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_FETCH_USERS", message: "An error occurred while fetching lobby users"});
        return null;
    }
};



const dbSelectLobby = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string, lock = false): Promise<Lobby | null> => {
    try {

        const res = await db.query(`SELECT *
                                    FROM lobbies
                                    WHERE code = $1
                                        ${lock ? 'FOR UPDATE' : ''}`, [lobbyCode]);

        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("lobby not found");
            if (socket)
                socket.emit("error", {type: "LOBBY_NOT_FOUND", message: "Lobby not found"});
            return null;
        }
        const users = await dbSelectUsersForLobby(db, socket, lobbyCode);
        if (!users) return null;

        return {
            code: lobbyCode,
            hostUserId: data[0].host_user_id,
            users: users,
            round: data[0].round,
            usersSubmitted: data[0].users_submitted,
            roundStartAt: data[0].round_start_at ? new Date(data[0].round_start_at) : null,
            roundEndAt: data[0].round_end_at ? new Date(data[0].round_end_at) : null
        };

    } catch (error) {
        console.error("error getting lobby: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_GET_LOBBY", message: "An error occurred while getting lobby"});
        return null;
    }
}



const dbSelectStoryByIndex = async (db: (Pool | PoolClient), socket: Socket, lobbyCode: string, index: number) : Promise<Story | null> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM stories
                                    WHERE lobby_code = $1
                                      AND index = $2`, [lobbyCode, index]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("story not found by index");
            socket.emit("error", {type: "STORY_NOT_FOUND_BY_INDEX", message: "Story not found by index"});
            return null;
        }
        const story = data[0];
        const storyElements = await dbSelectStoryElements(db, socket, story.id);
        if (!storyElements) return null;
        return {
            id: story.id,
            index: story.index,
            lobbyCode: story.lobby_code,
            name: story.name,
            elements: storyElements
        };
    } catch (error) {
        console.error("error getting story by index: " + error);
        socket.emit("error", {type: "DB_ERROR_GET_STORY_BY_INDEX", message: "An error occurred while getting story by index"});
        return null;
    }
};



const dbSelectInactiveUsers = async (db: (Pool | PoolClient), socket: (Socket | null), seconds: number): Promise<User[]> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM users
                                    WHERE NOW() - last_active > INTERVAL '${seconds}' SECOND`);
        const data = res.rows;
        return data.map(row => ({
            id: row.id,
            nickname: row.nickname,
            lobbyCode: row.lobby_code,
            lastActive: row.last_active
        }));
    } catch (error) {
        console.error("error selecting inactive users: " + error);
        if (socket)
            socket.emit("error", {type: "DB_ERROR_SELECT_INACTIVE_USERS", message: "An error occurred while selecting inactive users"});
        return [];
    }
};



const dbSelectUserLobbyCode = async (db: (Pool | PoolClient), socket: (Socket | null), userId: string): Promise<string | null> => {
    try {
        const res = await db.query(`SELECT lobby_code
                                    FROM users
                                    WHERE id = $1`, [userId]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("user not found");
            if (socket)
                socket.emit("error", {type: "USER_NOT_FOUND", message: "User not found"});
            return null;
        }
        return data[0].lobby_code;

    } catch (error) {
        console.error("error selecting user lobby code: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_SELECT_USER_LOBBY_CODE", message: "An error occurred while selecting user lobby code"});
        return null;
    }
};


const dbSelectStoryElementDistinctUserIdsForRound = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string, round : number): Promise<string[] | null> => {
    try {
        const res = await db.query(`SELECT DISTINCT user_id
                                    FROM story_elements
                                    WHERE story_id IN (SELECT id
                                                       FROM stories
                                                       WHERE lobby_code = $1)
                                      AND round = $2`, [lobbyCode, round]);
        const data = res.rows;
        return data.map(row => row.user_id);
    } catch (error) {
        console.error("error selecting last user ids in lobby: " + error);
        if (socket)
            socket.emit("error", {type: "DB_ERROR_SELECT_LAST_USER_IDS_IN_LOBBY", message: "An error occurred while selecting last user ids in lobby"});
        return null;
    }
};


const dbSelectStoryIdByIndex = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string, index: number) => {
    try {
        const res = await db.query(`SELECT id
                                    FROM stories
                                    WHERE lobby_code = $1
                                      AND index = $2`, [lobbyCode, index]);
        return res.rows[0].id;
    } catch (error) {
        console.error("error selecting story id by index: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_SELECT_STORY_ID_BY_INDEX", message: "An error occurred while selecting story id by index"});
        return null;
    }
};

const dbInsertStory = async (db: (Pool | PoolClient), socket: Socket, lobbyCode: string, index: number, storyName: string) : Promise<boolean> => {
    try {
        await db.query(`INSERT INTO stories (index, lobby_code, name)
                        VALUES ($1, $2, $3)`, [index, lobbyCode, storyName]);
        return true;
    } catch (error) {
        console.error("error inserting story: " + error);
        socket.emit("error", {type: "DB_ERROR_INSERT_STORY", message: "An error occurred while inserting story"});
        return false;
    }
};


const dbInsertStoryElements = async (db: (Pool | PoolClient), socket: (Socket | null), elements: StoryElement[]): Promise<boolean> => {
    try {
        const query = `INSERT INTO story_elements (index, user_id, story_id, round, type, content)
                       VALUES ` + elements.map((_element, index) => `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`).join(', ');
        await db.query(query, elements.flatMap(element => [element.index, element.userId, element.storyId, element.round, element.type, element.content]));
        return true;
    } catch (error) {
        console.error("error inserting story elements: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_INSERT_STORY_ELEMENTS", message: "An error occurred while inserting story elements"});
        return false;
    }
};



const dbInsertLobby = async (db: (Pool | PoolClient), socket: Socket, lobby : Lobby): Promise<boolean> => {
    try {
        await db.query(`INSERT INTO lobbies (code, host_user_id, round, users_submitted, round_start_at, round_end_at)
                        VALUES ($1, $2, $3, $4, $5, $6)`,
            [lobby.code, lobby.hostUserId, lobby.round, lobby.usersSubmitted, lobby.roundStartAt, lobby.roundEndAt]);
        return true;
    }catch (error) {
        console.error("error creating lobby: " + error);
        socket.emit("error", {type: "DB_ERROR_CREATE_LOBBY", message: "An error occurred while creating lobby"});
        return false;
    }
}



const dbUpsertUser = async (db: (Pool | PoolClient), socket: Socket, user: User): Promise<boolean> => {
    try {
        await db.query(`INSERT INTO users (id, nickname, lobby_code)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (id) DO UPDATE SET nickname    = $2,
                                                       last_active = NOW()`, [user.id, user.nickname, user.lobbyCode]);
        return true;
    } catch (error) {
        console.error("error upserting user: " + error);
        socket.emit("error", {type: "DB_ERROR_UPSERT_USER", message: "An error occurred while upserting user"});
        return false;
    }
}



const dbUpdateUserLastActive = async (db: (Pool | PoolClient), socket: Socket, userId: string): Promise<boolean> => {
    try {
        await db.query(`UPDATE users
                        SET last_active = NOW()
                        WHERE id = $1`, [userId]);
        return true;
    } catch (error) {
        console.error("error updating user last active: " + error);
        socket.emit("error", {type: "DB_ERROR_UPDATE_USER_LAST_ACTIVE", message: "An error occurred while updating user last active"});
        return false;
    }
};


const dbUpdateUserLobbyCode = async (db: (Pool | PoolClient), socket: (Socket | null), userId: string, lobbyCode: string | null): Promise<boolean> => {
    try {
        if(lobbyCode === null) {
            await db.query(`UPDATE users
                            SET lobby_code = NULL
                            WHERE id = $1`, [userId]);
        } else {
            await db.query(`UPDATE users
                            SET lobby_code = $1
                            WHERE id = $2`, [lobbyCode, userId]);
        }
        return true;
    } catch (error) {
        console.error("error joining user to lobby: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_JOIN_USER_TO_LOBBY", message: "An error occurred while joining user to lobby"});
        return false;
    }
}


const dbUpdateLobbyHost = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string, hostUserId: string) : Promise<boolean> => {
    try {
        await db.query(`UPDATE lobbies
                        SET host_user_id = $1
                        WHERE code = $2`, [hostUserId, lobbyCode]);
        return true;
    }catch (error) {
        console.error("error updating lobby host: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_UPDATE_LOBBY_HOST", message: "An error occurred while updating lobby host"});
        return false;
    }
};


const dbUpdateLobbyUsersSubmittedIncrement = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string) : Promise<boolean> => {
    try {
        await db.query(`UPDATE lobbies
                        SET users_submitted = users_submitted + 1
                        WHERE code = $1`, [lobbyCode]);

        return true
    } catch (error) {
        console.error("error updating lobby users submitted: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_UPDATE_LOBBY_USERS_SUBMITTED", message: "An error occurred while updating lobby users submitted"});
        return false;

    }
};

const dbUpdateLobbyUsersSubmitted = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string, usersSubmitted: number) : Promise<boolean> => {
    try {
        await db.query(`UPDATE lobbies
                        SET users_submitted = $1
                        WHERE code = $2`, [usersSubmitted, lobbyCode]);
        return true;
    } catch (error) {
        console.error("error updating lobby users submitted: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_UPDATE_LOBBY_USERS_SUBMITTED", message: "An error occurred while updating lobby users submitted"});
        return false;
    }
};


const dbUpdateLobbyRound = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string, round: number, roundStartAt: (Date | null), roundEndAt: (Date | null)) : Promise<boolean> => {
    try {
        await db.query(`UPDATE lobbies
                        SET round = $1,
                            round_start_at = $2,
                            round_end_at = $3
                        WHERE code = $4`, [round, roundStartAt, roundEndAt, lobbyCode]);
        return true;
    } catch (error) {
        console.error("error updating lobby round: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_UPDATE_LOBBY_ROUND", message: "An error occurred while updating lobby round"});
        return false;
    }
}



const dbDeleteUser = async (db: (Pool | PoolClient), socket: (Socket | null), userId: string) : Promise<boolean> => {
    try {
        await db.query(`DELETE
                        FROM users
                        WHERE id = $1`, [userId]);
        return true;
    } catch (error) {
        console.error("error deleting user: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_DELETE_USER", message: "An error occurred while deleting user"});
        return false;
    }
};


const dbDeleteLobby = async (db: (Pool | PoolClient), socket: (Socket | null), lobbyCode: string) : Promise<boolean> => {
    try {
        await db.query(`DELETE
                        FROM lobbies
                        WHERE code = $1`, [lobbyCode]);
        return true;
    } catch (error) {
        console.error("error deleting lobby: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_DELETE_LOBBY", message: "An error occurred while deleting lobby"});
        return false;
    }

}
const dbDeleteAllStories = async (db: (Pool | PoolClient), socket: Socket, lobbyCode: string) : Promise<boolean> => {
    try {
        await db.query(`DELETE
                        FROM stories
                        WHERE lobby_code = $1`, [lobbyCode]);
        // story elements are deleted automatically due to the foreign key constraint
        return true;
    } catch (error) {
        console.error("error removing stories: " + error);
        socket.emit("error", {type: "DB_ERROR_REMOVE_STORIES", message: "An error occurred while removing stories"});
        return false;
    }
};

