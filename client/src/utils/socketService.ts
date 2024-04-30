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

export const getLobbyInfo = (callback: (lobby: Lobby) => void) => {
    socket.on('lobby info', lobby => {
        callback(lobby);
    });
}

export const unmountLobbyInfo = () => {
    socket.off('lobby info');
}

export const getLeftLobby = (callback: () => void) => {
    socket.on('left lobby', () => {
        callback();
    });
}

export const unmountLeftLobby = () => {
    socket.off('left lobby');
}

export const getError = (callback: (error: Error) => void) => {
    socket.on('error', error => {
        callback(error);
    });
}

export const unmountError = () => {
    socket.off('error');
}

export const getStory = (callback: (story: Story) => void) => {
    socket.on('story', story => {
        callback(story);
    });
}

export const unmountStory = () => {
    socket.off('story');
}

export const getNextStory = (callback: (story: Story) => void) => {
    socket.on('next story', story => {
        callback(story);
    });
}

export const unmountNextStory = () => {
    socket.off('next story');
}

export const getEndGame = (callback: () => void) => {
    socket.on('end game', () => {
        callback();
    });
}

export const unmountEndGame = () => {
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

