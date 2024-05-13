import {Lobby, processOp, StoryElement} from "../../shared/sharedTypes";
import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server, Socket as BaseSocket} from 'socket.io';
import {Pool} from 'pg';
import {dbSelectStoryByIndex, dbUpdateUserLastActive} from "./db";
import {
    checkInactiveUsers,
    createLobby,
    endGame,
    getLobbyForUser,
    getStory,
    joinLobby,
    leaveLobby,
    startRound, setLobbyTimeout,
    startGame,
    submitStoryElements,
    waitForRound
} from "./gameManager";

const USERS_TIMEOUT_MILLISECONDS = 10 * 1000;
const INACTIVE_USERS_CHECK_MILLISECONDS = 2 * 60 * 1000;

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
        socket.userId = userId;
        console.log("user " + userId + " sent get lobby request");

        const lobbyRes = await processOp( () =>
            getLobbyForUser(pool, userId)
        );
        if (!lobbyRes.success) {
            socket.emit("error", lobbyRes.error);
            return;
        }

        const lobby = lobbyRes.data;
        if(lobby) {
            socket.join(lobby.code);
            socket.emit("lobby info", lobby);
            console.log("lobby info sent to " + userId);
        }
    });



    socket.on("create lobby", async (userId: string, nickname: string) => {
        console.log("user " + userId + " sent create lobby request");

        const lobbyRes = await processOp( () =>
            createLobby(pool, userId, nickname)
        );

        if(!lobbyRes.success || !lobbyRes.data) {
            socket.emit("error", lobbyRes.error);
            return;
        }
        const lobby = lobbyRes.data;
        socket.join(lobby.code);
        io.to(lobby.code).emit("lobby info", lobby);

        console.log("user " + userId + " created lobby " + lobby.code);
    });




    socket.on("join lobby", async (userId: string, nickname: string, lobbyCode: string) => {

        console.log("user " + userId + "sent join lobby:" + lobbyCode + " request");

        const lobbyRes = await processOp( () =>
            joinLobby(pool, userId, nickname, lobbyCode));
        if (!lobbyRes.success || !lobbyRes.data) {
            socket.emit("error", lobbyRes.error);
            return;
        }
        const lobby = lobbyRes.data;
        socket.join(lobby.code);
        io.to(lobby.code).emit("lobby info", lobby);
        console.log("user " + userId + " joined lobby " + lobby.code);
    });


    socket.on("leave lobby", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent leave lobby:" + lobbyCode + " request");

        // update user last active
        const userLastActiveRes = await processOp( () =>
            dbUpdateUserLastActive(pool, userId)
        );
        if (!userLastActiveRes.success) {
            socket.emit("error", userLastActiveRes.error);
            return;
        }
        const lobbyRes = await processOp( () =>
            leaveLobby(pool, userId, lobbyCode)
        );
        if (!lobbyRes.success) {
            socket.emit("error", lobbyRes.error);
            return;
        }

        const lobby = lobbyRes.data;
        if(lobby) {
            socket.leave(lobby.code);
            io.to(lobby.code).emit("lobby info", lobby);
        }
        socket.emit("lobby info", null);
        console.log("user " + userId + " left lobby " + lobbyCode);
    });


    socket.on("start game", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent start game request");
        const userLastActiveRes = await processOp( () =>
            dbUpdateUserLastActive(pool, userId)
        );
        if (!userLastActiveRes.success) {
            socket.emit("error", userLastActiveRes.error);
            return;
        }

        const lobbyRes = await processOp( () =>
            startGame(pool, userId, lobbyCode)
        );
        if (!lobbyRes.success || !lobbyRes.data) {
            socket.emit("error", lobbyRes.error);
            return;
        }

        const lobby = lobbyRes.data;
        io.to(lobbyCode).emit("lobby info", lobby);
        console.log("started game in lobby " + lobbyCode);

        await startNewRound(pool, lobbyCode);

    });



    socket.on("story elements", async (userId: string, lobbyCode: string, elements: StoryElement[]) => {
        console.log("user " + userId + " sent story elements");

        const userLastActiveRes = await processOp( () =>
            dbUpdateUserLastActive(pool, userId)
        );
        if (!userLastActiveRes.success) {
            socket.emit("error", userLastActiveRes.error);
            return;
        }

        const lobbyRes = await processOp( () =>
            submitStoryElements(pool, userId, lobbyCode, elements)
        );

        if (!lobbyRes.success || !lobbyRes.data) {
            socket.emit("error", lobbyRes.error);
            return;
        }
        const lobby = lobbyRes.data;

        io.to(lobbyCode).emit("users submitted", lobby.usersSubmitted);
        console.log("story elements sent by " + userId + " in lobby " + lobbyCode)


        if(lobby.usersSubmitted >= lobby.users.length) {
            await startNewRound(pool, lobbyCode);
        }
    });





    socket.on("end game", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent end game request");
        const userLastActiveRes = await processOp( () =>
            dbUpdateUserLastActive(pool, userId)
        );
        if (!userLastActiveRes.success) {
            socket.emit("error", userLastActiveRes.error);
            return;
        }

        const lobbyRes = await processOp( () =>
            endGame(pool,userId, lobbyCode)
        );
        if (!lobbyRes.success || !lobbyRes.data) {
            socket.emit("error", lobbyRes.error);
            return;
        }
        const lobby = lobbyRes.data;
        io.to(lobby.code).emit("lobby info", lobby);
        console.log("game ended in lobby " + lobby.code);
    });


    socket.on("get story", async (userId: string, lobbyCode: string) => {
        console.log("user " + userId + " sent get story request");

        const userLastActiveRes = await processOp( () =>
            dbUpdateUserLastActive(pool, userId)
        );
        if (!userLastActiveRes.success) {
            socket.emit("error", userLastActiveRes.error);
            return;
        }

        const storyRes = await processOp( () =>
            getStory(pool, userId, lobbyCode)
        );
        if (!storyRes.success || !storyRes.data) {
            socket.emit("error", storyRes.error);
            return;
        }
        const story = storyRes.data;

        socket.emit("story", story);
        console.log("story sent to " + userId);
    });




    socket.on("next story", async (userId: string, lobbyCode: string, index: number) => {
            console.log("user " + userId + " sent next story request from " + lobbyCode + " with index " + index);
        // update user last active
        const userLastActiveRes = await processOp( () =>
            dbUpdateUserLastActive(pool, userId)
        );
        if (!userLastActiveRes.success) {
            socket.emit("error", userLastActiveRes.error);
            return;
        }

        const storyRes = await processOp( () =>
            dbSelectStoryByIndex(pool, lobbyCode, index)
        );
        if (!storyRes.success || !storyRes.data) {
            socket.emit("error", storyRes.error);
            return;
        }
        const story = storyRes.data;

        io.to(story.lobbyCode).emit("next story", story);
        console.log("story sent to " + userId + " in lobby " + story.lobbyCode + " with index " + index);

    });


    socket.on("disconnect", async () => {
        console.log("user disconnected");

    });
});



server.listen(4000, () => {
    console.log("Server is running on port 4000");
});

setInterval(async () => {

    console.log("checking for inactive users");

    const activeLobbiesRes = await processOp(() =>
        checkInactiveUsers(pool)
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

},  INACTIVE_USERS_CHECK_MILLISECONDS)
// Run every 2 minutes

const startNewRound = async (pool: Pool, lobbyCode: string) => {

    const lobbyRes = await processOp(() =>
        startRound(pool, lobbyCode)
    )
    if (!lobbyRes.success || !lobbyRes.data) {
        console.error("error starting new round: " + lobbyRes.error);
        return;
    }
    const lobby = lobbyRes.data;

    io.to(lobby.code).emit("lobby info", lobby);
    if (lobby.round > 0) waitForRound(pool, lobby);
};

export const endRound = (pool: Pool, lobby: Lobby) => {
    io.to(lobby.code).emit("get story elements");
    setLobbyTimeout(lobby.code, setTimeout(async () => {
        await startNewRound(pool, lobby.code);
    }, USERS_TIMEOUT_MILLISECONDS));
};