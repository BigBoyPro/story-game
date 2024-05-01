import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import {Error, Lobby, Story, StoryElement} from "../../../shared/sharedTypes.ts";


const socket = io('http://localhost:4000');

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

export const onLobbyInfo = (callback: (lobby: Lobby) => void) => {
    socket.on('lobby info', lobby => {
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

export const onError = (callback: (error: Error) => void) => {
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

export const onUsersSubmitted = (callback: (usersSubmitted: number) => void) => {
    socket.on('users submitted', usersSubmitted => {
        callback(usersSubmitted);
    });
}

export const offUsersSubmitted = () => {
    socket.off('users submitted');
}

export const onNextStory = (callback: (story: Story) => void) => {
    socket.on('next story', story => {
        callback(story);
    });
}

export const offNextStory = () => {
    socket.off('next story');
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

export const requestNextStory = (lobbyCode: string, storyIndex: number) => {
    socket.emit('next story', userId, lobbyCode, storyIndex);

}

export const requestEndGame = (lobbyCode: string) => {
    socket.emit('end game', userId, lobbyCode);
}

export const requestLeaveLobby = (lobbyCode: string) => {
    socket.emit('leave lobby', userId, lobbyCode);
}

export const sendStoryElements = (lobbyCode: string, elements: StoryElement[]) => {
    socket.emit('story elements', userId, lobbyCode, elements);
}

