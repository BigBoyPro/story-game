import {useContext, useEffect, useRef, useState} from "react";
import "./StoryComponent.css"
import {AudioName, Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
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
    });
};

function StoryComponent({
                            story,
                            initialNewStoryElements = [],
                            isEditable,
                            onNewStoryElementsChange,
                            onSave,
                            onCancel,
                            shownUserIndex
                        }: {
    story: Story,
    initialNewStoryElements?: StoryElement[],
    isEditable: boolean,
    onNewStoryElementsChange?: (newNewStoryElements: StoryElement[]) => void,
    onSave?: () => void,
    onCancel?: () => void,
    shownUserIndex?: number,
}) {
    const lobby = useContext(LobbyContext);
    const [storyElements, setStoryElements] = useState<StoryElement[]>(initialNewStoryElements);

    const [hasSubmitted, setHasSubmitted] = useState(false);

    const [isDrawing, setIsDrawing] = useState<boolean>(false);

    const [type, setType] = useState<StoryElementType>(StoryElementType.Text);
    const [audio, setAudio] = useState<AudioName>(AudioName.Scary);

    const drawingActionsRef = useRef<DrawingAction[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);

    onNewStoryElementsChange && useEffect(() => {
        onNewStoryElementsChange(storyElements);
    }, [storyElements]);


    const handleDrawingActionsChange = (newActions: DrawingAction[]) => {
        drawingActionsRef.current = newActions;
    };

    const handleTypeChange = (newType: StoryElementType) => {
        setType(newType);
    };

    const handleAudioChange = (newAudio: AudioName) => {
        setAudio(newAudio);
    };

    const handleElementAdd = () => {
        if (lobby) {
            console.log("adding new element", type)
            if (type == StoryElementType.Image) {
                inputRef.current?.click();
            } else if (type == StoryElementType.Audio) {
                if (!audio) return;
                const audioURL = `/audio/${audio}.mp3`;
                addNewElement(StoryElementType.Audio, audioURL)
            } else if (type == StoryElementType.Drawing) {
                drawingActionsRef.current = [];
                setIsDrawing(true);
            } else if (type == StoryElementType.Text) {
                // add new element to the story
                console.log("adding new text element")
                addNewElement(StoryElementType.Text, "")
            }
        }
    }

    const addNewElement = (type: StoryElementType, content: string) => {
        lobby && setStoryElements([...storyElements, {
            index: storyElements.length,
            userId: userId,
            storyId: story.id,
            round: lobby.round,
            type,
            content
        }]);
    };

    const addImageElement = async (file: File) => {
        if (!lobby || !file) return;
        const fileURL = await uploadImage(file);
        if (!fileURL) return;
        addNewElement(StoryElementType.Image, fileURL)
    };

    const AddDrawingElement = () => {
        if (!lobby) return;
        setIsDrawing(false);
        addNewElement(StoryElementType.Drawing, JSON.stringify(drawingActionsRef.current));
        drawingActionsRef.current = [];
    };

    const handleElementChange = (index: number, content: StoryElement) => {
        const updatedStoryElements = [...storyElements];
        updatedStoryElements[index] = content;
        setStoryElements(updatedStoryElements);
    };

    const handleElementDelete = (index: number): void => {
        const updatedStoryElements = [...storyElements];
        updatedStoryElements.splice(index, 1);
        for (let i = index; i < updatedStoryElements.length; i++) {
            updatedStoryElements[i].index--;
        }
        setStoryElements(updatedStoryElements);
    };

    const handleFinish = () => {
        setHasSubmitted(true);
        if (onSave) onSave();
    };

    const handleCancel = () => {
        setHasSubmitted(false);
        if (onCancel) onCancel();
    };


    return (
        <div className="story-page">
            {!isEditable || hasSubmitted || !isDrawing ?
                <>
                    {getStoryElementsForEachUser(story.elements, !isEditable).map((elements, index) =>
                        <StoryUserComponent key={index} elements={elements} isEditable={false}
                                            isHidden={shownUserIndex !== undefined ? (index > shownUserIndex) : false}/>
                    )}
                    {/* new element for the current user*/}
                    {isEditable &&
                        <>
                            <StoryUserComponent elements={storyElements}
                                                isEditable={!hasSubmitted}
                                                onElementChange={handleElementChange}
                                                onElementDelete={handleElementDelete}
                            />

                            {!hasSubmitted ?
                                <>
                                    <div className="side-button-container">
                                        <button onClick={handleElementAdd}>+</button>
                                        <input type="file" ref={inputRef} accept="image/*" hidden={true}
                                               onChange={
                                                   async event => {
                                                       const file = event.target.files ? event.target.files[0] : undefined;
                                                       if (file) await addImageElement(file)
                                                   }
                                               }/>

                                        <select value={type}
                                                onChange={event => {
                                                    handleTypeChange(event.target.value as StoryElementType)
                                                }}>
                                            {Object.values(StoryElementType).map((value) => (
                                                value !== StoryElementType.Empty &&
                                                <option key={value}
                                                        value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
                                            ))}
                                        </select>

                                        {type === StoryElementType.Audio &&
                                            <select value={audio}
                                                    onChange={event => {
                                                        handleAudioChange(event.target.value as AudioName)
                                                    }}>
                                                {Object.values(AudioName).map((value) => (
                                                    <option key={value}
                                                            value={value}>{value}</option>
                                                ))}
                                            </select>
                                        }


                                    </div>

                                    <button disabled={storyElements.length === 0} onClick={handleFinish}>
                                        Finish
                                    </button>
                                </>
                                :
                                <button onClick={() => handleCancel()}>Cancel</button>
                            }
                        </>
                    }

                </>
                :
                <DrawingComponent initialActions={drawingActionsRef.current} isEditable={!hasSubmitted}
                                  onActionsChange={handleDrawingActionsChange} onSave={AddDrawingElement}/>
            }
        </div>
    )
}

export default StoryComponent;