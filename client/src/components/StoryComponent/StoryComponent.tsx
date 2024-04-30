import {useContext, useState} from "react";
import "./StoryComponent.css"
import {Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import {userId} from "../../utils/socketService.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";


function StoryComponent({
                            story,
                            onFinish
                        }: {
    story : Story,
    onFinish?: (newStoryElements : Array<StoryElement>) => void}) {

    const lobby = useContext(LobbyContext);
    const [newStoryElements, setNewStoryElements] = useState<Array<StoryElement>>([]);

    const [type, setType] = useState<StoryElementType>(StoryElementType.Text);

    const addElement = () => {
        if (lobby && type) {
            // add new element to the story
            setNewStoryElements([...newStoryElements, { index: newStoryElements.length, userId: userId, storyId: story.id , type, content: "" }]);
        }
    };

    const onElementContentUpdate = (index: number, content: string) => {
        const updatedNewStoryElements = [...newStoryElements];
        updatedNewStoryElements[index].content = content;
        setNewStoryElements(updatedNewStoryElements);
    };



    const handleFinish = () => {
        if(!onFinish) return;
        setNewStoryElements([]);
        onFinish(newStoryElements);
    };

    function getStoryElementsForEachUser() {
        const storyUserIds = [...new Set(story.elements.map((element) => element.userId))];
        return storyUserIds.map((userId) =>
            story.elements.filter((element) => element.userId == userId)
        );
    }

    return (
        <div className="story-page">
            {
                getStoryElementsForEachUser().map((elements, index) => (
                    <StoryUserComponent key={index} elements={elements} isEditable={false} />
                ))
            }
            {/* new element for the current user*/}
            {onFinish &&
                <StoryUserComponent key={newStoryElements.length} elements={newStoryElements}
                                    isEditable={true} onElementContentUpdate={onElementContentUpdate} />
            }
            {onFinish &&
                <>
                    <div className="side-button-container">
                        <button onClick={addElement}>+</button>
                        <select value={type} onChange={(e) => setType(e.target.value as StoryElementType)}>
                            {Object.values(StoryElementType).map((value) => (
                                <option key={value}
                                        value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={() => handleFinish()}>Finish</button>
                </>
            }

        </div>
    )
}

export default StoryComponent;