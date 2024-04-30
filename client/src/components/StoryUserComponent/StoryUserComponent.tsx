import {StoryElement} from "../../../../shared/sharedTypes.ts";
import StoryElementComponent from "../StoryElementComponent/StoryElementComponent.tsx";
import {useContext} from "react";
import {LobbyContext} from "../../LobbyContext.tsx";


function StoryUserComponent({elements, isEditable, onElementContentUpdate}: {
    elements: StoryElement[],
    isEditable: boolean,
    onElementContentUpdate?: (index: number, content: string) => void
}) {
    const lobby = useContext(LobbyContext);
    const getUserNameFromId = (userId: string) : string => {
        const nickname = lobby?.users.find(user => user.id === userId)?.nickname;
        if(nickname)
            return nickname;
        return "unknown";
    };
    return (
        <div className="story-element">
            { !isEditable && elements.length > 0 &&
                <h3>{getUserNameFromId(elements[0].userId)}'s story</h3>
            }
            {elements.map((element, index) => (
                <StoryElementComponent key={index} storyElement={element}
                                       setContent={(content) => onElementContentUpdate && onElementContentUpdate(index, content)}
                                       isEditable={isEditable}/>
            ))}
        </div>
    );
}

export default StoryUserComponent;