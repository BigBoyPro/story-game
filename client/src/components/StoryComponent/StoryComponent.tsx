import {useContext, useState} from "react";
import "./StoryComponent.css"
import {Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import StoryElementComponent from "../StoryElementComponent/StoryElementComponent.tsx";
import {userId} from "../../utils/socketService.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";


function StoryComponent({
                            story,
                            onFinish
                        }: {
    story : Story,
    onFinish?: (newStoryElements : Array<StoryElement>) => void}) {

    const lobby = useContext(LobbyContext);
    const [storyElements, setStoryElements] = useState<Array<StoryElement>>(onFinish ? [] : story.elements);

    const [type, setType] = useState<StoryElementType>(StoryElementType.Text);

    const addElement = () => {
        if (lobby && type) {
            // add new element to the story
            setStoryElements([...storyElements, { index: storyElements.length, userId: userId, storyId: story.id , type, content: "" }]);
            story.elements[0].
        }
    };

    const updateElementContent = (index: number, content: string) => {
        const UpdatedNewStoryElements = [...storyElements];
        UpdatedNewStoryElements[index].content = content;
        setStoryElements(UpdatedNewStoryElements);
    };


    const handleFinish = () => {
        if(!onFinish) return;
        setStoryElements([]);
        onFinish(storyElements);
    };
        return (
        <div className="story-page">
            {
                (lobby?.users.map((user) => {
                    return story.elements.filter((element) => { element.userId == user.id })
                })).map((elements) => {
                    <StoryUserComponent elements={elements} />
                })
            }
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