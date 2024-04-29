import {useContext, useState} from "react";
import "./StoryComponent.css"
import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import StoryElementComponent from "../StoryElementComponent/StoryElementComponent.tsx";
import {userId} from "../../utils/socketService.ts";


function StoryUserComponent({elements, isEditable}: {elements : StoryElement[], isEditable : boolean}) {
    const lobby = useContext(LobbyContext);
    const [storyElements, setStoryElements] = useState<Array<StoryElement>>(elements);


    const addElement = () => {
        if (lobby && type) {
            // add new element to the story
            setStoryElements([...storyElements, { index: storyElements.length, userId: userId, storyId: story.id , type, content: "" }]);
            elements[0].
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
            {storyElements.map((element, index) => (
                <StoryElementComponent key={index} storyElement={element}
                                       setContent={(content) => updateElementContent(index, content)}
                                       isEditable={isEditable}/>
            ))}


        </div>
    );
}

export default StoryUserComponent;