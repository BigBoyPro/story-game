import {StoryElement} from "../../../../shared/sharedTypes.ts";
import {userId} from "../../utils/socketService.ts";

export const getStoryElementsForEachUser = (elements: StoryElement[], getCurrentUser = true) => {
    let storyUserIdArray = elements.map((element) => element.userId)
    if (!getCurrentUser) storyUserIdArray = storyUserIdArray.filter(elementUserId => elementUserId !== userId);
    const storyUserIds = [...new Set(storyUserIdArray)];
    return storyUserIds.map((userId) => {
        return elements.filter((element) => element.userId == userId);
    });
};