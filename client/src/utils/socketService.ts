import io from 'socket.io-client';
import {v4 as uuidv4} from 'uuid';
import {Lobby, LogLevel, OpError, SocketEvent, Story, StoryElement} from "../../../shared/sharedTypes.ts";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:443";
console.log('connecting to server at', SERVER_URL);

const socket = io(SERVER_URL)

export const userId = localStorage.getItem('userId')
    || (() => {
        const id = uuidv4();
        localStorage.setItem('userId', id);
        return id;
    })();


const ongoingRequests = new Map<SocketEvent, { args: any[], retryCount: number }>();

// Response Events:
const responseEventsMap = new Map<SocketEvent, SocketEvent[]>([
    [SocketEvent.JOIN_LOBBY, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.CREATE_LOBBY, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.START_GAME, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.GET_STORY, [SocketEvent.STORY]],
    [SocketEvent.NEXT_PART, [SocketEvent.STORY_AT_PART, SocketEvent.PART]],
    [SocketEvent.GET_STORY_AT_PART, [SocketEvent.STORY_AT_PART]],
    [SocketEvent.END_GAME, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.LEAVE_LOBBY, [SocketEvent.LEFT_LOBBY]],
    [SocketEvent.SUBMIT_STORY_ELEMENTS, [SocketEvent.SUBMITTED]],
    [SocketEvent.UNSUBMIT_STORY_ELEMENTS, [SocketEvent.SUBMITTED]]
]);

const RETRY_MILLISECONDS = 4000;
const MAX_RETRIES = 5;

// Event Listeners:

socket.on(SocketEvent.CONNECT, () => {
    socket.emit(SocketEvent.GET_LOBBY, userId);
    console.log('connected to server');
});

socket.on(SocketEvent.DISCONNECT, () => {
    console.log('disconnected from server');
});

export const onLobbyInfo = (callback: (lobby: (Lobby | null)) => void) => {
    socket.on(SocketEvent.LOBBY_INFO, (lobby: (Lobby | null)) => {
        if (lobby) {
            lobby.roundStartAt = lobby.roundStartAt ? new Date(lobby.roundStartAt) : null;
            lobby.roundEndAt = lobby.roundEndAt ? new Date(lobby.roundEndAt) : null;
        }
        callback(lobby);
    });
}

export const offLobbyInfo = () => {
    socket.off(SocketEvent.LOBBY_INFO);
}

export const onLeftLobby = (callback: () => void) => {
    socket.on(SocketEvent.LEFT_LOBBY, () => {
        callback();
    });
}

export const offLeftLobby = () => {
    socket.off(SocketEvent.LEFT_LOBBY);
}

export const onError = (callback: (event: SocketEvent, error: OpError) => void) => {
    socket.on(SocketEvent.ERROR, (event, error) => {
        callback(event, error);

        // If the error level is Error, retry the request after a delay
        if (error.logLevel === LogLevel.Error) {
            const requestInfo = ongoingRequests.get(event);
            if (requestInfo) {
                if (requestInfo.retryCount < MAX_RETRIES) {
                    setTimeout(() => {
                        socket.emit(event, ...requestInfo.args);
                        requestInfo.retryCount++;
                    }, RETRY_MILLISECONDS); // Retry after 5 seconds
                } else {
                    console.log(`Max retry attempts reached for event ${event}.`);
                    setTimeout(() => { window.location.reload(); }, RETRY_MILLISECONDS); // Reload the page after 5 seconds
                }
            } else {
                console.log(`No request info found for event ${event}.`);
            }
        }
    });
}

export const offError = () => {
    socket.off(SocketEvent.ERROR);
}

export const onStory = (callback: (story: Story) => void) => {
    socket.on(SocketEvent.STORY, story => {
        callback(story);
    });
}

export const offStory = () => {
    socket.off(SocketEvent.STORY);
}

export const onGetStoryElements = (callback: () => void) => {
    socket.on(SocketEvent.GET_STORY_ELEMENTS, () => {
        callback();
    });
}

export const offGetStoryElements = () => {
    socket.off(SocketEvent.GET_STORY_ELEMENTS);
}

export const onSubmitted = (callback: (submitted: boolean) => void) => {
    socket.on(SocketEvent.SUBMITTED, submitted => {
        callback(submitted);
    });
}

export const offSubmitted = () => {
    socket.off(SocketEvent.SUBMITTED);
}

export const onUsersSubmitted = (callback: (usersSubmitted: number) => void) => {
    socket.on(SocketEvent.USERS_SUBMITTED, usersSubmitted => {
        callback(usersSubmitted);
    });
}

export const offUsersSubmitted = () => {
    socket.off(SocketEvent.USERS_SUBMITTED);
}

export const onStoryAtPart = (callback: ({story, userIndex}: { story: Story, userIndex: number }) => void) => {
    // log content of elements

    socket.on(SocketEvent.STORY_AT_PART, ({story, userIndex}) => {
        callback({story, userIndex});
    });
}

export const offStoryAtPart = () => {
    socket.off(SocketEvent.STORY_AT_PART);
}

export const onPart = (callback: (userIndex: number) => void) => {
    socket.on(SocketEvent.PART, userIndex => {
        callback(userIndex);
    });
}

export const offPart = () => {
    socket.off(SocketEvent.PART);
}

export const onEndGame = (callback: () => void) => {
    socket.on(SocketEvent.END_GAME, () => {
        callback();
    });
}

export const offEndGame = () => {
    socket.off(SocketEvent.END_GAME);
}


// Event Emitters:

const eventsThatCanBeInfinitelyRetried = [
    SocketEvent.GET_LOBBY,
    SocketEvent.GET_STORY,
    SocketEvent.GET_STORY_AT_PART,
    // Add other events that can be retried infinitely
];

const eventsThatCanVerifyArgs = [
    SocketEvent.JOIN_LOBBY,
    SocketEvent.CREATE_LOBBY,
    // Add other events that are allowed to verify their arguments
];
const eventsThatCanCoexist = new Map<SocketEvent, SocketEvent[]>([
    [SocketEvent.SUBMIT_STORY_ELEMENTS, [SocketEvent.GET_STORY, SocketEvent.GET_STORY_AT_PART]],
    [SocketEvent.UNSUBMIT_STORY_ELEMENTS, [SocketEvent.GET_STORY, SocketEvent.GET_STORY_AT_PART]],
    // Add other events that can be called at the same time

]);

export const canRequest = (event: SocketEvent, args: any[]): boolean => {
    // If the event can be retried infinitely and the event is already ongoing, return true
    if (eventsThatCanBeInfinitelyRetried.includes(event) && ongoingRequests.has(event)) {
        return true;
    }
    // Get the existing request info for this event
    const existingRequestInfo = ongoingRequests.get(event);

    // If there is an existing request and the event is in the list of events that can verify their arguments,
    // check if the arguments have changed
    if (existingRequestInfo && eventsThatCanVerifyArgs.includes(event) && JSON.stringify(existingRequestInfo.args) === JSON.stringify(args)) {
        console.log(`Request for event ${event} with the same arguments is already ongoing.`);
        return false;
    }

    // If there is an existing request and the event is not in the list of events that can verify their arguments, return
    if (existingRequestInfo && !eventsThatCanVerifyArgs.includes(event)) {
        console.log(`Request for event ${event} is already ongoing.`);
        return false;
    }

    // If the event has coexisting restrictions, check if any of the restricted events are ongoing
    const coexistingEvents = eventsThatCanCoexist.get(event);
    if (coexistingEvents) {
        for (const [ongoingEvent] of ongoingRequests.entries()) {
            if (!coexistingEvents.includes(ongoingEvent)) {
                console.log(`Cannot request event ${event} because event ${ongoingEvent} is ongoing.`);
                return false;
            }
        }
    }

    return true;
}


export const request = (event: SocketEvent, ...args: any[]) => {
    if (!canRequest(event, args)) return;
    // Emit the event to the server with the provided arguments
    socket.emit(event, ...args);

    // Add the request to the ongoingRequests map
    ongoingRequests.set(event, {args: args, retryCount: 0});

    // Get the response events for this request event from the map
    const responseEvents = responseEventsMap.get(event);

    // If there are response events, set up a one-time listener for each one that removes the request from the ongoingRequests map
    if (responseEvents) {
        responseEvents.forEach(responseEvent => {
            socket.once(responseEvent, () => {
                ongoingRequests.delete(event);
            });
        });
    }
}
export const requestJoinLobby = (nickname: string, lobbyCode: string) => {
    request(SocketEvent.JOIN_LOBBY, userId, nickname, lobbyCode);
}

export const requestCreateLobby = (nickname: string) => {
    request(SocketEvent.CREATE_LOBBY, userId, nickname);
}

export const requestStartGame = (lobbyCode: string) => {
    request(SocketEvent.START_GAME, userId, lobbyCode);
}

export const requestStory = (lobbyCode: string) => {
    request(SocketEvent.GET_STORY, userId, lobbyCode);
}

export const requestNextPart = (lobbyCode: string) => {
    request(SocketEvent.NEXT_PART, userId, lobbyCode);
}

export const requestGetStoryAtPart = (lobbyCode: string) => {
    request(SocketEvent.GET_STORY_AT_PART, userId, lobbyCode);
}

export const requestEndGame = (lobbyCode: string) => {
    request(SocketEvent.END_GAME, userId, lobbyCode);
}

export const requestLeaveLobby = (lobbyCode: string) => {
    request(SocketEvent.LEAVE_LOBBY, userId, lobbyCode);
}

export const submitStoryElements = (lobbyCode: string, elements: StoryElement[]) => {
    request(SocketEvent.SUBMIT_STORY_ELEMENTS, userId, lobbyCode, elements);
}

export const unsubmitStoryElements = (lobbyCode: string) => {
    request(SocketEvent.UNSUBMIT_STORY_ELEMENTS, userId, lobbyCode);
}

