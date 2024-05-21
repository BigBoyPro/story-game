import React, {useContext, useState} from "react";
import "./StoryComponent.css"
import {Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import {userId} from "../../utils/socketService.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import {uploadImage} from "../../utils/imageAPI.ts";
import DrawingComponent, {DrawingAction} from "../DrawingComponent/DrawingComponent.tsx";

const getStoryElementsForEachUser = (elements: StoryElement[], getCurrentUser = true) => {
    let storyUserIdArray = elements.map((element) => element.userId)
    if (!getCurrentUser) storyUserIdArray = storyUserIdArray.filter(elementUserId => elementUserId !== userId);
    const storyUserIds = [...new Set(storyUserIdArray)];
    return storyUserIds.map((userId) => {
            return elements.filter((element) => element.userId == userId);
        }
    );
};

function StoryComponent({
                            story,
                            storyElementsState,
                            userIndexToShow
                        }: {
    story: Story,
    storyElementsState?: [
        StoryElement[],
        (newStoryElements: StoryElement[]) => void,
        () => void,
        () => void,
    ],
    userIndexToShow?: number,
}) {
    const lobby = useContext(LobbyContext);
    const [storyElements, setStoryElements, onSave, onCancel] = storyElementsState ??
    (() => {
        const state = useState<StoryElement[]>([]);
        return [state[0], state[1], () => {
        }, () => {
        }];
    })();

    const [hasSubmitted, setHasSubmitted] = useState(false);

    const [type, setType] = useState<StoryElementType>(StoryElementType.Text);

    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [drawingActions, setDrawingActions] = useState<DrawingAction[]>([]);

    const inputRef = React.createRef<HTMLInputElement>();
    const audioNameRef = React.createRef<HTMLSelectElement>();


    const addNewElement = (type: StoryElementType, content: string) => {
        lobby && setStoryElements([...storyElements, {
            index: storyElements.length,
            userId: userId,
            storyId: story.id,
            round: lobby.round,
            type,
            content
        }]);
    }

    const handleAddElement = () => {
        if (lobby && type) {
            if (type == StoryElementType.Image) {
                inputRef.current?.click();
            } else if (type == StoryElementType.Audio) {
                addAudioElement();
            } else if (type == StoryElementType.Drawing) {
                setDrawingActions([]);
                setIsDrawing(true);
            } else if (type == StoryElementType.Text) {
                // add new element to the story
                addNewElement(StoryElementType.Text, "")
            }
        }
    }

    const handleElementContentChange = (index: number, content: string) => {
        const updatedStoryElements = [...storyElements];
        updatedStoryElements[index].content = content;
        setStoryElements(updatedStoryElements);
    };


    const handleFinish = () => {
        setHasSubmitted(true);
        onSave();
    };


    const addImageElement = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!lobby) return;
        const file = event.target.files ? event.target.files[0] : null;
        if (file) {

            const fileURL = await uploadImage(file);
            if (!fileURL) return;
            addNewElement(StoryElementType.Image, fileURL)
        }
    };

    const addAudioElement = () => {
        if (!lobby || !audioNameRef.current) return;
        const audioURL = `/audio/${audioNameRef.current.value}.mp3`;
        addNewElement(StoryElementType.Audio, audioURL)

    };

    const handleCancel = () => {
        setHasSubmitted(false);
        onCancel();
    };


    const handleSaveDrawing = () => {
        if (!lobby) return;
        setIsDrawing(false);
        setStoryElements([...storyElements, {
            index: storyElements.length,
            userId: userId,
            storyId: story.id,
            round: lobby.round,
            type,
            content: JSON.stringify(drawingActions)
        }]);
        setDrawingActions([]);
    };

    return (
        <div className="story-page">
            {!isDrawing ?
                <>
                    {getStoryElementsForEachUser(story.elements, !storyElementsState).map((elements, index) =>
                        <StoryUserComponent key={index} elements={elements} isEditable={false}
                                            hidden={userIndexToShow !== undefined ? (index > userIndexToShow) : false}/>
                    )}
                    {/* new element for the current user*/}
                    {storyElementsState &&
                        <>
                            <StoryUserComponent elements={storyElements}
                                                isEditable={!hasSubmitted}
                                                onElementContentChange={handleElementContentChange}/>

                            <div className="side-button-container">
                                <button onClick={handleAddElement}>+</button>
                                <input onChange={addImageElement} type="file" ref={inputRef}
                                       accept="image/*"
                                       hidden={true}/>
                                {type === StoryElementType.Audio &&
                                    <select ref={audioNameRef}>
                                        <option value="">please select a background music</option>
                                        <option value="romantic">romantic</option>
                                        <option value="Scary2">Scary</option>
                                        <option value="Sad">Sad</option>
                                        <option value="suspense">suspense</option>
                                    </select>
                                }
                                <select value={type}
                                        onChange={(event) => setType(event.target.value as StoryElementType)}>
                                    {Object.values(StoryElementType).map((value) => (
                                        value !== StoryElementType.Empty &&
                                        <option key={value}
                                                value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
                                    ))}
                                </select>

                            </div>
                            {!hasSubmitted ?
                                <button disabled={storyElements.length === 0}
                                        onClick={() => handleFinish()}>Finish</button>
                                :
                                <button onClick={() => handleCancel()}>Cancel</button>
                            }
                        </>
                    }

                </>
                :
                <DrawingComponent actionsState={[drawingActions, setDrawingActions, handleSaveDrawing]}/>
            }
        </div>
    )
}

export default StoryComponent;