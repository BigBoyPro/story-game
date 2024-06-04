// socketHandlers.ts

import {Server, Socket as BaseSocket} from 'socket.io';
import {Pool} from 'pg';
import {Lobby, OpError, SocketEvent, Story, StoryElement} from "../../../shared/sharedTypes";


import {onCreateLobby, onGetLobby, onJoinLobby, onLeaveLobby} from "./lobbyHandlers";
import {onEndGame, onGetStory, onNextPart, onStartGame, onSubmitStoryElements} from "./gameHandlers";
import {onGetStoryAtPart} from "./gameHandlers";
import {onUnsubmitStoryElements} from "./gameHandlers/onUnsubmitStoryElements";

interface Socket extends BaseSocket {
    userId?: string;
}

const userSocketMap = new Map<string, BaseSocket>();

const send = (userId: string, event: string, ...args: any[]) => {
    const userSocket = userSocketMap.get(userId);
    if(userSocket) {
        userSocket.emit(event, ...args);
    }
}

export const sendLobbyInfo = (userId: string, lobby: (Lobby | null)) => {
    send(userId, SocketEvent.LOBBY_INFO, lobby);
}

export const sendError = (userId: string, event: SocketEvent, error: OpError) => {
    send(userId, SocketEvent.ERROR, event, error);
}

export const sendStory = (userId: string, story: any) => {
    send(userId, SocketEvent.STORY, story);
}

export const sendSubmitted = (userId: string, submitted: boolean) => {
    send(userId, SocketEvent.SUBMITTED, submitted);
}

export const excludedBroadcastUsersSubmitted = (excludedUserId: string, lobbyCode: string, usersSubmitted: number) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.USERS_SUBMITTED, usersSubmitted);
    }}


export const broadcastLobbyInfo = (io: Server, lobbyCode: string, lobby: Lobby) => {
    broadcast(io, lobbyCode, SocketEvent.LOBBY_INFO, lobby);
}

export const excludedBroadcastLobbyInfo = (excludedUserId: string, lobbyCode: string, lobby: Lobby) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_INFO, lobby);
    }
}

export const broadcastStoryAtPart = (io: Server, lobbyCode: string, storyAndUser: {story: Story, userIndex: number}) => {
    broadcast(io, lobbyCode, SocketEvent.STORY_AT_PART, storyAndUser);
}

export const broadcastPart = (io: Server, lobbyCode: string, userIndex: number) => {
    broadcast(io, lobbyCode, SocketEvent.PART, userIndex);
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

        socket.on(SocketEvent.GET_LOBBY, async (userId: string) => {
            socket.userId = userId;
            userSocketMap.set(userId, socket);
            await onGetLobby(SocketEvent.GET_LOBBY, pool, userId);
        });


        socket.on(SocketEvent.CREATE_LOBBY, async (userId: string, nickname: string) => {
            await onCreateLobby(SocketEvent.CREATE_LOBBY, io, pool, userId, nickname);
        });


        socket.on(SocketEvent.JOIN_LOBBY, async (userId: string, nickname: string, lobbyCode: string) => {
            await onJoinLobby(SocketEvent.JOIN_LOBBY, io, pool, userId, nickname, lobbyCode);
        });


        socket.on(SocketEvent.LEAVE_LOBBY, async (userId: string, lobbyCode: string) => {
            await onLeaveLobby(SocketEvent.LEAVE_LOBBY, io, pool, userId, lobbyCode);
        });


        socket.on(SocketEvent.START_GAME, async (userId: string, lobbyCode: string) => {
            await onStartGame(SocketEvent.START_GAME, io, pool, userId, lobbyCode);

        });

        socket.on(SocketEvent.SUBMIT_STORY_ELEMENTS, async (userId: string, lobbyCode: string, elements: StoryElement[]) => {
            await onSubmitStoryElements(SocketEvent.SUBMIT_STORY_ELEMENTS, io, pool, userId, lobbyCode, elements);
        });

        socket.on(SocketEvent.UNSUBMIT_STORY_ELEMENTS, async (userId: string, lobbyCode: string) => {
            await onUnsubmitStoryElements(SocketEvent.UNSUBMIT_STORY_ELEMENTS, io, pool, userId, lobbyCode);
        });

        socket.on(SocketEvent.END_GAME, async (userId: string, lobbyCode: string) => {
            await onEndGame(SocketEvent.END_GAME, io, pool, userId, lobbyCode);
        });


        socket.on(SocketEvent.GET_STORY, async (userId: string, lobbyCode: string) => {
            await onGetStory(SocketEvent.GET_STORY, pool, userId, lobbyCode);
        });

        socket.on(SocketEvent.GET_STORY_AT_PART, async (userId: string, lobbyCode: string) => {
            await onGetStoryAtPart(SocketEvent.GET_STORY_AT_PART, io, pool, userId, lobbyCode);
        });


        socket.on(SocketEvent.NEXT_PART, async (userId: string, lobbyCode: string) => {
            await onNextPart(SocketEvent.NEXT_PART, io, pool, userId, lobbyCode);
        });


        socket.on(SocketEvent.DISCONNECT, async () => {
            console.log("user disconnected");
            if(socket.userId) {
                userSocketMap.delete(socket.userId);
            }
        });
    });


};


