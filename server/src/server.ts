import {Lobby, Story, StoryElement, User} from "../../shared/sharedTypes";
import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server, Socket as BaseSocket} from 'socket.io';
import {Pool} from 'pg';
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


io.on("connection", (socket :Socket) => {
    console.log("a user connected");
    socket.emit("connected");



    socket.on("get lobby", async (userId: string) => {
        console.log("user " + userId + " sent get lobby request");
        socket.userId = userId;

        // get user lobby
        const lobbyCode = await dbSelectUserLobbyCode(socket, userId);
        if (!lobbyCode) {
            console.log("user " + userId + " is not in a lobby");
        } else {
            const lobby = await dbSelectLobby(socket, lobbyCode);
            if (!lobby) return;
            console.log("user " + userId + " is in lobby " + lobbyCode);
            socket.join(lobbyCode);
            socket.emit("lobby info", lobby);
        }

    });



    socket.on("create lobby", async (userId: string, nickname: string) => {
        console.log("user " + userId + " sent create lobby request");

        // upsert user
        const user : User = {id: userId, nickname: nickname}
        if (!await dbUpsertUser(socket, user)) return;
        console.log("user " + userId + " upserted");

        // update user last active
        if (!await dbUpdateUserLastActive(socket, userId)) return;

        // generate unique lobby code
        const lobbyCode = await generateUniqueLobbyCode(socket);
        if (!lobbyCode) return null;

        // insert lobby
        const lobby : Lobby = {code: lobbyCode, hostUserId: userId, users: [], round: 0, usersSubmitted: 0};
        if(!await dbInsertLobby(socket, lobby)) return;
        console.log("lobby created with code " + lobby);

        // join lobby
        if (!await dbUpdateUserLobbyCode(socket, userId, lobbyCode)) return;
        lobby.users.push(user);
        socket.join(lobbyCode);
        console.log("user " + userId + " joined lobby " + lobbyCode);


        //send lobby info to all users in lobby
        io.to(lobbyCode).emit("lobby info", lobby);
    });




    socket.on("join lobby", async (userId: string, nickname: string, lobbyCode: string) => {
        console.log("user " + userId + "sent join lobby:" + lobbyCode + " request");

        // get lobby
        const lobby = await dbSelectLobby(socket, lobbyCode);
        if (!lobby) return;
        console.log("lobby " + lobbyCode + " fetched");

        // upsert user
        const user = {id: userId, nickname: nickname};
        if (!await dbUpsertUser(socket, user)) return;
        console.log("user " + userId + " upserted");

        // update user last active
        if (!await dbUpdateUserLastActive(socket, userId)) return;

        // join lobby
        if (!await dbUpdateUserLobbyCode(socket, userId, lobbyCode)) return;
        lobby.users.push(user);
        socket.join(lobbyCode);
        console.log("user " + userId + " joined lobby " + lobbyCode);

        //send lobby info to all users in lobby
        io.to(lobbyCode).emit("lobby info", lobby);

    });



    socket.on("start game", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent start game request");
        // update user last active
        if (!await dbUpdateUserLastActive(socket, userId)) return;

        // get lobby
        const lobby = await dbSelectLobby(socket, lobbyCode);
        if (!lobby) return;
        console.log("lobby " + lobbyCode + " fetched");

        // check if user is host
        if (lobby.hostUserId !== userId) {
            console.error("error starting game: user " + userId + " is not host");
            socket.emit("error", {type: "START_GAME_NOT_HOST", message: "Only the host can start the game"});
            return;
        }
        console.log("user " + userId + " is host");

        // check if lobby is already started
        if (lobby.round !== 0) {
            console.error("error starting game: game already started");
            socket.emit("error", {type: "GAME_ALREADY_STARTED", message: "The game has already started"});
            return;
        }

        // update lobby round
        const newLobbyRound = lobby.round + 1;
        if (!await dbUpdateLobbyRound(socket, lobbyCode, newLobbyRound)) return;
        lobby.round = newLobbyRound;
        console.log("lobby round incremented to " + newLobbyRound);

        // create all stories
        const users = lobby.users;
        const storyNames = ["Once upon a time", "In a galaxy far far away", "A long time ago in a land of magic", "In a world of mystery", "In a land of dragons", "In a kingdom of knights"];
        for (let i = 0; i < users.length; i++) {
            const storyName = storyNames[i % storyNames.length];
            if(!await dbInsertStory(socket, lobbyCode, i, storyName)) return;
        }

        io.to(lobbyCode).emit("lobby info", lobby);

    });

    socket.on("get story", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent story request");
        // update user last active
        if (!await dbUpdateUserLastActive(socket, userId)) return;

        // Get the current round for the lobby
        const round = await dbSelectLobbyRound(socket, lobbyCode);
        if (!round) return;
        console.log("round fetched");

        // check if user is in lobby
        const userLobbyCode = await dbSelectUserLobbyCode(socket, userId);
        if (userLobbyCode !== lobbyCode) {
            console.error("user " + userId + " is not in lobby " + lobbyCode);
            socket.emit("error", {type: "USER_NOT_IN_LOBBY", message: "User is not in lobby"});
            return;
        }
        console.log("user " + userId + " is in lobby " + lobbyCode);

        // shuffle the user order based on the lobby code
        const users = await dbSelectUsersForLobby(socket, lobbyCode);
        if (!users) return null;
        const shuffledUsers = shuffleSeed.shuffle(users, lobbyCode);
        // get the user index
        const userIndex = shuffledUsers.findIndex(user => user.id === userId);
        const storyIndex = (userIndex + 1 + round) % users.length;
        // get the story for the user
        const story = await dbSelectStoryWithIndex(socket, storyIndex, lobbyCode);
        if (!story) return;
        console.log("story fetched");
        socket.emit("story", story);
    });






    socket.on("next story", async (userId: string, lobbyCode: string, index: number) => {
        console.log("user " + userId + " sent next story request");
        // update user last active
        if (!await dbUpdateUserLastActive(socket, userId)) return;

        const story = await dbSelectStoryByIndex(socket, lobbyCode, index);
        if (!story) return;
        console.log("story fetched");
        io.to(lobbyCode).emit("next story", story);
    });


    socket.on("story elements", async (userId: string, lobbyCode: string, storyId: number, elements: StoryElement[]) => {
        console.log("user " + userId + " sent story elements");
        // update user last active
        if (!await dbUpdateUserLastActive(socket, userId)) return;

        // get lobby
        const lobby = await dbSelectLobby(socket, lobbyCode);
        if (!lobby) return;
        console.log("lobby " + lobbyCode + " fetched");

        // check if user is in lobby
        const userInLobby = lobby.users.find(user => user.id === userId);
        if (!userInLobby) {
            console.error("user " + userId + " is not in lobby " + lobbyCode);
            socket.emit("error", {type: "USER_NOT_IN_LOBBY", message: "User is not in lobby"});
            return;
        }
        console.log("user " + userId + " is in lobby " + lobbyCode);

        // insert story elements to db
        if (!await dbInsertStoryElements(socket, elements)) return;
        console.log("story elements inserted");

        // check if all users have submitted their story elements
        let newLobby : (Lobby | null) = lobby;
        if (newLobby.usersSubmitted + 1 < newLobby.users.length) {
            console.log("not all users have submitted their story elements");
            // update users submitted
            if(!await dbUpdateLobbyUsersSubmitted(socket, lobbyCode, newLobby.usersSubmitted + 1)) return;
            newLobby.usersSubmitted++;
            console.log("users submitted incremented to " + newLobby.usersSubmitted);
        }else {
            console.log("all users have submitted their story elements");
            // reset users submitted
            if(!await dbUpdateLobbyUsersSubmitted(socket, lobbyCode, 0)) return;
            newLobby.usersSubmitted = 0;
            // proceed to the next round
            const newLobbyRound = lobby.round + 1;
            if (!await dbUpdateLobbyRound(socket, lobbyCode, newLobbyRound)) return;
            lobby.round = newLobbyRound;
            console.log("lobby round incremented to " + newLobbyRound);
        }
        io.to(newLobby.code).emit("lobby info", newLobby);
        console.log("lobby info sent");
    });





    socket.on("end game", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent end game request");
        // update user last active
        if (!await dbUpdateUserLastActive(socket, userId)) return;

        // get lobby
        const lobby = await dbSelectLobby(socket, lobbyCode);
        if (!lobby) return;
        console.log("lobby " + lobbyCode + " fetched");

        // check if user is host
        if (lobby.hostUserId !== userId) {
            console.error("user " + userId + " is not host");
            socket.emit("error", {type: "USER_NOT_HOST", message: "Only the host can end the game"});
            return;
        }
        console.log("user " + userId + " is host");

        // remove all stories and story elements
        if(!await dbDeleteAllStories(socket, lobbyCode)) return;

        // reset lobby round
        if(!await dbUpdateLobbyRound(socket, lobbyCode, 0)) return;

        console.log("game ended");
        io.to(lobbyCode).emit("end game");

    });


    socket.on("disconnect", async () => {
        console.log("user disconnected");
        // // if user is in a lobby and a game is in progress leave him in the lobby else remove him from the lobby
        // if(!socket.userId) return;
        // const lobbyCode = await dbSelectUserLobbyCode(socket, socket.userId);
        // if (!lobbyCode) return;
        //
        //
        // const lobby = await dbSelectLobby(socket, lobbyCode);
        // if (!lobby) return;
        //
        // const otherUser = lobby.users.find(user => user.id !== socket.userId);
        //
        // // if user is host change host
        // if (lobby.hostUserId === socket.userId) {
        //     if (otherUser) {
        //         if (!await dbUpdateLobbyHost(socket, lobbyCode, otherUser.id)) return;
        //         console.log("host changed to " + otherUser.id);
        //     }
        // }
        //
        // // if game is in progress leave user in lobby
        // if (lobby.round != 0) return;
        //
        // // remove user from lobby
        // if (!await dbUpdateUserLobbyCode(socket, socket.userId, null)) return;
        // console.log("user " + + " removed from lobby " + lobbyCode);
        //
        // // remove lobby if user is the last one
        // if(!otherUser) {
        //     if (!await dbDeleteLobby(socket, lobbyCode)) return;
        //     console.log("lobby " + lobbyCode + " removed");
        // }
        //
        // // remove user from db
        // if (!await dbDeleteUser(socket, socket.userId)) return;
        // console.log("user " + socket.userId+ " removed from db");
        //
        // lobby.users = lobby.users.filter(user => user.id !== socket.userId);
        // io.to(lobbyCode).emit("lobby info", lobby);
    });
});



server.listen(4000, () => {
    console.log("Server is running on port 4000");
});

setInterval(async () => {
    // Get all users who haven't been active for 5 minutes
    const inactiveUsers = await dbSelectInactiveUsers(null,5);

    // Remove each inactive user
    for (const inactiveUser of inactiveUsers) {
        const lobbyCode = await dbSelectUserLobbyCode(null, inactiveUser.id);
        if (!lobbyCode) return;


        const lobby = await dbSelectLobby(null, lobbyCode);
        if (!lobby) return;

        const otherUser = lobby.users.find(user => user.id !== inactiveUser.id);

        // if user is host change host
        if (lobby.hostUserId === inactiveUser.id) {
            if (otherUser) {
                if (!await dbUpdateLobbyHost(null, lobbyCode, otherUser.id)) return;
                console.log("host changed to " + otherUser.id);
            }
        }

        // if game is in progress leave user in lobby
        if (lobby.round != 0) return;

        // remove user from lobby
        if (!await dbUpdateUserLobbyCode(null, inactiveUser.id, null)) return;
        console.log("user " + + " removed from lobby " + lobbyCode);

        // remove lobby if user is the last one
        if(!otherUser) {
            if (!await dbDeleteLobby(null, lobbyCode)) return;
            console.log("lobby " + lobbyCode + " removed");
        }

        // remove user from db
        if (!await dbDeleteUser(null, inactiveUser.id)) return;
        console.log("user " + inactiveUser.id + " removed from db");

        lobby.users = lobby.users.filter(user => user.id !== inactiveUser.id);
        io.to(lobbyCode).emit("lobby info", lobby);
    }
},  2 * 60 * 1000); // Run every 2 minutes



// Add a new function to update the lastActive timestamp in the database
const dbUpdateUserLastActive = async (socket: Socket, userId: string): Promise<boolean> => {
    try {
        await pool.query('UPDATE users SET last_active = NOW() WHERE id = $1', [userId]);
        return true;
    } catch (error) {
        console.error("error updating user last active: " + error);
        socket.emit("error", {type: "DB_ERROR_UPDATE_USER_LAST_ACTIVE", message: "An error occurred while updating user last active"});
        return false;
    }
};

// Add a new function to get all users who haven't been active for a certain number of minutes
const dbSelectInactiveUsers = async (socket: (Socket | null), minutes: number): Promise<User[]> => {
    try {
        const interval = `${minutes} minutes`;
        const res = await pool.query(`SELECT * FROM users WHERE NOW() - last_active > INTERVAL '${interval}'`);
        const data = res.rows;
        return data.map(row => ({id: row.id, nickname: row.nickname, lobbyCode: row.lobby_code, lastActive: row.last_active}));
    } catch (error) {
        console.error("error selecting inactive users: " + error);
        if (socket)
            socket.emit("error", {type: "DB_ERROR_SELECT_INACTIVE_USERS", message: "An error occurred while selecting inactive users"});
        return [];
    }
};

const dbDeleteUser = async (socket: (Socket | null), userId: string) : Promise<boolean> => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        return true;
    } catch (error) {
        console.error("error deleting user: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_DELETE_USER", message: "An error occurred while deleting user"});
        return false;
    }
};


const dbDeleteLobby = async (socket: (Socket | null), lobbyCode: string) : Promise<boolean> => {
    try {
        await pool.query('DELETE FROM lobbies WHERE code = $1', [lobbyCode]);
        return true;
    } catch (error) {
        console.error("error deleting lobby: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_DELETE_LOBBY", message: "An error occurred while deleting lobby"});
        return false;
    }

}


const dbUpdateLobbyHost = async (socket: (Socket | null), lobbyCode: string, hostUserId: string) : Promise<boolean> => {
    try {
        await pool.query('UPDATE lobbies SET host_user_id = $1 WHERE code = $2', [hostUserId, lobbyCode]);
        return true;
    } catch (error) {
        console.error("error updating lobby host: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_UPDATE_LOBBY_HOST", message: "An error occurred while updating lobby host"});
        return false;
    }
};



const dbSelectStoryByIndex = async (socket: Socket, lobbyCode: string, index: number) : Promise<Story | null> => {
    try {
        const res = await pool.query('SELECT * FROM stories WHERE lobby_code = $1 AND index = $2', [lobbyCode, index]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("story not found by index");
            socket.emit("error", {type: "STORY_NOT_FOUND_BY_INDEX", message: "Story not found by index"});
            return null;
        }
        const story = data[0];
        const storyElements = await dbSelectStoryElements(socket, story.id);
        if (!storyElements) return null;
        return {id: story.id, index: story.index, lobbyCode: story.lobbyCode, name: story.name, elements: storyElements};
    } catch (error) {
        console.error("error getting story by index: " + error);
        socket.emit("error", {type: "DB_ERROR_GET_STORY_BY_INDEX", message: "An error occurred while getting story by index"});
        return null;
    }
};

const dbUpdateLobbyUsersSubmitted = async (socket: Socket, lobbyCode: string, usersSubmitted: number) : Promise<boolean> => {
    try {
        await pool.query('UPDATE lobbies SET users_submitted = $1 WHERE code = $2', [usersSubmitted, lobbyCode]);
        return true;
    } catch (error) {
        console.error("error updating lobby users submitted: " + error);
        socket.emit("error", { type: "DB_ERROR_UPDATE_LOBBY_USERS_SUBMITTED", message: "An error occurred while updating lobby users submitted" });
        return false;
    }
};


const dbInsertStory = async (socket: Socket, lobbyCode: string, index: number, storyName: string) : Promise<boolean> => {
    try {
        await pool.query('INSERT INTO stories (index, lobby_code, name) VALUES ($1, $2, $3)', [index, lobbyCode, storyName]);
        return true;
    } catch (error) {
        console.error("error inserting story: " + error);
        socket.emit("error", {type: "DB_ERROR_INSERT_STORY", message: "An error occurred while inserting story"});
        return false;
    }
};

const dbSelectLobbyRound = async (socket: Socket, lobbyCode: string) : Promise<number | null> => {
    try {
        const res = await pool.query('SELECT round FROM lobbies WHERE code = $1', [lobbyCode]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("lobby not found");
            socket.emit("error", {type: "LOBBY_NOT_FOUND", message: "Lobby not found"});
            return null;
        }
        return data[0].round;
    } catch (error) {
        console.error("error getting round: " + error);
        socket.emit("error", {type: "DB_ERROR_GET_ROUND", message: "An error occurred while getting round"});
        return null;
    }
};


const dbSelectStoryElements = async (socket: Socket, storyId: number) : Promise<StoryElement[] | null> => {
    try {
        const res = await pool.query('SELECT * FROM story_elements WHERE story_id = $1', [storyId]);
        const data = res.rows;
        return data.map(row => ({index: row.index, userId: row.user_id, storyId: row.story_id, type: row.type, content: row.content}));
    } catch (error) {
        console.error("error getting all story elements: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY_ELEMENTS", message: "An error occurred while getting all story elements" });
        return null;
    }
};
const dbSelectStoryWithIndex = async (socket: Socket, storyIndex: number, lobbyCode: string) : Promise<Story | null> => {
    try {
        const res = await pool.query('SELECT * FROM stories WHERE lobby_code = $1 AND index = $2', [lobbyCode, storyIndex]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("story not found");
            socket.emit("error", { type: "STORY_NOT_FOUND", message: "Story not found" });
            return null;
        }
        const story = data[0];
        const storyElements = await dbSelectStoryElements(socket, story.id);
        if (!storyElements) return null;
        return { id: story.id, index: story.index, lobbyCode: story.lobbyCode, name: story.name, elements: storyElements};
    } catch (error) {
        console.error("error getting story: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY", message: "An error occurred while getting story" });
        return null;
    }
};


const dbDeleteAllStories = async (socket: Socket, lobbyCode: string) : Promise<boolean> => {
    try {
        await pool.query('DELETE FROM stories WHERE lobby_code = $1', [lobbyCode]);
        // story elements are deleted automatically due to the foreign key constraint
        return true;
    } catch (error) {
        console.error("error removing stories: " + error);
        socket.emit("error", {type: "DB_ERROR_REMOVE_STORIES", message: "An error occurred while removing stories"});
        return false;
    }
};

const dbSelectUsersForLobby = async (socket: (Socket | null), lobbyCode: string) : Promise<User[] | null>=> {
    try {
        const res = await pool.query('SELECT * FROM users WHERE lobby_code = $1 ORDER BY created_at', [lobbyCode]);
        const data = res.rows;
        return data.map(row => ({id: row.id, nickname: row.nickname, lobbyCode: row.lobby_code}));
    } catch (error) {
        console.error('error fetching lobby users: ' + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_FETCH_USERS", message: "An error occurred while fetching lobby users"});
        return null;
    }
};



const dbSelectLobby = async (socket: (Socket | null), lobbyCode: string): Promise<Lobby | null> => {
    try {
        const res = await pool.query('SELECT * FROM lobbies WHERE code = $1', [lobbyCode]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("lobby not found");
            if(socket)
                socket.emit("error", {type: "LOBBY_NOT_FOUND", message: "Lobby not found"});
            return null;
        }
        const users = await dbSelectUsersForLobby(socket, lobbyCode);
        if (!users) return null;
        return {code: lobbyCode, hostUserId: data[0].host_user_id, users: users, round: data[0].round , usersSubmitted: data[0].users_submitted};
    } catch (error) {
        console.error("error getting lobby: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_GET_LOBBY", message: "An error occurred while getting lobby"});
        return null;
    }
}



const dbInsertStoryElements = async (socket: Socket, elements: StoryElement[]): Promise<boolean> => {
    try {
        const query = 'INSERT INTO story_elements (index, user_id, story_id, type, content) VALUES ' + elements.map((_element, index) => `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`).join(', ');
        await pool.query(query, elements.flatMap(element => [element.index, element.userId, element.storyId, element.type, element.content]));
        return true;
    } catch (error) {
        console.error("error inserting story elements: " + error);
        socket.emit("error", { type: "DB_ERROR_INSERT_STORY_ELEMENTS", message: "An error occurred while inserting story elements" });
        return false;
    }
};


const dbSelectUserLobbyCode = async (socket: (Socket | null), userId: string): Promise<string | null> => {
    try {
        const res = await pool.query('SELECT lobby_code FROM users WHERE id = $1', [userId]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("user not found");
            if(socket)
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



const generateUniqueLobbyCode = async (socket: Socket): Promise<string | null> => {
    let unique = false;
    let lobbyCode = '';
    while (!unique) {
        lobbyCode = Math.random().toString(36).substring(2, 7);
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



const dbUpsertUser = async (socket: Socket, user: User): Promise<boolean> => {
    try {
        await pool.query('INSERT INTO users (id, nickname) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET nickname = $2', [user.id, user.nickname]);
        return true;
    } catch (error) {
        console.error("error upserting user: " + error);
        socket.emit("error", {type: "DB_ERROR_UPSERT_USER", message: "An error occurred while upserting user"});
        return false;
    }
}



const dbInsertLobby = async (socket: Socket, lobby : Lobby): Promise<boolean> => {
    try {
        await pool.query('INSERT INTO lobbies (code, host_user_id, round, users_submitted) VALUES ($1, $2, $3, $4)',
            [lobby.code, lobby.hostUserId, lobby.round, lobby.usersSubmitted]);
        return true;
    } catch (error) {
        console.error("error creating lobby: " + error);
        socket.emit("error", {type: "DB_ERROR_CREATE_LOBBY", message: "An error occurred while creating lobby"});
        return false;
    }
}



const dbUpdateUserLobbyCode = async (socket: (Socket | null), userId: string, lobbyCode: string | null): Promise<boolean> => {
    try {
        if(lobbyCode === null) {
            await pool.query('UPDATE users SET lobby_code = NULL WHERE id = $1', [userId]);
        } else {
            await pool.query('UPDATE users SET lobby_code = $1 WHERE id = $2', [lobbyCode, userId]);
        }
        return true;
    } catch (error) {
        console.error("error joining user to lobby: " + error);
        if(socket)
            socket.emit("error", {type: "DB_ERROR_JOIN_USER_TO_LOBBY", message: "An error occurred while joining user to lobby"});
        return false;
    }
}



const dbUpdateLobbyRound = async (socket: Socket, lobbyCode: string, round: number) : Promise<boolean> => {
    try {
        await pool.query('UPDATE lobbies SET round = $1 WHERE code = $2', [round, lobbyCode]);
        return true;
    } catch (error) {
        console.error("error updating lobby round: " + error);
        socket.emit("error", {type: "DB_ERROR_UPDATE_LOBBY_ROUND", message: "An error occurred while updating lobby round"});
        return false;
    }
}




