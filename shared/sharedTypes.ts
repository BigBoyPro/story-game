
export type User = {
    id: string;
    nickname: string;
    lobbyCode?: string;
};

export type Lobby = {
    code: string;
    hostUserId: string;
    round: number;
    usersSubmitted: number;
    users: Array<User>;
};

export type Story = {
    id: number;
    index: number;
    lobbyCode: string;
    name: string;
    elements: Array<StoryElement>;
};

export type StoryElement = {
    index: number;
    storyId: number;
    userId: string;
    type: StoryElementType;
    content: string;
};

export enum StoryElementType{
    Text = 'text',
    Image = 'image',
    Audio = 'audio'
}