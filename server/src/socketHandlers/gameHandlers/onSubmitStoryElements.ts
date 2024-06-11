import {Server} from "socket.io";
import {Pool, PoolClient} from "pg";
import {
    ErrorType,
    Lobby,
    LogLevel,
    OpResult,
    processOp,
    SocketEvent,
    StoryElement,
    StoryElementType, TimerSetting
} from "../../../../shared/sharedTypes";
import {
    dbSelectLobby,
    dbSelectUserReady,
    dbTransaction,
    dbUpdateLobbyUsersSubmittedIncrement,
    dbUpdateUserLastActive,
    dbUpdateUserReady,
    dbUpsertleteStoryElements
} from "../../db";
import {isUserInLobby} from "../../utils/utils";
import {broadcastUsersSubmitted, isUserConnected, sendError, sendSubmitted} from "../socketService";
import {onAccelerateRoundTimer, onNewRound} from "./roundHandler";

const MIN_REMAINING_MILLISECONDS_FOR_ACCELERATION = 20 * 1000;

// Main function to handle the submission of story elements
export async function onSubmitStoryElements(event: SocketEvent, io: Server, pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]) {
    // Log the submit story elements request by the user
    console.log("user " + userId + " sent submit story elements");

    // Update the user's last activity
    let {success, error} = await processOp(() =>
        dbUpdateUserLastActive(pool, userId)
    );
    // If the update fails, send an error
    if (!success) {
        error && sendError(userId, event, error);
        return;
    }

    let lobby;
    // Attempt to submit story elements
    ({data: lobby, error, success} = await processOp(() =>
        submitStoryElements(pool, userId, lobbyCode, elements)
    ));
    // If the submission fails, send an error
    if (!success || !lobby) {
        error && sendError(userId, event, error);
        return;
    }

    // Send the submitted status to the user
    // Broadcast the users submitted to all users except the one who submitted
    broadcastUsersSubmitted(io, lobbyCode, lobby.usersSubmitted);
    // Log the submission of story elements
    console.log("story elements sent by " + userId + " in lobby " + lobbyCode)
    // get number of users connected
    const connectedUsersCount = lobby.users.filter(user => isUserConnected(user.id)).length;
    if (lobby.usersSubmitted >= connectedUsersCount) {
        await onNewRound(io, pool, lobby);

    } else {
        sendSubmitted(userId, true);
        if (lobby.lobbySettings.timerSetting === TimerSetting.Dynamic && lobby.roundEndAt) {
            // if more than half of the users have submitted
            if((lobby.users.length === 2 && lobby.usersSubmitted === 1 ) || (lobby.users.length > 2 && lobby.usersSubmitted >= Math.ceil((lobby.users.length + 1)/ 2))) {
                // only if the remaining time is more than 10 seconds
                // accelerate the round timer if more than half of the users have submitted
                const remainingTime = lobby.roundEndAt.getTime() - new Date().getTime();
                if (remainingTime > MIN_REMAINING_MILLISECONDS_FOR_ACCELERATION) {
                    await onAccelerateRoundTimer(io, pool, lobby);
                }
            }

        }
    }
}

// Function to handle the submission of story elements
const submitStoryElements = (pool: Pool, userId: string, lobbyCode: string, elements: StoryElement[]): Promise<OpResult<Lobby>> => {
    return dbTransaction(pool, async (client: PoolClient): Promise<OpResult<Lobby>> => {
        // get lobby
        // Get the lobby information
        let {data: lobby, error, success} = await dbSelectLobby(client, lobbyCode, true);
        // If the retrieval fails, return an error
        if (!success || !lobby) return {success, error};

        let textCount = 0, audioCount = 0, imageCount = 0, drawingCount = 0;
        let count = 0;

        const filteredElements = elements.filter(element => {
            if (element.type !== StoryElementType.Text && element.type !== StoryElementType.Audio && element.type !== StoryElementType.Image && element.type != StoryElementType.Drawing) {
                count++;
                return true;
            }
            if (element.type === StoryElementType.Text && textCount < lobby.lobbySettings.maxTexts) {
                element.index = count;
                textCount++;
                count++;
                return true;
            } else if (element.type === StoryElementType.Audio && audioCount < lobby.lobbySettings.maxAudios) {
                audioCount++;
                count++
                return true;
            } else if (element.type === StoryElementType.Image && imageCount < lobby.lobbySettings.maxImages) {
                imageCount++;
                count++;
                return true;
            } else if (element.type === StoryElementType.Drawing && drawingCount < lobby.lobbySettings.maxDrawings) {
                drawingCount++;
                count++;
                return true;
            } else return false;
        });


        // Check if the user is in the lobby
        if (!isUserInLobby(lobby, userId)) return {
            success: false,
            error: {logLevel: LogLevel.Error, type: ErrorType.USER_NOT_IN_LOBBY, error: "User is not in the lobby"}
        };
        // Check if the user has already submitted
        let ready;
        ({data: ready, success, error} = await dbSelectUserReady(client, userId, true));
        // If the retrieval fails, return an error
        if (!success) return {success, error};
        // If the user has not submitted yet, update the user's ready status and increment the users submitted in the lobby
        if (!ready) {
            ({success, error} = await dbUpdateUserReady(client, userId, true));
            // If the update fails, return an error
            if (!success) return {success, error};


            // Update the users submitted in the lobby
            ({success, error} = await dbUpdateLobbyUsersSubmittedIncrement(client, lobbyCode))// If the update fails, return an error
            if (!success) return {success, error};
            lobby.usersSubmitted++;
        }

        // Upsert the story elements to the database
        ({success, error} = await dbUpsertleteStoryElements(client, filteredElements))
        // If the upsert fails, return an error
        if (!success && !(error && error.type === ErrorType.NO_STORY_ELEMENTS_TO_UPSERTLETE)) return {
            success,
            error
        };


        return {success: true, data: lobby};
    });
}
