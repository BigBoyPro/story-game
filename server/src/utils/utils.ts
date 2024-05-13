import {Lobby} from "../../../shared/sharedTypes";
import shuffleSeed from "shuffle-seed";

export const isUserInLobby = (lobby: Lobby, userId: string): boolean => {
    return !!lobby.users.find(user => user.id === userId);
}
export const storyIndexForUser = (lobby: Lobby, userId: string) => {
    const shuffledUsers = shuffleSeed.shuffle(lobby.users, lobby.code);
    // get the user index
    const userIndex = shuffledUsers.findIndex(user => user.id === userId);
    return (userIndex + 1 + lobby.round) % lobby.users.length;
};