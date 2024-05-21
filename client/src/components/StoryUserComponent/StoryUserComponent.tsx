import {StoryElement} from "../../../../shared/sharedTypes.ts";
import StoryElementComponent from "../StoryElementComponent/StoryElementComponent.tsx";
import {useContext} from "react";
import {LobbyContext} from "../../LobbyContext.tsx";


function StoryUserComponent({elements, isEditable, onElementContentChange, onDeleteStoryElement, hidden = false}: {
    elements: StoryElement[],
    isEditable: boolean,
    onElementContentChange?: (index: number, content: string) => void,
    onDeleteStoryElement?:(index:number)=>void,
    hidden?: boolean
}) {
    const lobby = useContext(LobbyContext);
    const getUserNameFromId = (userId: string) : string => {
        const nickname = lobby?.users.find(user => user.id === userId)?.nickname;
        if(nickname)
            return nickname;
        return "unknown";
    };
    return (
        <>
            { !hidden &&
                <div className="story-element">
                    {!isEditable && elements.length > 0 &&
                        <h3>{getUserNameFromId(elements[0].userId)}'s story</h3>
                    }
                    {elements.map((element, index) => (
                        <StoryElementComponent key={index} storyElement={element}
                                               setContent={(content) => onElementContentChange && onElementContentChange(index, content)}
                                               isEditable={isEditable}
                                               onDeleteStoryElement={onDeleteStoryElement}/>
                    ))}
                </div>
            }
        </>
    );
}

export default StoryUserComponent;