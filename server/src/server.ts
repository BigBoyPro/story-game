require('dotenv').config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;


import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server, Socket} from 'socket.io';
import {createClient} from "@supabase/supabase-js";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    socket.on("create lobby", async (userId, nickname) => {
        console.log("user " + userId + "sent create lobby request");
        // upsert user
        if(!await upsertUser(socket, userId, nickname)) return;
        console.log("user " + userId + " upserted");
        // create lobby
        const lobbyCode = await createLobby(socket, userId);
        if(!lobbyCode) return;
        console.log("lobby created with code " + lobbyCode);

        // join lobby
        if(!await userJoinLobby(socket, userId, lobbyCode)) return;
        console.log("user " + userId + " joined lobby " + lobbyCode);
    });



    socket.on("join lobby", async (userId, nickname, lobbyCode) => {
        console.log("user " + userId + "sent  join lobby:" + lobbyCode + " request");
        // upsert user
        if(!await upsertUser(socket, userId, nickname)) return;
        console.log("user + " + userId + " upserted");
        // join lobby
        if(!await userJoinLobby(socket, userId, lobbyCode)) return;
        console.log("user " + userId + " joined lobby " + lobbyCode);
    });

    socket.on("disconnect", () => {
        console.log("a user disconnected");
    });
});

server.listen(4000, () => {
    console.log("Server is running on port 4000");
});




const generateUniqueLobbyCode = async (): Promise<string> => {
    let unique = false;
    let lobbyCode = '';
    while (!unique) {
        lobbyCode = Math.random().toString(36).substring(2, 7);
        const { count } = await supabase.from("lobbies").select("code").eq("code", lobbyCode);
        if (!count || count === 0) {
            unique = true;
        }
    }
    return lobbyCode;
}

const upsertUser = async (socket : Socket, userId : string, nickname : string) : Promise<boolean> => {
    const {data, error} = await supabase.from("users").upsert({ id: userId, nickname: nickname }).select();
    if(error || !data) {
        console.error("error upserting user: " + error);
        socket.emit("error", { type: "DB_ERROR_UPSERT_USER", message: "An error occurred while upserting user" });
        return false;
    }
    return true;
}

const createLobby = async (socket : Socket, userId : string) : Promise<string | null> => {
    // generate unique lobby code
    const lobbyCode = await generateUniqueLobbyCode();
    // insert lobby to db
    const { data, error } = await supabase.from("lobbies").insert({ code: lobbyCode, host_user_id: userId }).select();
    if (error || !data) {
        console.error("error creating lobby: " + error);
        socket.emit("error", { type: "DB_ERROR_CREATE_LOBBY", message: "An error occurred while creating lobby" });
        return null;
    }
    return lobbyCode;
}

const userJoinLobby = async (socket : Socket, userId : string, lobbyCode : string) : Promise<boolean>  => {
    // check if lobby exists
    const { count } = await supabase.from("lobbies").select("code").eq("code", lobbyCode);
    if (count === 0) {
        console.error("lobby not found");
        socket.emit("error", { type: "LOBBY_NOT_FOUND", message: "Lobby not found" });
        return false;
    }

    // check if user already joined lobby
    const { count: userCount } = await supabase.from("lobby_users").select("user_id").eq("user_id", userId);
    if (userCount && userCount > 0) {
        console.error("user already joined lobby");
        socket.emit("error", { type: "USER_ALREADY_IN_LOBBY", message: "User already joined a lobby" });
        return false;
    }

    // insert user to lobby_users
    const { data, error } = await supabase.from("lobby_users").insert({ user_id: userId, lobby_code: lobbyCode }).select();
    if (error || !data) {
        console.error("error user joining lobby: " + error);
        socket.emit("error", { type: "DB_ERROR_USER_JOIN_LOBBY", message: "An error occurred while user joining lobby" });
        return false;
    }

    // join socket room
    socket.join(lobbyCode);
    return true;
}

