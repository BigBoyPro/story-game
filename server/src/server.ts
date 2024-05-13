import { processOp} from "../../shared/sharedTypes";
import http from 'http';
import express from 'express';
import cors from 'cors';
import {Server} from 'socket.io';
import {Pool} from 'pg';


const INACTIVE_USERS_CHECK_MILLISECONDS = 2 * 60 * 1000;

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

import { setupSocketHandlers } from './socketHandlers/socketService';
import {inactiveUsersHandler} from "./socketHandlers/inactiveUsersHandler";

const io = new Server(server, {
    cors: {
        origin: "*", // replace with your client's origin
        methods: ["GET", "POST"]
    }
});

setupSocketHandlers(io, pool);

server.listen(4000, () => {
    console.log("Server is running on port 4000");
});

setInterval(async () => {
    await inactiveUsersHandler(io, pool);
},  INACTIVE_USERS_CHECK_MILLISECONDS)



