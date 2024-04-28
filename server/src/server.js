"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const supabase_js_1 = require("@supabase/supabase-js");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // replace with your client's origin
        methods: ["GET", "POST"]
    }
});
io.on("connection", (socket) => {
    console.log("a user connected");
    socket.emit("connected", null);
    socket.on("connected", (userId) => __awaiter(void 0, void 0, void 0, function* () {
        // get user lobby
        const lobbyCode = yield getUserLobby(socket, userId);
        if (!lobbyCode) {
            console.log("user " + userId + " is not in a lobby");
        }
        else {
            console.log("user " + userId + " is in lobby " + lobbyCode);
            socket.join(lobbyCode);
            socket.emit("lobby info", { lobbyCode: lobbyCode });
        }
    }));
    socket.on("create lobby", (userId, nickname) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("user " + userId + "sent create lobby request");
        // upsert user
        if (!(yield upsertUser(socket, userId, nickname)))
            return;
        console.log("user " + userId + " upserted");
        // create lobby
        const lobbyCode = yield createLobby(socket, userId);
        if (!lobbyCode)
            return;
        console.log("lobby created with code " + lobbyCode);
        // join lobby
        if (!(yield userJoinLobby(socket, userId, lobbyCode)))
            return;
        console.log("user " + userId + " joined lobby " + lobbyCode);
    }));
    socket.on("join lobby", (userId, nickname, lobbyCode) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("user " + userId + "sent  join lobby:" + lobbyCode + " request");
        // upsert user
        if (!(yield upsertUser(socket, userId, nickname)))
            return;
        console.log("user + " + userId + " upserted");
        // join lobby
        if (!(yield userJoinLobby(socket, userId, lobbyCode)))
            return;
        console.log("user " + userId + " joined lobby " + lobbyCode);
    }));
    socket.on("disconnect", () => {
        console.log("a user disconnected");
    });
});
server.listen(4000, () => {
    console.log("Server is running on port 4000");
});
const getUserLobby = (socket, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase.from("lobby_users").select("lobby_code").eq("user_id", userId);
    if (error) {
        console.error("error checking if user is in lobby: " + error);
        socket.emit("error", { type: "DB_ERROR_CHECK_USER_IN_LOBBY", message: "An error occurred while checking if user is in lobby" });
        return null;
    }
    if (!data || data.length === 0) {
        return '';
    }
    return data[0].lobby_code;
});
const generateUniqueLobbyCode = () => __awaiter(void 0, void 0, void 0, function* () {
    let unique = false;
    let lobbyCode = '';
    while (!unique) {
        lobbyCode = Math.random().toString(36).substring(2, 7);
        const { count } = yield supabase.from("lobbies").select("code").eq("code", lobbyCode);
        if (!count || count === 0) {
            unique = true;
        }
    }
    return lobbyCode;
});
const upsertUser = (socket, userId, nickname) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase.from("users").upsert({ id: userId, nickname: nickname }).select();
    if (error || !data) {
        console.error("error upserting user: " + error);
        socket.emit("error", { type: "DB_ERROR_UPSERT_USER", message: "An error occurred while upserting user" });
        return false;
    }
    return true;
});
const createLobby = (socket, userId) => __awaiter(void 0, void 0, void 0, function* () {
    // generate unique lobby code
    const lobbyCode = yield generateUniqueLobbyCode();
    // insert lobby to db
    const { data, error } = yield supabase.from("lobbies").insert({ code: lobbyCode, host_user_id: userId }).select();
    if (error || !data) {
        console.error("error creating lobby: " + error);
        socket.emit("error", { type: "DB_ERROR_CREATE_LOBBY", message: "An error occurred while creating lobby" });
        return null;
    }
    return lobbyCode;
});
const userJoinLobby = (socket, userId, lobbyCode) => __awaiter(void 0, void 0, void 0, function* () {
    // check if lobby exists
    const { count } = yield supabase.from("lobbies").select("code").eq("code", lobbyCode);
    if (count === 0) {
        console.error("lobby not found");
        socket.emit("error", { type: "LOBBY_NOT_FOUND", message: "Lobby not found" });
        return false;
    }
    // check if user already joined lobby
    const { count: userCount } = yield supabase.from("lobby_users").select("user_id").eq("user_id", userId);
    if (userCount && userCount > 0) {
        console.error("user already joined lobby");
        socket.emit("error", { type: "USER_ALREADY_IN_LOBBY", message: "User already joined a lobby" });
        return false;
    }
    // insert user to lobby_users
    const { data, error } = yield supabase.from("lobby_users").insert({ user_id: userId, lobby_code: lobbyCode }).select();
    if (error || !data) {
        console.error("error user joining lobby: " + error);
        socket.emit("error", { type: "DB_ERROR_USER_JOIN_LOBBY", message: "An error occurred while user joining lobby" });
        return false;
    }
    // join socket room
    socket.join(lobbyCode);
    return true;
});
