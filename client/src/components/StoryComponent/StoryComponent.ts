import {StoryElement} from "../../../../shared/sharedTypes.ts";
import {userId} from "../../utils/socketService.ts";

export const getStoryElementsForEachUser = (elements: StoryElement[], getCurrentUser = true) => {


    let storyUserIdArray = elements.map((element) => element.userId)
    if (!getCurrentUser) storyUserIdArray = storyUserIdArray.filter(elementUserId => elementUserId !== userId);
    const storyUserIds = [...new Set(storyUserIdArray)];
    const map = storyUserIds.map((userId) => {
        return elements.filter((element) => element.userId == userId)
    });

    // sort the map based on the round number
    map.sort((a, b) => a[0].round - b[0].round);
    return map;
};