
export type User = {
    id: string;
    nickname: string;
    lobbyCode: (string | null);
};

export type Lobby = {
    code: string;
    hostUserId: string;
    round: number;
    usersSubmitted: number;
    users: User[];
    roundStartAt: (Date | null);
    roundEndAt: (Date | null);
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
    Audio = 'audio'
}

export type Error = {
    type: string;
    message: string;
}