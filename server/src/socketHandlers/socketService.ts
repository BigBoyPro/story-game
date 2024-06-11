// socketHandlers.ts

import {Server, Socket as BaseSocket} from 'socket.io';
import {Pool} from 'pg';
import {
    Lobby,
    OpError,
    SocketEvent,
    Story,
    StoryElement,
    TimerSetting
} from "../../../shared/sharedTypes";


import {onCreateLobby, onGetLobby, onJoinLobby, onLeaveLobby} from "./lobbyHandlers";
import {onEndGame, onGetStory, onNextPart, onStartGame, onSubmitStoryElements} from "./gameHandlers";
import {onGetStoryAtPart} from "./gameHandlers";
import {onUnsubmitStoryElements} from "./gameHandlers/onUnsubmitStoryElements";
import {onSubmitLobbyMaxPlayers} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyMaxPlayers";
import {onSubmitLobbySeePrevStoryPart} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbySeePrevStoryPart";
import {onSubmitLobbyWithTextToSpeech} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyWithTextToSpeech";
import {onSubmitLobbyMaxTexts} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyMaxTexts";
import {onSubmitLobbyMaxAudios} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyMaxAudios";
import {onSubmitLobbyMaxImages} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyMaxImages";
import {onSubmitLobbyTimerSetting} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyTimerSetting";
import {onSubmitLobbyMaxDrawings} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyMaxDrawings";
import {onSubmitLobbyRoundSeconds} from "./lobbyHandlers/submitLobbySettings/onSubmitLobbyRoundSeconds";
import {onDisconnect} from "./onDisconnect";


interface Socket extends BaseSocket {
    userId?: string;
}

export const userSocketMap = new Map<string, BaseSocket>();
export const isUserConnected = (userId: string) => {
    return userSocketMap.has(userId);
}



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

export const broadcastUsersSubmitted = (io: Server, lobbyCode: string, usersSubmitted: number) => {
    broadcast(io, lobbyCode, SocketEvent.USERS_SUBMITTED, usersSubmitted);
}


export const broadcastLobbyInfo = (io: Server, lobbyCode: string, lobby: Lobby) => {
    broadcast(io, lobbyCode, SocketEvent.LOBBY_INFO, lobby);
}

export const broadcastGetStoryElements = (io: Server, lobbyCode: string) => {
    broadcast(io, lobbyCode, SocketEvent.GET_STORY_ELEMENTS, null);
}

/*export const broadcastLobbySettings = (io: Server, lobbyCode: string, lobbySettings: LobbySettings) => {
    broadcast(io, lobbyCode, SocketEvent.LOBBY_SETTINGS, lobbySettings);
}*/

export const excludedBroadcastLobbyMaxPlayers = (excludedUserId: string, lobbyCode: string, maxPlayers: number) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_MAX_PLAYERS, maxPlayers);
    }
}

export const excludedBroadcastLobbySeePrevStoryPart = (excludedUserId: string, lobbyCode: string, seePrevStoryPart: boolean) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_SEE_PREV_STORY_PART, seePrevStoryPart);
    }
}

export const excludedBroadcastLobbyWithTextToSpeech = (excludedUserId: string, lobbyCode: string, withTextToSpeech: boolean) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_WITH_TEXT_TO_SPEECH, withTextToSpeech);
    }
}

export const excludedBroadcastLobbyMaxTexts = (excludedUserId: string, lobbyCode: string, maxTexts: number) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_MAX_TEXTS, maxTexts);
    }
}

export const excludedBroadcastLobbyMaxAudios = (excludedUserId: string, lobbyCode: string, maxAudios: number) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_MAX_AUDIOS, maxAudios);
    }
}

export const excludedBroadcastLobbyMaxImages = (excludedUserId: string, lobbyCode: string, maxImages: number) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_MAX_IMAGES, maxImages);
    }
}

export const excludedBroadcastLobbyMaxDrawings = (excludedUserId: string, lobbyCode: string, maxDrawings: number) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_MAX_DRAWINGS, maxDrawings);
    }
}

export const excludedBroadcastLobbyTimerSetting = (excludedUserId: string, lobbyCode: string, timerSetting: TimerSetting) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_TIMER_SETTING, timerSetting);
    }
}

export const excludedBroadcastLobbyRoundSeconds = (excludedUserId: string, lobbyCode: string, roundSeconds: number) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_ROUND_SECONDS, roundSeconds);
    }
}





export const excludedBroadcastLobbyInfo = (excludedUserId: string, lobbyCode: string, lobby: Lobby) => {
    const userSocket = userSocketMap.get(excludedUserId);
    if(userSocket) {
        userSocket.to(lobbyCode).emit(SocketEvent.LOBBY_INFO, lobby);
    }
}

export const broadcastStoryAtPart = (io: Server, lobbyCode: string, storyAndUserAndCount: {story: Story, userIndex: number, storiesCount: number}) => {
    broadcast(io, lobbyCode, SocketEvent.STORY_AT_PART, storyAndUserAndCount);
}

export const broadcastPart = (io: Server, lobbyCode: string, UserAndCount: {userIndex: number, storiesCount: number}) => {
    broadcast(io, lobbyCode, SocketEvent.PART, UserAndCount);
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

        //--------------------------------------------------------------------------------------------------------------

        socket.on(SocketEvent.SUBMIT_LOBBY_MAX_PLAYERS, async (userId: string, lobbyCode: string, maxPlayers: number)=> {
            await onSubmitLobbyMaxPlayers(io, pool, userId, lobbyCode, maxPlayers);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_SEE_PREV_STORY_PART, async (userId: string, lobbyCode: string, seePrevStoryPart: boolean)=> {
            await onSubmitLobbySeePrevStoryPart(io, pool, userId, lobbyCode, seePrevStoryPart);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_WITH_TEXT_TO_SPEECH, async (userId: string, lobbyCode: string, withTextToSpeech: boolean)=> {
            await onSubmitLobbyWithTextToSpeech(io, pool, userId, lobbyCode, withTextToSpeech);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_MAX_TEXTS, async (userId: string, lobbyCode: string, maxTexts: number)=> {
            await onSubmitLobbyMaxTexts(io, pool, userId, lobbyCode, maxTexts);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_MAX_AUDIOS, async (userId: string, lobbyCode: string, maxAudios: number)=> {
            await onSubmitLobbyMaxAudios(io, pool, userId, lobbyCode, maxAudios);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_MAX_IMAGES, async (userId: string, lobbyCode: string, maxImages: number)=> {
            await onSubmitLobbyMaxImages(io, pool, userId, lobbyCode, maxImages);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_MAX_DRAWINGS, async (userId: string, lobbyCode: string, maxDrawings: number)=> {
            await onSubmitLobbyMaxDrawings(io, pool, userId, lobbyCode, maxDrawings);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_TIMER_SETTING, async (userId: string, lobbyCode: string, timerSetting: TimerSetting)=> {
            await onSubmitLobbyTimerSetting(io, pool, userId, lobbyCode, timerSetting);
        });

        socket.on(SocketEvent.SUBMIT_LOBBY_ROUND_SECONDS, async (userId: string, lobbyCode: string, roundSeconds: number)=> {
            await onSubmitLobbyRoundSeconds(io, pool, userId, lobbyCode, roundSeconds);
        });

        //--------------------------------------------------------------------------------------------------------------

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
                await onDisconnect(SocketEvent.DISCONNECT, io, pool, socket.userId);
            }
        });
    });


};


