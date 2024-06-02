import {inactiveUsersHandler} from "./socketHandlers/inactiveUsersHandler";
import {Server} from 'socket.io';
import {resetGames} from "./socketHandlers/gameHandlers/resetGames";
import {setupSocketHandlers} from "./socketHandlers/socketService";
import http from "http";
import express from "express";
import cors from "cors";
import {Pool} from "pg";

try {


    const INACTIVE_USERS_CHECK_MILLISECONDS = 2 * 60 * 1000;

    require('dotenv').config();

    const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
    const PORT = parseInt(process.env.PORT || "4444");

    if (!SUPABASE_DATABASE_URL) {
        console.error('SUPABASE_DATABASE_URL is not set');
    }

    const pool = new Pool({
        connectionString: SUPABASE_DATABASE_URL
    });
    const app = express();
    const server = http.createServer(app);

    app.use(express.json());
    app.use(cors());
    app.get('/test', (_req, res) => {
        res.send('Test route accessed!');
    });
    const io = new Server(server, {
        cors: {
            origin: "*", // replace with your client's origin
            methods: ["GET", "POST"]
        }
    });

    resetGames(io, pool).then(() => {
        setupSocketHandlers(io, pool);
        server.listen(PORT, () => {
            console.log("Server is running on port " + PORT);
        });
        module.exports = app;
        console.log('Server listening');
        setInterval(async () => {
            await inactiveUsersHandler(io, pool);
        }, INACTIVE_USERS_CHECK_MILLISECONDS);
    });


} catch (error) {
    console.error('Error starting server', error);
    console.log('Restarting server...');
}
