import {useContext, useState} from "react";
import "./StoryComponent.css"
import {Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import StoryElementComponent from "../StoryElementComponent/StoryElementComponent.tsx";
import {userId} from "../../utils/socketService.ts";


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
            // add
        }
    };

    const updateElementContent = (index: number, content: string) => {
        const UpdatedNewStoryElements = [...newStoryElements];
        UpdatedNewStoryElements[index].content = content;
        setNewStoryElements(UpdatedNewStoryElements);
    };

    const handleFinish = () => {
        if(!onFinish) return;
        setNewStoryElements([]);
        onFinish(newStoryElements);
    };

    return (
        <div className="story-page">
            {newStoryElements.map((element, index) => (
                <StoryElementComponent key={index} storyElement={element}
                                       setContent={onFinish ? (content) => updateElementContent(index, content) : () => {}}
                                       isEditable={!!onFinish}/>
            ))}
            {onFinish &&
                <>
                    <div className="side-button-container">
                        <button onClick={addElement}>+</button>
                        <select value={type} onChange={(e) => setType(e.target.value as StoryElementType)}>
                            {Object.values(StoryElementType).map((value) => (
                                <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={() => handleFinish()}>Finish</button>
                </>
            }

        </div>
    );
}

export default StoryComponent;