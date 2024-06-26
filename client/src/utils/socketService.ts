import io from 'socket.io-client';
import {v4 as uuidv4} from 'uuid';
import {
    ErrorType,
    Lobby,
    LogLevel,
    OpError,
    SocketEvent,
    Story,
    StoryElement,
    TimerSetting
} from "../../../shared/sharedTypes.ts";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost";
const SERVER_PORT = import.meta.env.VITE_SERVER_PORT || 443;

console.log('connecting to server at', SERVER_URL + ':' + SERVER_PORT);


const socket = io(SERVER_URL + ':' + SERVER_PORT);

export const userId = localStorage.getItem('userId')
    || (() => {
        const id = uuidv4();
        localStorage.setItem('userId', id);
        return id;
    })();


const RETRY_MILLISECONDS = 4000;
const MAX_RETRIES = 5;

const ongoingRequests = new Map<SocketEvent, { args: any[], retryCount: number }>();

let setLoading: ((isLoading: boolean) => void ) | null = null;

export const setLoadingState = (newSetLoading: (isLoading: boolean) => void) => {
    setLoading = newSetLoading;
};


// Response Events:
const responseEventsMap = new Map<SocketEvent, SocketEvent[]>([
    [SocketEvent.GET_LOBBY, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.JOIN_LOBBY, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.CREATE_LOBBY, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.START_GAME, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.GET_STORY, [SocketEvent.STORY]],
    [SocketEvent.NEXT_PART, [SocketEvent.STORY_AT_PART, SocketEvent.PART]],
    [SocketEvent.GET_STORY_AT_PART, [SocketEvent.STORY_AT_PART]],
    [SocketEvent.END_GAME, [SocketEvent.LOBBY_INFO]],
    [SocketEvent.LEAVE_LOBBY, [SocketEvent.LEFT_LOBBY, SocketEvent.LOBBY_INFO]],
    [SocketEvent.SUBMIT_STORY_ELEMENTS, [SocketEvent.SUBMITTED, SocketEvent.LOBBY_INFO]],
    [SocketEvent.UNSUBMIT_STORY_ELEMENTS, [SocketEvent.SUBMITTED]]
]);


const responseWarningsMap = new Map<SocketEvent, ErrorType[]>([
    [SocketEvent.JOIN_LOBBY, [ErrorType.LOBBY_ALREADY_PLAYING, ErrorType.LOBBY_NOT_FOUND, ErrorType.LOBBY_MAX_PLAYERS_REACHED]],
    [SocketEvent.GET_STORY, [ErrorType.ROUND_ENDED]],
]);


const eventsThatCanBeInfinitelyRetried = [
    SocketEvent.GET_LOBBY,
    SocketEvent.GET_STORY,
    SocketEvent.GET_STORY_AT_PART,
    SocketEvent.SUBMIT_LOBBY_MAX_PLAYERS,
    SocketEvent.SUBMIT_LOBBY_SEE_PREV_STORY_PART,
    SocketEvent.SUBMIT_LOBBY_WITH_TEXT_TO_SPEECH,
    SocketEvent.SUBMIT_LOBBY_MAX_TEXTS,
    SocketEvent.SUBMIT_LOBBY_MAX_AUDIOS,
    SocketEvent.SUBMIT_LOBBY_MAX_IMAGES,
    SocketEvent.SUBMIT_LOBBY_MAX_DRAWINGS,
    SocketEvent.SUBMIT_LOBBY_TIMER_SETTING,
    SocketEvent.SUBMIT_LOBBY_ROUND_SECONDS,
    SocketEvent.SUBMIT_STORY_ELEMENTS,
    // Add other events that can be retried infinitely
];

const eventsThatCanVerifyArgs = [
    SocketEvent.JOIN_LOBBY,
    SocketEvent.CREATE_LOBBY,
    // Add other events that are allowed to verify their arguments
];

const eventsCoexistWithEveryEvent = [
    SocketEvent.GET_LOBBY,
    SocketEvent.GET_STORY,
    SocketEvent.GET_STORY_AT_PART,
    SocketEvent.SUBMIT_LOBBY_MAX_IMAGES,
    SocketEvent.SUBMIT_LOBBY_MAX_AUDIOS,
    SocketEvent.SUBMIT_LOBBY_MAX_DRAWINGS,
    SocketEvent.SUBMIT_LOBBY_MAX_TEXTS,
    SocketEvent.SUBMIT_LOBBY_MAX_PLAYERS,
    SocketEvent.SUBMIT_LOBBY_SEE_PREV_STORY_PART,
    SocketEvent.SUBMIT_LOBBY_WITH_TEXT_TO_SPEECH,
    SocketEvent.SUBMIT_LOBBY_TIMER_SETTING,
    SocketEvent.SUBMIT_LOBBY_ROUND_SECONDS
];


const eventsThatCanCoexist = new Map<SocketEvent, SocketEvent[]>([
    [SocketEvent.SUBMIT_STORY_ELEMENTS, [SocketEvent.GET_STORY, SocketEvent.GET_STORY_AT_PART]],
    [SocketEvent.UNSUBMIT_STORY_ELEMENTS, [SocketEvent.GET_STORY, SocketEvent.GET_STORY_AT_PART]],
    // Add other events that can be called at the same time

]);


const requestsThatRequireLoading = [
    // SocketEvent.GET_STORY,
    // SocketEvent.GET_STORY_AT_PART,
    SocketEvent.SUBMIT_STORY_ELEMENTS,
    // SocketEvent.UNSUBMIT_STORY_ELEMENTS,
    SocketEvent.JOIN_LOBBY,
    SocketEvent.CREATE_LOBBY,
    SocketEvent.LEAVE_LOBBY,
    SocketEvent.START_GAME,
    // SocketEvent.NEXT_PART,
    SocketEvent.END_GAME
];


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
            if (!coexistingEvents.includes(ongoingEvent) && !eventsCoexistWithEveryEvent.includes(ongoingEvent)) {
                console.log(`Cannot request event ${event} because event ${ongoingEvent} is ongoing.`);
                return false;
            }
        }
    }

    return true;
}


export const sendRequest = (event: SocketEvent, ...args: any[]) => {
    if (!canRequest(event, args)) return;
    // Emit the event to the server with the provided arguments
    socket.emit(event, ...args);

    // Add the request to the ongoingRequests map
    ongoingRequests.set(event, {args: args, retryCount: 0});

    if(setLoading && requestsThatRequireLoading.includes(event)) {
        setLoading(true);
        console.log('loading...for event', event);
    }

    // Get the response events for this request event from the map
    const responseEvents = responseEventsMap.get(event);

    // If there are response events, set up a one-time listener for each one that removes the request from the ongoingRequests map
    if (responseEvents) {
        responseEvents.forEach(responseEvent => {
            socket.once(responseEvent, () => {
                console.log('received response event ' + responseEvent + ' for request event ' + event);
                ongoingRequests.delete(event);
                if(setLoading && requestsThatRequireLoading.includes(event)){
                    setLoading(false);
                    console.log('finished loading for event', event);
                }
            });
        });
    }
}


// Event Listeners:

socket.on(SocketEvent.CONNECT, () => {
    sendRequest(SocketEvent.GET_LOBBY, userId)
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


const errorsThatShouldReload = [
    ErrorType.USER_ALREADY_IN_LOBBY,
    ErrorType.USER_NOT_IN_LOBBY,
    ErrorType.LOBBY_NOT_FOUND,
    ErrorType.USER_NOT_HOST,
    ErrorType.STORY_NOT_FOUND,
    ErrorType.STORY_ID_NOT_FOUND,
    ErrorType.STORY_INDEX_OUT_OF_BOUNDS,
    ErrorType.PART_IS_NULL,
];


// The errors that aren't supposed to happen on that page (ignored)


export const appOnError = (isWrongPage: (event: SocketEvent, error: OpError) => boolean) => {
    socket.on(SocketEvent.ERROR, (event: SocketEvent, error?: OpError) => {
        if (error && isWrongPage(event, error)) {
            if(setLoading && requestsThatRequireLoading.includes(event)){
                setLoading(false);
                console.log('finished loading for event', event);
            }
            console.log("error on wrong page...")
            return;
        }
        // If the error level is Error, retry the request after a delay
        if (error && error.logLevel === LogLevel.Error) {
            if (errorsThatShouldReload.includes(error.type)) {
                console.log("reloading page")
                setTimeout(() => {
                    window.location.reload();
                }, RETRY_MILLISECONDS); // Reload the page after 5 seconds
                return;
            }
            const request = ongoingRequests.get(event);
            if (request) {
                if (request.retryCount < MAX_RETRIES) {
                    setTimeout(() => {
                        socket.emit(event, ...request.args);
                        request.retryCount++;
                    }, RETRY_MILLISECONDS); // Retry after 5 seconds
                } else {
                    console.log(`Max retry attempts reached for event ${event}.`);
                    console.log("reloading page")
                    setTimeout(() => {
                        window.location.reload();
                    }, RETRY_MILLISECONDS); // Reload the page after 5 seconds
                }
            } else {
                console.log(`No request info found for event ${event}.`);
            }
        } else if (error && error.logLevel === LogLevel.Warning) {
            const responseWarnings = responseWarningsMap.get(event);
            if (responseWarnings && responseWarnings.includes(error.type)) {
                ongoingRequests.delete(event);
                if(setLoading && requestsThatRequireLoading.includes(event)){
                    setLoading(false);
                    console.log('finished loading for event', event);
                }
            }
        }


    });
}

export const appOffError = () => {
    socket.off(SocketEvent.ERROR);
}

export const onError = (callback: (event: SocketEvent, error: OpError) => void) => {
    socket.on(SocketEvent.ERROR, (event: SocketEvent, error: OpError) => {
        callback(event, error);
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

export const onLobbyMaxPlayers = (callback: (maxPlayers: number) => void) => {
    socket.on(SocketEvent.LOBBY_MAX_PLAYERS, (maxPlayers) => {
        callback(maxPlayers);
    });
}

export const offLobbyMaxPlayers = () => {
    socket.off(SocketEvent.LOBBY_MAX_PLAYERS);
}

export const onLobbySeePrevStoryPart = (callback: (seePrevStoryPart: boolean) => void) => {
    socket.on(SocketEvent.LOBBY_SEE_PREV_STORY_PART, (seePrevStoryPart) => {
        callback(seePrevStoryPart);
    });
}

export const offLobbySeePrevStoryPart = () => {
    socket.off(SocketEvent.LOBBY_SEE_PREV_STORY_PART);
}

export const onLobbyWithTextToSpeech = (callback: (withTextToSpeech: boolean) => void) => {
    socket.on(SocketEvent.LOBBY_WITH_TEXT_TO_SPEECH, (withTextToSpeech) => {
        callback(withTextToSpeech);
    });
}

export const offLobbyWithTextToSpeech = () => {
    socket.off(SocketEvent.LOBBY_WITH_TEXT_TO_SPEECH);
}

export const onLobbyMaxTexts = (callback: (maxTexts: number) => void) => {
    socket.on(SocketEvent.LOBBY_MAX_TEXTS, (maxTexts) => {
        callback(maxTexts);
    });
}

export const offLobbyMaxTexts = () => {
    socket.off(SocketEvent.LOBBY_MAX_PLAYERS);
}

export const onLobbyMaxAudios = (callback: (maxAudios: number) => void) => {
    socket.on(SocketEvent.LOBBY_MAX_AUDIOS, (maxAudios) => {
        callback(maxAudios);
    });
}

export const offLobbyMaxAudios = () => {
    socket.off(SocketEvent.LOBBY_MAX_AUDIOS);
}

export const onLobbyMaxImages = (callback: (maxAudios: number) => void) => {
    socket.on(SocketEvent.LOBBY_MAX_IMAGES, (maxImages) => {
        callback(maxImages);
    });
}

export const offLobbyMaxImages = () => {
    socket.off(SocketEvent.LOBBY_MAX_IMAGES);
}


export const onLobbyMaxDrawings = (callback: (maxDrawings: number) => void) => {
    socket.on(SocketEvent.LOBBY_MAX_IMAGES, (maxDrawings) => {
        callback(maxDrawings);
    });
}

export const offLobbyMaxDrawings = () => {
    socket.off(SocketEvent.LOBBY_MAX_DRAWINGS);
}


export const onLobbyTimerSetting = (callback: (TimerSetting: TimerSetting) => void) => {
    socket.on(SocketEvent.LOBBY_TIMER_SETTING, (timerSetting) => {
        callback(timerSetting);
    });
}

export const offLobbyTimerSetting = () => {
    socket.off(SocketEvent.LOBBY_TIMER_SETTING);
}


export const onLobbyRoundSeconds = (callback: (roundSeconds: number) => void) => {
    socket.on(SocketEvent.LOBBY_ROUND_SECONDS, (maxImages) => {
        callback(maxImages);
    });
}

export const offLobbyRoundSeconds = () => {
    socket.off(SocketEvent.LOBBY_MAX_IMAGES);
}


export const onUsersSubmitted = (callback: (usersSubmitted: number) => void) => {
    socket.on(SocketEvent.USERS_SUBMITTED, usersSubmitted => {
        callback(usersSubmitted);
    });
}

export const offUsersSubmitted = () => {
    socket.off(SocketEvent.USERS_SUBMITTED);
}

export const onStoryAtPart = (callback: ({story, userIndex, storiesCount}: {
    story: Story,
    userIndex: number,
    storiesCount: number
}) => void) => {
    // log content of elements

    socket.on(SocketEvent.STORY_AT_PART, ({story, userIndex, storiesCount}) => {
        callback({story, userIndex, storiesCount});
    });
}

export const offStoryAtPart = () => {
    socket.off(SocketEvent.STORY_AT_PART);
}

export const onPart = (callback: ({userIndex, storiesCount}: { userIndex: number, storiesCount: number }) => void) => {
    socket.on(SocketEvent.PART, ({userIndex, storiesCount}) => {
        callback({userIndex, storiesCount});
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

export const requestJoinLobby = (nickname: string, lobbyCode: string) => {
    sendRequest(SocketEvent.JOIN_LOBBY, userId, nickname, lobbyCode);
}

export const requestCreateLobby = (nickname: string) => {
    sendRequest(SocketEvent.CREATE_LOBBY, userId, nickname);
}

export const requestStartGame = (lobbyCode: string) => {
    sendRequest(SocketEvent.START_GAME, userId, lobbyCode);
}

export const requestStory = (lobbyCode: string) => {
    sendRequest(SocketEvent.GET_STORY, userId, lobbyCode);
}

export const requestNextPart = (lobbyCode: string) => {
    sendRequest(SocketEvent.NEXT_PART, userId, lobbyCode);
}

export const requestGetStoryAtPart = (lobbyCode: string) => {
    sendRequest(SocketEvent.GET_STORY_AT_PART, userId, lobbyCode);
}

export const requestEndGame = (lobbyCode: string) => {
    sendRequest(SocketEvent.END_GAME, userId, lobbyCode);
}

export const requestLeaveLobby = (lobbyCode: string) => {
    sendRequest(SocketEvent.LEAVE_LOBBY, userId, lobbyCode);
}

export const submitStoryElements = (lobbyCode: string, elements: StoryElement[]) => {
    sendRequest(SocketEvent.SUBMIT_STORY_ELEMENTS, userId, lobbyCode, elements);
}

export const unsubmitStoryElements = (lobbyCode: string) => {
    sendRequest(SocketEvent.UNSUBMIT_STORY_ELEMENTS, userId, lobbyCode);
}

export const submitLobbyMaxPlayers = (lobbyCode: string, maxPlayers: number) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_MAX_PLAYERS, userId, lobbyCode, maxPlayers);
}
export const submitLobbySeePrevStoryPart = (lobbyCode: string, seePrevStoryPart: boolean) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_SEE_PREV_STORY_PART, userId, lobbyCode, seePrevStoryPart);
}
export const submitLobbyWithTextToSpeech = (lobbyCode: string, withTextToSpeech: boolean) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_WITH_TEXT_TO_SPEECH, userId, lobbyCode, withTextToSpeech);
}
export const submitLobbyMaxTexts = (lobbyCode: string, maxTexts: number) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_MAX_TEXTS, userId, lobbyCode, maxTexts);
}

export const submitLobbyMaxAudios = (lobbyCode: string, maxAudios: number) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_MAX_AUDIOS, userId, lobbyCode, maxAudios);
}

export const submitLobbyMaxImages = (lobbyCode: string, maxImages: number) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_MAX_IMAGES, userId, lobbyCode, maxImages);
}

export const submitLobbyMaxDrawings = (lobbyCode: string, maxDrawings: number) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_MAX_DRAWINGS, userId, lobbyCode, maxDrawings);
}

export const submitLobbyTimerSetting = (lobbyCode: string, timerSetting: TimerSetting) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_TIMER_SETTING, userId, lobbyCode, timerSetting);
}

export const submitLobbyRoundSeconds = (lobbyCode: string, roundSeconds: number) => {
    sendRequest(SocketEvent.SUBMIT_LOBBY_ROUND_SECONDS, userId, lobbyCode, roundSeconds);
}
