import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server} from 'socket.io';
import {Pool} from 'pg';

import {setupSocketHandlers} from './socketHandlers/socketService';
import {inactiveUsersHandler} from "./socketHandlers/inactiveUsersHandler";
import {resetGames} from "./socketHandlers/gameHandlers/resetGames";

const INACTIVE_USERS_CHECK_MILLISECONDS = 2 * 60 * 1000;

require('dotenv').config();


const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
const PORT = process.env.PORT || "80";
const HOST = process.env.HOST || "0.0.0.0";


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

async function startServer(io: Server, pool: Pool) {
    await resetGames(io, pool);

    setupSocketHandlers(io, pool);

    server.listen( 80,() => {
        console.log("Server is running on port " + PORT + "!");
    });
    console.log('Server listening');

    setInterval(async () => {
        await inactiveUsersHandler(io, pool);
    },  INACTIVE_USERS_CHECK_MILLISECONDS)
}


startServer(io, pool).then(() =>
    console.log('Server started')
).catch(error => {
    console.error('Error starting server', error);
    process.exit(1);
});

module.exports = app;