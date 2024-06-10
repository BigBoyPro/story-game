import {Lobby} from "../../../shared/sharedTypes";
import shuffleSeed from "shuffle-seed";

export const isUserInLobby = (lobby: Lobby, userId: string): boolean => {
    return !!lobby.users.find(user => user.id === userId);
}
export const storyIndexForUser = (lobbyCode: string, userIndex: number, round: number, storiesCount: number) => {

    const shuffledBalancedLatinSquare = shuffleSeed.shuffle(balancedLatinSquare(storiesCount), lobbyCode);
    return shuffledBalancedLatinSquare[userIndex][round - 1];
};

const balancedLatinSquare = (arrayLength: number) => {
    const array = [];
    for(let i = 0; i < arrayLength; i++){
        array.push(i)
    }
    const matrix: number[][] = [];
    for (let i = 0; i < array.length; i++) {
        const participantId = array.length % 2 == 0 ? i : i*2
        let result = [];
        for (let i = 0, j = 0, h = 0; i < array.length; ++i) {
            let val = 0;
            if (i < 2 || i % 2 != 0) {
                val = j;
                ++j;
            } else {
                val = array.length - h - 1;
                ++h;
            }

            let idx = (val + participantId) % array.length;
            result.push(array[idx]);
        }

        if (array.length % 2 != 0 && participantId % 2 != 0) {
            result = result.reverse();
        }
        matrix.push(result)
    }
    return matrix;
};

