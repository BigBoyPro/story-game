import {StoryElement} from "../../../../shared/sharedTypes.ts";
import StoryElementComponent from "../StoryElementComponent/StoryElementComponent.tsx";
import {useContext} from "react";
import {LobbyContext} from "../../LobbyContext.tsx";


function StoryUserComponent({elements, isEditable, isHidden = false, onElementChange, onElementDelete}: {
    elements: StoryElement[],
    isEditable : boolean,
    onElementChange?: (index: number, newElement: StoryElement) => void,
    onElementDelete?: (index: number) => void,
    isHidden?: boolean
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
            { !isHidden &&
                <div className="story-element">
                    {!isEditable && elements.length > 0 &&
                        <h3>{getUserNameFromId(elements[0].userId)}'s story</h3>
                    }
                    {elements.map((element, index) => (
                        <StoryElementComponent key={index}
                                               element={element}
                                               isEditable={isEditable}
                                               onElementChange={onElementChange ? (newElement) => onElementChange(index, newElement) : undefined}
                                               onElementDelete={onElementDelete ? () => onElementDelete(index) : undefined}/>
                    ))}
                </div>
            }
        </>
    );
}

export default StoryUserComponent;