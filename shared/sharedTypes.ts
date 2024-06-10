export enum SocketEvent {
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    CREATE_LOBBY = 'create lobby',
    JOIN_LOBBY = 'join lobby',
    LEAVE_LOBBY = 'leave lobby',
    START_GAME = 'start game',
    SUBMIT_STORY_ELEMENTS = 'submit story elements',
    UNSUBMIT_STORY_ELEMENTS = 'unsubmit story elements',
    END_GAME = 'end game',
    GET_STORY = 'get story',
    GET_STORY_AT_PART = 'get story at part',
    NEXT_PART = 'next part',
    GET_LOBBY = 'get lobby',
    LOBBY_INFO = 'lobby info',
    LEFT_LOBBY = 'left lobby',
    ERROR = 'error',
    STORY = 'story',
    GET_STORY_ELEMENTS = 'get story elements',
    USERS_SUBMITTED = 'users submitted',
    STORY_AT_PART = 'story at part',
    PART = 'part',
    SUBMITTED = 'submitted',
    SUBMIT_LOBBY_MAX_PLAYERS = 'submit lobby max players',
    SUBMIT_LOBBY_SEE_PREV_STORY_PART = 'submit lobby see prev story part',
    SUBMIT_LOBBY_WITH_TEXT_TO_SPEECH = 'submit lobby with text to speech',
    SUBMIT_LOBBY_MAX_TEXTS = 'submit lobby max texts',
    SUBMIT_LOBBY_MAX_AUDIOS = 'submit lobby max audios',
    SUBMIT_LOBBY_MAX_IMAGES = 'submit lobby max images',
    SUBMIT_LOBBY_MAX_DRAWINGS = 'submit lobby max drawings',
    SUBMIT_LOBBY_TIMER_SETTING = 'submit lobby timer setting',
    SUBMIT_LOBBY_ROUND_SECONDS = 'submit lobby round seconds',
    LOBBY_MAX_PLAYERS = "LOBBY_MAX_PLAYERS",
    LOBBY_SEE_PREV_STORY_PART = "LOBBY_SEE_PREV_STORY_PART",
    LOBBY_WITH_TEXT_TO_SPEECH = "LOBBY_WITH_TEXT_TO_SPEECH",
    LOBBY_MAX_TEXTS = "LOBBY_MAX_TEXTS",
    LOBBY_MAX_AUDIOS = "LOBBY_MAX_AUDIOS",
    LOBBY_MAX_IMAGES = "LOBBY_MAX_IMAGES",
    LOBBY_MAX_DRAWINGS = "LOBBY_MAX_DRAWINGS",
    LOBBY_TIMER_SETTING = "LOBBY_TIMER_SETTING",
    LOBBY_ROUND_SECONDS = "LOBBY_ROUND_SECONDS",

}


export enum PlaceType {
    None = '',
    Forest = 'places/forest.png',
    Beach = 'places/beach.png',
    ScaryAlley = 'places/scary-alley.png',
    Street = 'places/street.png',
    Bedroom = 'places/bedroom.png',
    HauntedHouse = 'places/haunted-house.png',
    Romantic = 'places/romantic-outdoor.png'
}


export enum AudioType {
    Scary = "audios/Scary.mp3",
    Romantic = "audios/Romantic.mp3",
    Sad = "audios/Sad.mp3",
    Suspense = "audios/Suspense.mp3"
}

export type User = {
    id: string;
    nickname: string;
    lobbyCode: (string | null);
    ready: boolean;
};

export enum TimerSetting {
    Normal = "normal",
    Dynamic = "dynamic"
}

export type LobbySettings = {
    maxPlayers: number;            // nb of players
    seePrevStoryPart: boolean;     // display mod
    withTextToSpeech: boolean;     // text to speech mod
    maxTexts: number;              // number of input
    maxAudios: number;             // number of input
    maxImages: number;             // number of input
    maxDrawings: number;           // number of input
    timerSetting: TimerSetting;    // dynamic or not
    roundSeconds: number;          // config of the timer
}

export type Lobby = {
    code: string;
    hostUserId: string;
    round: number;
    usersSubmitted: number;
    users: User[];
    userIndexOrder: { [key: string]: number } | null;
    roundsCount: number;
    roundStartAt: (Date | null);
    roundEndAt: (Date | null);
    currentStoryIndex: (number | null);
    currentUserIndex: (number | null);
    // Lobby parameters
    lobbySettings: LobbySettings;
};

export type Story = {
    id: number;
    index: number;
    lobbyCode: string;
    name: string;
    elements: StoryElement[];
};

export type StoryElement = {
    index: number;
    storyId: number;
    userId: string;
    round: number;
    type: StoryElementType;
    content: string;
};

export enum StoryElementType{
    Empty = 'empty',
    Text = 'text',
    Image = 'image',
    Drawing = 'drawing',
    Audio = 'audio',
    Place = "place"
}


export enum LogLevel {
    Error = 0,
    Warning = 1,
    Information = 2,
}

export type OpResult<T> = {
    success: boolean;
    data?: T;
    error?: OpError;
};
export type OpError = {
    type: ErrorType;
    logLevel: LogLevel;
    error: any;
};

export enum ErrorType {
    USER_NOT_IN_LOBBY = "USER_NOT_IN_LOBBY",
    GAME_ALREADY_STARTED = "GAME_ALREADY_STARTED",
    USER_NOT_HOST = "USER_NOT_HOST",
    LOBBY_NOT_FOUND = "LOBBY_NOT_FOUND",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    STORY_NOT_FOUND = "STORY_NOT_FOUND",
    STORY_BY_INDEX_NOT_FOUND = "STORY_BY_INDEX_NOT_FOUND",
    STORY_INDEX_OUT_OF_BOUNDS = "STORY_INDEX_OUT_OF_BOUNDS",
    USER_ALREADY_IN_LOBBY = "USER_ALREADY_IN_LOBBY",
    PART_IS_NULL = "PART_IS_NULL",
    NO_STORY_ELEMENTS_TO_UPSERTLETE = "NO_STORY_ELEMENTS_TO_UPSERTLETE",
    USER_NOT_SUBMITTED = "USER_NOT_SUBMITTED",
    LOBBY_MAX_PLAYERS_REACHED = "LOBBY_MAX_PLAYERS_REACHED",

    DB_ERROR_SELECT_STORY_ELEMENTS = "DB_ERROR_SELECT_STORY_ELEMENTS",
    DB_ERROR_SELECT_STORY = "DB_ERROR_SELECT_STORY",
    DB_ERROR_SELECT_USERS = "DB_ERROR_SELECT_USERS",
    DB_ERROR_SELECT_LOBBY = "DB_ERROR_SELECT_LOBBY",
    DB_ERROR_SELECT_STORY_BY_INDEX = "DB_ERROR_SELECT_STORY_BY_INDEX",
    DB_ERROR_SELECT_INACTIVE_USERS = "DB_ERROR_SELECT_INACTIVE_USERS",
    DB_ERROR_SELECT_USER_LOBBY_CODE = "DB_ERROR_SELECT_USER_LOBBY_CODE",
    DB_ERROR_SELECT_LAST_USER_IDS_IN_LOBBY = "DB_ERROR_SELECT_LAST_USER_IDS_IN_LOBBY",
    DB_ERROR_SELECT_STORY_ID_BY_INDEX = "DB_ERROR_SELECT_STORY_ID_BY_INDEX",

    DB_ERROR_INSERT_STORY = "DB_ERROR_INSERT_STORY",
    DB_ERROR_INSERT_STORY_ELEMENTS = "DB_ERROR_INSERT_STORY_ELEMENTS",
    DB_ERROR_INSERT_LOBBY = "DB_ERROR_INSERT_LOBBY",

    DB_ERROR_UPSERT_USER = "DB_ERROR_UPSERT_USER",

    DB_ERROR_UPDATE_USER_LAST_ACTIVE = "DB_ERROR_UPDATE_USER_LAST_ACTIVE",
    DB_ERROR_UPDATE_USER_LOBBY_CODE = "DB_ERROR_UPDATE_USER_LOBBY_CODE",
    DB_ERROR_UPDATE_LOBBY_HOST = "DB_ERROR_UPDATE_LOBBY_HOST",
    DB_ERROR_UPDATE_LOBBY_USERS_SUBMITTED = "DB_ERROR_UPDATE_LOBBY_USERS_SUBMITTED",
    DB_ERROR_UPDATE_LOBBY_ROUND = "DB_ERROR_UPDATE_LOBBY_ROUND",

    //DB_ERROR_UPDATE_LOBBY_SETTINGS
    DB_ERROR_UPDATE_LOBBY_MAX_PLAYERS = "DB_ERROR_UPDATE_LOBBY_MAX_PLAYERS",
    DB_ERROR_UPDATE_LOBBY_SEE_PREV_STORY_PART = "DB_ERROR_UPDATE_LOBBY_SEE_PREV_STORY_PART",
    DB_ERROR_UPDATE_LOBBY_WITH_TEXT_TO_SPEECH = "DB_ERROR_UPDATE_LOBBY_WITH_TEXT_TO_SPEECH",
    DB_ERROR_UPDATE_LOBBY_MAX_TEXTS = "DB_ERROR_UPDATE_LOBBY_MAX_TEXTS",
    DB_ERROR_UPDATE_LOBBY_MAX_AUDIOS = "DB_ERROR_UPDATE_LOBBY_MAX_AUDIOS",
    DB_ERROR_UPDATE_LOBBY_MAX_IMAGES = "DB_ERROR_UPDATE_LOBBY_MAX_IMAGES",
    DB_ERROR_UPDATE_LOBBY_MAX_DRAWINGS = "DB_ERROR_UPDATE_LOBBY_MAX_DRAWINGS",
    DB_ERROR_UPDATE_LOBBY_TIMER_SETTING = "DB_ERROR_UPDATE_LOBBY_TIMER_SETTING",
    DB_ERROR_UPDATE_LOBBY_ROUND_SECONDS = "DB_ERROR_UPDATE_LOBBY_ROUND_SECONDS",

    DB_ERROR_DELETE_LOBBY = "DB_ERROR_DELETE_LOBBY",
    DB_ERROR_DELETE_STORIES = "DB_ERROR_DELETE_STORIES",
    DB_ERROR_BEGIN = "DB_ERROR_BEGIN",
    DB_ERROR_COMMIT = "DB_ERROR_COMMIT",
    DB_ERROR_ROLLBACK = "DB_ERROR_ROLLBACK",
    DB_ERROR_SELECT_LOBBY_COUNT = "DB_ERROR_SELECT_LOBBY_COUNT",
    DB_ERROR_SELECT_LOBBIES_PLAYING = "DB_ERROR_SELECT_LOBBIES_PLAYING",
    DB_ERROR_SELECT_USERS_COUNT = "DB_ERROR_SELECT_USERS_COUNT",
    DB_ERROR_SELECT_LOBBY_CURRENT_PART = "DB_ERROR_SELECT_LOBBY_CURRENT_PART",
    DB_ERROR_UPDATE_LOBBY_CURRENT_PART = "DB_ERROR_UPDATE_LOBBY_CURRENT_PART",
    DB_ERROR_LOCK_ROW_LOBBY = "DB_ERROR_LOCK_ROW_LOBBY",
    DB_ERROR_DELETE_LOBBIES = "DB_ERROR_DELETE_LOBBIES",
    DB_ERROR_DELETE_USERS = "DB_ERROR_DELETE_USERS",
    DB_ERROR_SELECT_USER_READY = "DB_ERROR_SELECT_USER_READY",
    DB_ERROR_UPDATE_USER_READY = "DB_ERROR_UPDATE_USER_READY",
    DB_ERROR_UPSERTLETE_STORY_ELEMENTS = "DB_ERROR_UPSERTLETE_STORY_ELEMENTS",
    DB_ERROR_UPDATE_USERS_READY = "DB_ERROR_UPDATE_USERS_READY",
    DB_ERROR_SELECT_LOBBIES_WITH_HOST = "DB_ERROR_SELECT_LOBBIES_WITH_HOST",
    DB_ERROR_SELECT_LOBBY_BY_HOST = "DB_ERROR_SELECT_LOBBY_BY_HOST",
    DB_ERROR_SELECT_USERS_ALL = "DB_ERROR_SELECT_USERS_ALL",
    LOBBY_ALREADY_PLAYING = "LOBBY_ALREADY_PLAYING",
    DB_ERROR_SELECT_STORY_ELEMENTS_UNIQUE_USER_IDS_COUNT = "DB_ERROR_SELECT_STORY_ELEMENTS_UNIQUE_USER_IDS_COUNT",
    DB_ERROR_UPDATE_LOBBY_ROUNDS_COUNT = "DB_ERROR_UPDATE_LOBBY_ROUNDS_COUNT",
    DB_ERROR_SELECT_LOBBY_ROUNDS_COUNT = "DB_ERROR_SELECT_LOBBY_ROUNDS_COUNT",
    DB_ERROR_UPDATE_LOBBY_USER_INDEX_ORDER = "DB_ERROR_UPDATE_LOBBY_USER_INDEX_ORDER",
    USER_INDEX_ORDER_IS_NULL = "USER_INDEX_ORDER_IS_NULL",
}

export const processOp = async <T>(operation: () => Promise<OpResult<T>>): Promise<OpResult<T>> => {
    const res = await operation();
    if (res.error) {
        switch (res.error.logLevel) {
            case LogLevel.Information:
                console.info(res.error.type, res.error.error);
                break
            case LogLevel.Warning:
                console.warn(res.error.type, res.error.error);
                break;
            case LogLevel.Error:
                console.error(res.error.type, res.error.error);
                break;
        }
    }
    return res;
}
export const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
    maxPlayers: 8,
    seePrevStoryPart: false,
    withTextToSpeech: false,
    maxTexts: 10,
    maxAudios: 10,
    maxImages: 10,
    maxDrawings: 10,
    timerSetting: TimerSetting.Normal,
    roundSeconds: 15 * 60,
}