

export enum PlaceType {
    None = '',
    Forest = './places/forest.png',
    Beach = './places/beach.png',
    ScaryAlley = './places/scary-alley.png',
    Street = './places/street.png',
    Bedroom = './places/bedroom.png',
    HauntedHouse = './places/haunted-house.png',
    Romantic = './places/romantic-outdoor.png'
}


export enum AudioType {
    Scary = "Scary",
    Romantic = "Romantic",
    Sad = "Sad",
    Suspense = "Suspense"
}

export type User = {
    id: string;
    nickname: string;
    lobbyCode: (string | null);
    ready: boolean;
};

export type Lobby = {
    code: string;
    hostUserId: string;
    round: number;
    usersSubmitted: number;
    users: User[];
    roundStartAt: (Date | null);
    roundEndAt: (Date | null);
    currentStoryIndex: (number | null);
    currentUserIndex: (number | null);
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
    PART_IS_NULL = "PART_IS_NULL",
    DB_ERROR_LOCK_ROW_LOBBY = "DB_ERROR_LOCK_ROW_LOBBY",
    DB_ERROR_SELECT_LOBBIES = "DB_ERROR_SELECT_LOBBIES",
    DB_ERROR_DELETE_LOBBIES = "DB_ERROR_DELETE_LOBBIES",
    DB_ERROR_DELETE_USERS = "DB_ERROR_DELETE_USERS",
    DB_ERROR_SELECT_USER_READY = "DB_ERROR_SELECT_USER_READY",
    DB_ERROR_UPDATE_USER_READY = "DB_ERROR_UPDATE_USER_READY",
    USER_NOT_SUBMITTED = "USER_NOT_SUBMITTED",
    DB_ERROR_UPSERTLETE_STORY_ELEMENTS = "DB_ERROR_UPSERTLETE_STORY_ELEMENTS",
    DB_ERROR_UPDATE_USERS_READY = "DB_ERROR_UPDATE_USERS_READY",
    NO_STORY_ELEMENTS_TO_UPSERTLETE = "NO_STORY_ELEMENTS_TO_UPSERTLETE",
    DB_ERROR_SELECT_LOBBIES_WITH_HOST = "DB_ERROR_SELECT_LOBBIES_WITH_HOST",
    DB_ERROR_SELECT_LOBBY_BY_HOST = "DB_ERROR_SELECT_LOBBY_BY_HOST",
    USER_ALREADY_IN_LOBBY = "USER_ALREADY_IN_LOBBY",
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