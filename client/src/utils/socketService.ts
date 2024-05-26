import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import {Lobby, LobbySettings, OpError, Story, StoryElement} from "../../../shared/sharedTypes.ts";


const socket = io('http://localhost:1234');

export const userId = localStorage.getItem('userId')
    || (() => {
        const id = uuidv4();
        localStorage.setItem('userId', id);
        return id;
    })();

// Event Listeners:

socket.on('connect', () => {
    socket.emit('get lobby', userId);
    console.log('connected to server');
});

socket.on('disconnect', () => {
    console.log('disconnected from server');
});

export const onLobbyInfo = (callback: (lobby: (Lobby | null)) => void) => {
    socket.on('lobby info', (lobby : (Lobby | null)) => {
        if(lobby){
        lobby.roundStartAt = lobby.roundStartAt ? new Date(lobby.roundStartAt) : null;
        lobby.roundEndAt = lobby.roundEndAt ? new Date(lobby.roundEndAt) : null;
        }
        callback(lobby);
    });
}

export const offLobbyInfo = () => {
    socket.off('lobby info');
}

export const onLeftLobby = (callback: () => void) => {
    socket.on('left lobby', () => {
        callback();
    });
}

export const offLeftLobby = () => {
    socket.off('left lobby');
}

export const onError = (callback: (error: OpError) => void) => {
    socket.on('error', error => {
        callback(error);
    });
}

export const offError = () => {
    socket.off('error');
}

export const onStory = (callback: (story: Story) => void) => {
    socket.on('story', story => {
        callback(story);
    });
}

export const offStory = () => {
    socket.off('story');
}

export const onGetStoryElements = (callback: () => void) => {
    socket.on('get story elements', () => {
        callback();
    });
}

export const offGetStoryElements = () => {
    socket.off('get story elements');
}

export const onLobbySettings = (callback: (lobbySettings: LobbySettings) => void) => {
    socket.on('lobby settings', (lobbySettings) => {
        callback(lobbySettings);
    });
}

export const offLobbySettings = () => {
    socket.off('lobby settings');
}

export const onUsersSubmitted = (callback: (usersSubmitted: number) => void) => {
    socket.on('users submitted', usersSubmitted => {
        callback(usersSubmitted);
    });
}

export const offUsersSubmitted = () => {
    socket.off('users submitted');
}

export const onStoryAtPart = (callback: ({story, userIndex} : {story: Story, userIndex: number}) => void) => {
    // log content of elements

    socket.on('story at part', ({story, userIndex}) => {
        callback({story, userIndex});
    });
}

export const offStoryAtPart = () => {
    socket.off('story at part');
}

export const onPart = (callback: (userIndex: number) => void) => {
    socket.on('part', userIndex => {
        callback(userIndex);
    });
}

export const offPart = () => {
    socket.off('part');
}

export const onEndGame = (callback: () => void) => {
    socket.on('end game', () => {
        callback();
    });
}

export const offEndGame = () => {
    socket.off('end game');
}


// Event Emitters:

export const requestJoinLobby = (nickname: string, lobbyCode: string) => {
    socket.emit('join lobby', userId, nickname, lobbyCode);
}

export const requestCreateLobby = (nickname: string) => {
    socket.emit('create lobby', userId, nickname);
}

export const requestStartGame = (lobbyCode: string) => {
    socket.emit('start game', userId, lobbyCode);
}

export const requestStory = (lobbyCode: string) => {
    socket.emit('get story', userId, lobbyCode);
}

export const requestNextPart = (lobbyCode: string) => {
    socket.emit('next part', userId, lobbyCode);
}

export const requestGetStoryAtPart = (lobbyCode: string) => {
    socket.emit('get story at part', userId, lobbyCode);
}

export const requestEndGame = (lobbyCode: string) => {
    socket.emit('end game', userId, lobbyCode);
}

export const requestLeaveLobby = (lobbyCode: string) => {
    socket.emit('leave lobby', userId, lobbyCode);
}

export const submitStoryElements = (lobbyCode: string, elements: StoryElement[]) => {
    socket.emit('submit story elements', userId, lobbyCode, elements);
}

export const unsubmitStoryElements = (lobbyCode: string) => {
    socket.emit('unsubmit story elements', userId, lobbyCode);
}

export const submitLobbySettings = (lobbyCode: string, lobbySettings: LobbySettings) => {
    socket.emit('submit lobby settings', userId, lobbyCode, lobbySettings);
}
