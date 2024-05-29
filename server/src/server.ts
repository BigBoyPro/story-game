(async function() {
    while (true) {
        try {
            const http = require('http');
            const express = require('express');
            const cors = require('cors');
            const {Server} = require('socket.io');
            const {Pool} = require('pg');

            const {setupSocketHandlers} = require('./socketHandlers/socketService');
            const {inactiveUsersHandler} = require("./socketHandlers/inactiveUsersHandler");
            const {resetGames} = require("./socketHandlers/gameHandlers/resetGames");

            const INACTIVE_USERS_CHECK_MILLISECONDS = 2 * 60 * 1000;

            require('dotenv').config();

            const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;

            if (!SUPABASE_DATABASE_URL) {
                console.error('SUPABASE_DATABASE_URL is not set');
                return;
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

            await resetGames(io, pool);
            setupSocketHandlers(io, pool);
            server.listen(1234, () => {
                console.log("Server is running on port 1234");
            });
            console.log('Server listening');
            setInterval(async () => {
                await inactiveUsersHandler(io, pool);
            },  INACTIVE_USERS_CHECK_MILLISECONDS);
            break; // If server starts successfully, break the loop
        } catch (error) {
            console.error('Error starting server', error);
            console.log('Restarting server...');
        }
    }
})();