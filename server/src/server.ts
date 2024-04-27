import {Lobby, Story, StoryElement, User} from "../../shared/sharedTypes";
import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server, Socket} from 'socket.io';
import {Pool} from 'pg';
import shuffleSeed from 'shuffle-seed';

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


io.on("connection", (socket) => {
    console.log("a user connected");
    socket.emit("connected", null);



    socket.on("connected", async (userId: string) => {
        // get user lobby
        const lobbyCode = await getUserLobbyCode(socket, userId);
        if (!lobbyCode) {
            console.log("user " + userId + " is not in a lobby");
        } else {
            const lobby = await getLobby(socket, lobbyCode);
            if (!lobby) return;
            console.log("user " + userId + " is in lobby " + lobbyCode);
            socket.join(lobbyCode);
            socket.emit("lobby info", lobby);
        }

    });



    socket.on("create lobby", async (userId: string, nickname: string) => {
        console.log("user " + userId + " sent create lobby request");
        // upsert user
        const user = await createOrUpdateUser(socket, userId, nickname);
        if (!user) return;
        console.log("user " + userId + " upserted");
        // create lobby
        const lobby = await createLobby(socket, userId);
        if (!lobby) return;
        console.log("lobby created with code " + lobby);

        // join lobby
        const newLobby = await userJoinLobby(socket, user, lobby);
        if (!newLobby) return;
        console.log("user " + userId + " joined lobby " + newLobby.code);
        socket.join(newLobby.code);
        //send lobby info to all users in lobby
        io.to(newLobby.code).emit("lobby info", newLobby);



    });




    socket.on("join lobby", async (userId: string, nickname: string, lobbyCode: string) => {
        console.log("user " + userId + "sent join lobby:" + lobbyCode + " request");
        // get lobby
        const lobby = await getLobby(socket, lobbyCode);
        if (!lobby) return;
        console.log("lobby " + lobbyCode + " fetched");
        // upsert user
        const user = await createOrUpdateUser(socket, userId, nickname);
        if (!user) return;
        console.log("user + " + userId + " upserted");
        // join lobby
        const newLobby = await userJoinLobby(socket, user, lobby);
        if (!newLobby) return;
        console.log("user " + userId + " joined lobby " + lobbyCode);

        socket.join(lobbyCode);

        //send lobby info to all users in lobby
        io.to(newLobby.code).emit("lobby info", newLobby);

    });



    socket.on("start game", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent start game request");
        // get lobby
        const lobby = await getLobby(socket, lobbyCode);
        if (!lobby) return;
        console.log("lobby " + lobbyCode + " fetched");

        // check if user is host
        if (lobby.hostUserId !== userId) {
            console.error("user " + userId + " is not host");
            socket.emit("error", {type: "USER_NOT_HOST", message: "Only the host can start the game"});
            return;
        }
        console.log("user " + userId + " is host");

        // update lobby round
        if (lobby.round !== 0) {
            console.error("lobby is already started");
            socket.emit("error", {type: "LOBBY_ALREADY_STARTED", message: "The game has already started"});
            return;
        }
        const newLobby = await incrementLobbyRound(socket, lobby);
        if (!newLobby) return;
        console.log("lobby round incremented to " + newLobby.round);

        // create all stories
        const users = newLobby.users;
        const storyNames = ["Once upon a time", "In a galaxy far far away", "A long time ago in a land of magic"];
        for (let i = 0; i < users.length; i++) {
            const storyName = storyNames[i % storyNames.length];
            if(!await createStory(socket, newLobby.code, i, storyName)) return;
        }


        io.to(newLobby.code).emit("lobby info", newLobby);

    });

    socket.on("story", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent story request");

        // get story
        const story = await getStoryForUser(socket, userId, lobbyCode);
        if (!story) return;
        console.log("story fetched");
        socket.emit("story", story);
    });


    socket.on("send story elements", async (userId: string, lobbyCode: string, storyId: number, elements: Array<StoryElement>) => {
        console.log("user " + userId + " sent story elements");
        // get lobby
        const lobby = await getLobby(socket, lobbyCode);
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

        // check if it's user's turn
        if (lobby.round !== elements.length) {
            console.error("not user's turn");
            socket.emit("error", {type: "NOT_USER_TURN", message: "It's not your turn"});
            return;
        }
        console.log("user " + userId + " sent correct number of elements");

        // insert story elements to db
        if (!await insertStoryElements(socket, elements)) return;
        console.log("story elements inserted");

        // increment lobby round
        const newLobby = await incrementLobbyRound(socket, lobby);
        if (!newLobby) return;
        console.log("lobby round incremented to " + newLobby.round);
        io.to(newLobby.code).emit("lobby info", newLobby);
    });



    socket.on("disconnect", () => {
        console.log("a user disconnected");
        if (socket.rooms.size > 1) {
            socket.rooms.forEach((room) => {
                if (room !== socket.id) {
                    socket.to(room).emit("user disconnected", socket.id);
                }
            });
        }
    });
});



    server.listen(4000, () => {
        console.log("Server is running on port 4000");
    });



const createStory = async (socket: Socket, lobbyCode: string, index: number, storyName: string) : Promise<boolean> => {
    try {
        await pool.query('INSERT INTO stories (index, lobby_code, name) VALUES ($1, $2, $3)', [index, lobbyCode, storyName]);
        return true;
    } catch (error) {
        console.error("error creating story: " + error);
        socket.emit("error", { type: "DB_ERROR_CREATE_STORY", message: "An error occurred while creating story" });
        return false;
    }
};



const getStoryElementsForUser = async (socket: Socket, index: number, userId: string, storyId : number) : Promise<Array<StoryElement> | null> => {
try {
        const res = await pool.query('SELECT * FROM story_elements WHERE index = $1 AND user_id = $2 AND story_id = $3', [index, userId, storyId]);
        return res.rows;
    } catch (error) {
        console.error("error getting story elements for user: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY_ELEMENTS_FOR_USER", message: "An error occurred while getting story elements for user" });
        return null;
    }
};


const getStoryElements = async (socket: Socket, storyId: number) : Promise<Array<StoryElement> | null> => {
    try {
        const res = await pool.query('SELECT * FROM story_elements WHERE story_id = $1', [storyId]);
        return res.rows;
    } catch (error) {
        console.error("error getting all story elements: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY_ELEMENTS", message: "An error occurred while getting all story elements" });
        return null;
    }
};
const getStory = async (socket: Socket, storyIndex: number, lobbyCode: string) : Promise<Story | null> => {
    try {
        const res = await pool.query('SELECT * FROM stories WHERE lobby_code = $1 AND index = $2', [lobbyCode, storyIndex]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("story not found");
            socket.emit("error", { type: "STORY_NOT_FOUND", message: "Story not found" });
            return null;
        }
        const story = data[0];
        const storyElements = await getStoryElements(socket, story.id);
        if (!storyElements) return null;
        return { id: story.id, index: story.index, lobbyCode: story.lobbyCode, name: story.name, elements: storyElements};
    } catch (error) {
        console.error("error getting story: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY", message: "An error occurred while getting story" });
        return null;
    }
};

const getStoryForUser = async (socket: Socket, userId: string, lobbyCode: string) : Promise<Story | null> => {
    try {
        // Get the current round for the lobby
        const res = await pool.query('SELECT round FROM lobbies WHERE code = $1', [lobbyCode]);
        const round = res.rows[0].round;
        if(round === 0) {
            console.error("game not started");
            socket.emit("error", { type: "GAME_NOT_STARTED", message: "The game has not started yet" });
            return null;
        }
        // shuffle the user order based on the lobby code
        const users = await getLobbyUsers(socket, lobbyCode);
        if (!users) return null;
        const shuffledUsers = shuffleSeed.shuffle(users, lobbyCode);
        // get the user index
        const userIndex = shuffledUsers.findIndex(user => user.id === userId);

        const storyIndex = userIndex + round % users.length;
        // get the story for the user
        const story = await getStory(socket, storyIndex, lobbyCode);
        if (!story) return null;
        return story;

    }catch (error) {
        console.error("error getting story for user: " + error);
        socket.emit("error", { type: "DB_ERROR_GET_STORY_FOR_USER", message: "An error occurred while getting story for user" });
        return null;
    }
};


const getLobbyUsers = async (socket: Socket, lobbyCode: string) => {
    try {
        const res = await pool.query('SELECT * FROM users WHERE lobby_code = $1', [lobbyCode]);
        return res.rows;

    } catch (error) {
        console.error('error fetching lobby users: ' + error);
        socket.emit('error', {
            type: 'DB_ERROR_FETCH_LOBBY_USERS',
            message: 'An error occurred while fetching the lobby users'
        });
        return null;
    }
};



const getLobby = async (socket: Socket, lobbyCode: string): Promise<Lobby | null> => {
    try {
        const res = await pool.query('SELECT * FROM lobbies WHERE code = $1', [lobbyCode]);
        const data = res.rows;
        if (!data || data.length === 0) {
            console.error("lobby not found");
            socket.emit("error", {type: "LOBBY_NOT_FOUND", message: "Lobby not found"});
            return null;
        }
        const users = await getLobbyUsers(socket, lobbyCode);
        if (!users) return null;
        return {code: lobbyCode, hostUserId: data[0].host_user_id, users: users, round: data[0].round};
    } catch (error) {
        console.error("error getting lobby: " + error);
        socket.emit("error", {type: "DB_ERROR_GET_LOBBY", message: "An error occurred while getting lobby"});
        return null;
    }
}



const insertStoryElements = async (socket: Socket, elements: Array<StoryElement>): Promise<boolean> => {
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



const getUserLobbyCode = async (socket: Socket, userId: string): Promise<string | null> => {
    try {
        const res = await pool.query('SELECT lobby_code FROM users WHERE id = $1', [userId]);
        const data = res.rows;
        if (!data || data.length === 0) {
            return '';
        }
        return data[0].lobby_code;

    } catch (error) {
        console.error("error checking if user is in lobby: " + error);
        socket.emit("error", {
            type: "DB_ERROR_CHECK_USER_IN_LOBBY",
            message: "An error occurred while checking if user is in lobby"
        });
        return null;
    }
};



const generateUniqueLobbyCode = async (): Promise<string | null> => {
    let unique = false;
    let lobbyCode = '';
    while (!unique) {
        lobbyCode = Math.random().toString(36).substring(2, 7);
        try {
            const res = await pool.query('SELECT COUNT(*) FROM lobbies WHERE code = $1', [lobbyCode]);
            const count = res.rows[0].count;
            unique = count == 0;
        } catch (error) {
            console.error("error checking if lobby code is unique: " + error);
            return null;
        }
    }
    return lobbyCode;
}



const createOrUpdateUser = async (socket: Socket, userId: string, nickname: string): Promise<User | null> => {
    try {
        await pool.query('INSERT INTO users (id, nickname) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET nickname = $2', [userId, nickname]);
    } catch (error) {
        console.error("error upserting user: " + error);
        socket.emit("error", {type: "DB_ERROR_UPSERT_USER", message: "An error occurred while upserting user"});
        return null;
    }
    return {id: userId, nickname: nickname};
}



const createLobby = async (socket: Socket, userId: string): Promise<Lobby | null> => {
    // generate unique lobby code
    const lobbyCode = await generateUniqueLobbyCode();
    if (!lobbyCode) {
        socket.emit("error", {type: "LOBBY_CODE_ERROR", message: "An error occurred while generating lobby code"});
        return null;
    }
    // insert lobby to db
    try {
        await pool.query('INSERT INTO lobbies (code, host_user_id) VALUES ($1, $2)', [lobbyCode, userId]);

        return {code: lobbyCode, hostUserId: userId, users: [], round: 0};
    } catch (error) {
        console.error("error creating lobby: " + error);
        socket.emit("error", {type: "DB_ERROR_CREATE_LOBBY", message: "An error occurred while creating lobby"});
        return null;
    }

}



const userJoinLobby = async (socket: Socket, user: User, lobby: Lobby): Promise<Lobby | null> => {
    // check if user already joined lobby
    try {
        const res = await pool.query('SELECT COUNT(*) FROM users WHERE id = $1 AND lobby_code IS NOT NULL', [user.id]);
        const count = res.rows[0].count;
        if (count > 0) {
            console.error("user " + user.id + " already joined a lobby");
            socket.emit("error", {type: "USER_ALREADY_JOINED_LOBBY", message: "User already joined a lobby"});
            return null;
        }
    }catch (error) {
        console.error("error checking if user already joined lobby: " + error);
        socket.emit("error", {type: "DB_ERROR_CHECK_USER_ALREADY_JOINED_LOBBY", message: "An error occurred while checking if user already joined lobby"});
        return null;
    }
    // insert user to lobby
    try {
        await pool.query('UPDATE users SET lobby_code = $1 WHERE id = $2', [lobby.code, user.id]);
    } catch (error) {
        console.error("error joining user to lobby: " + error);
        socket.emit("error", {type: "DB_ERROR_JOIN_USER_TO_LOBBY", message: "An error occurred while joining user to lobby"});
        return null;
    }

    lobby.users.push(user);
    return lobby;
}



const incrementLobbyRound = async (socket: Socket, lobby: Lobby) : Promise<Lobby | null> => {
    try {
        await pool.query('UPDATE lobbies SET round = round + 1 WHERE code = $1', [lobby.code]);
        lobby.round += 1;
        return lobby;
    } catch (error) {
        console.error("error incrementing lobby round: " + error);
        socket.emit("error", { type: "DB_ERROR_INCREMENT_LOBBY_STEP", message: "An error occurred while incrementing lobby round" });
        return null;
    }

}




