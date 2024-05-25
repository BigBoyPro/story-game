// socketHandlers.ts

import {Server, Socket as BaseSocket} from 'socket.io';
import {Pool} from 'pg';
import {Lobby, LobbySettings, OpError, Story, StoryElement} from "../../../shared/sharedTypes";


import {onCreateLobby, onGetLobby, onJoinLobby, onLeaveLobby} from "./lobbyHandlers";
import {onEndGame, onGetStory, onNextPart, onStartGame, onSubmitStoryElements} from "./gameHandlers";
import {onGetStoryAtPart} from "./gameHandlers";
import {onUnsubmitStoryElements} from "./gameHandlers/onUnsubmitStoryElements";
import {onSubmitLobbySettings} from "./lobbyHandlers/onSubmitLobbySettings";

interface Socket extends BaseSocket {
    userId?: string;
}

const userSocketMap = new Map<string, BaseSocket>();

const send = (userId: string, event: string, data: any) => {
    const userSocket = userSocketMap.get(userId);
    if(userSocket) {
        userSocket.emit(event, data);
    }
}

export const sendLobbyInfo = (userId: string, lobby: (Lobby | null)) => {
    send(userId, "lobby info", lobby);
}

export const sendError = (userId: string, error: OpError) => {
    send(userId, "error", error);
}

export const sendStory = (userId: string, story: any) => {
    send(userId, "story", story);
}


export const broadcastUsersSubmitted = (io : Server, lobbyCode: string, usersSubmitted: number) => {
    broadcast(io, lobbyCode, "users submitted", usersSubmitted);
}


export const broadcastLobbyInfo = (io: Server, lobbyCode: string, lobby: Lobby) => {
    broadcast(io, lobbyCode, "lobby info", lobby);
}

export const broadcastLobbySettings = (io: Server, lobbyCode: string, lobbySettings: LobbySettings) => {
    broadcast(io, lobbyCode, "lobby settings", lobbySettings);
}

export const excludedBroadcastLobbyInfo = (excludedUserId: string, lobbyCode: string, lobby: Lobby) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit("lobby info", lobby);
    }
}

export const broadcastStoryAtPart = (io: Server, lobbyCode: string, storyAndUser: {story: Story, userIndex: number}) => {
    broadcast(io, lobbyCode, "story at part", storyAndUser);
}

export const broadcastPart = (io: Server, lobbyCode: string, userIndex: number) => {
    broadcast(io, lobbyCode, "part", userIndex);
}

export const join = (userId: string, room: string) => {
    const userSocket = userSocketMap.get(userId);
    if(userSocket) {
        userSocket.join(room);
    }
}

export const leave = (userId: string, room: string) => {
    const userSocket = userSocketMap.get(userId);
    if(userSocket) {
        userSocket.leave(room);
    }
}
const broadcast = (io: Server, room: string, event: string, data: any) => {
    io.to(room).emit(event, data);
}

export const setupSocketHandlers = (io: Server, pool: Pool) => {

    io.on("connection", (socket :Socket) => {
        console.log("a user connected");
        socket.emit("connected");

        socket.on("get lobby", async (userId: string) => {
            socket.userId = userId;
            userSocketMap.set(userId, socket);
            await onGetLobby(pool, userId);
        });


        socket.on("create lobby", async (userId: string, nickname: string) => {
            await onCreateLobby(io, pool, userId, nickname);
        });


        socket.on("join lobby", async (userId: string, nickname: string, lobbyCode: string) => {
            await onJoinLobby(io, pool, userId, nickname, lobbyCode);
        });


        socket.on("leave lobby", async (userId: string, lobbyCode: string) => {
            await onLeaveLobby(io, pool, userId, lobbyCode);
        });

        socket.on("submit lobby settings", async (userId: string, lobbyCode: string, lobbySettings: LobbySettings)=> {
            await onSubmitLobbySettings(io, pool, userId, lobbyCode, lobbySettings);
        });

        socket.on("start game", async (userId: string, lobbyCode: string) => {
            await onStartGame(io, pool, userId, lobbyCode);

        });

        socket.on("submit story elements", async (userId: string, lobbyCode: string, elements: StoryElement[]) => {
            await onSubmitStoryElements(io, pool, userId, lobbyCode, elements);
        });

        socket.on("unsubmit story elements", async (userId: string, lobbyCode: string) => {
            await onUnsubmitStoryElements(io, pool, userId, lobbyCode);
        });

        socket.on("end game", async (userId: string, lobbyCode: string) => {
            await onEndGame(io, pool, userId, lobbyCode);
        });


        socket.on("get story", async (userId: string, lobbyCode: string) => {
            await onGetStory(pool, userId, lobbyCode);
        });

        socket.on("get story at part", async (userId: string, lobbyCode: string) => {
            await onGetStoryAtPart(io, pool, userId, lobbyCode);
        });


        socket.on("next part", async (userId: string, lobbyCode: string) => {
            await onNextPart(io, pool, userId, lobbyCode);
        });


        socket.on("disconnect", async () => {
            console.log("user disconnected");
            if(socket.userId) {
                userSocketMap.delete(socket.userId);
            }
        });
    });


};


