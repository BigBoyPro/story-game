import React, {createRef, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState} from "react";
import "./StoryComponent.css"
import {AudioName, Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import {userId} from "../../utils/socketService.ts";
import StoryUserComponent, {StoryUserComponentHandles} from "../StoryUserComponent/StoryUserComponent.tsx";
import {uploadImage} from "../../utils/imageAPI.ts";
import DrawingComponent, {DrawingAction} from "../DrawingComponent/DrawingComponent.tsx";
import {StoryElementComponentHandles} from "../StoryElementComponent/StoryElementComponent.tsx";

const getStoryElementsForEachUser = (elements: StoryElement[], getCurrentUser = true) => {
    let storyUserIdArray = elements.map((element) => element.userId)
    if (!getCurrentUser) storyUserIdArray = storyUserIdArray.filter(elementUserId => elementUserId !== userId);
    const storyUserIds = [...new Set(storyUserIdArray)];
    return storyUserIds.map((userId) => {
        return elements.filter((element) => element.userId == userId);
    });
};

export interface StoryComponentHandles {
    forceSave: () => StoryElement[];
}

const StoryComponent = forwardRef(
    function StoryComponent({
                                story,
                                initialNewStoryElements = [],
                                isEditable,
                                onNewStoryElementsChange,
                                onSave,
                                onCancel,
                                shownUserIndex,
                                onPlayingEnd
                            }: {
        story: Story,
        initialNewStoryElements?: StoryElement[],
        isEditable: boolean,
        onNewStoryElementsChange?: (newNewStoryElements: StoryElement[]) => void,
        onSave?: () => void,
        onCancel?: () => void,
        shownUserIndex?: number,
        onPlayingEnd?: () => void
    }, ref: React.Ref<StoryComponentHandles>) {
        useImperativeHandle(ref, () => ({
            forceSave,
        }));

        const forceSave = (): StoryElement[] => {
            const newStoryElements = [...storyElements];
            if (isDrawing && selectedElementIndex === null) {
                const drawingElement = createStoryElement(newStoryElements.length, StoryElementType.Drawing, JSON.stringify(drawingActionsRef.current));
                if (drawingElement) newStoryElements.push(drawingElement);
            }
            return newStoryElements;
        }

        const lobby = useContext(LobbyContext);
        const [storyElements, setStoryElements] = useState<StoryElement[]>(initialNewStoryElements);

        const [hasSubmitted, setHasSubmitted] = useState(false);

        const [isDrawing, setIsDrawing] = useState<boolean>(false);

        const [type, setType] = useState<StoryElementType>(StoryElementType.Text);
        const [audio, setAudio] = useState<AudioName>(AudioName.Scary);
        const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);

        const [autoPlay, setAutoPlay] = useState(false);
        const [tts, setTTS] = useState(true);
        const [isPlaying, setIsPlaying] = useState(false);
        const [canPlay, setCanPlay] = useState(true);

        const drawingActionsRef = useRef<DrawingAction[]>([]);

        const inputRef = useRef<HTMLInputElement>(null);

        const storyUserElementComponentRefs = useRef<StoryUserComponentHandles[]>([]);
        useEffect(() => {
            storyUserElementComponentRefs.current = story.elements.map((_, i) => storyUserElementComponentRefs.current[i] ?? createRef<StoryElementComponentHandles>());
        }, [story]);

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
            setSelectedElementIndex(null);
            if (lobby) {
                console.log("adding new element", type)
                if (type == StoryElementType.Image) {
                    inputRef.current?.click();
                } else if (type == StoryElementType.Audio) {
                    if (!audio) return;
                    const audioURL = `/audio/${audio}.mp3`;
                    addStoryElement(StoryElementType.Audio, audioURL);

                } else if (type == StoryElementType.Drawing) {
                    drawingActionsRef.current = [];
                    setIsDrawing(true);
                } else if (type == StoryElementType.Text) {
                    // add new element to the story
                    console.log("adding new text element")
                    addStoryElement(StoryElementType.Text, "");
                }
            }
        }

        const createStoryElement = (index: number, type: StoryElementType, content: string): StoryElement | undefined => {
            if (!lobby) return;
            return {
                index: index,
                userId: userId,
                storyId: story.id,
                round: lobby.round,
                type,
                content
            };
        };

        const addStoryElement = (type: StoryElementType, content: string) => {
            const newElement = createStoryElement(storyElements.length, type, content);
            if (newElement) setStoryElements([...storyElements, newElement]);
        }

        const updateElement = (index: number, type: StoryElementType, content: string) => {
            const newElement = createStoryElement(index, type, content);
            if (newElement) {
                const updatedStoryElements = [...storyElements];
                updatedStoryElements[index] = newElement;
                setStoryElements(updatedStoryElements);
            }
        };

        const addImageElement = async (file: File) => {
            if (!lobby || !file) return;
            const fileURL = await uploadImage(file);
            if (!fileURL) return;
            if (selectedElementIndex !== null) {
                updateElement(selectedElementIndex, StoryElementType.Image, fileURL);
                setSelectedElementIndex(null);
            } else {
                addStoryElement(StoryElementType.Image, fileURL);
            }
        };

        const AddDrawingElement = () => {
            if (!lobby) return;
            setIsDrawing(false);
            if (selectedElementIndex !== null) {
                updateElement(selectedElementIndex, StoryElementType.Drawing, JSON.stringify(drawingActionsRef.current));
                setSelectedElementIndex(null);
            } else {
                addStoryElement(StoryElementType.Drawing, JSON.stringify(drawingActionsRef.current));
            }
            drawingActionsRef.current = [];
        };

        const handleElementChange = (index: number, storyElement: StoryElement) => {
            const updatedStoryElements = [...storyElements];
            updatedStoryElements[index] = storyElement;
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

        const handleElementEdit = (index: number): void => {
            setSelectedElementIndex(index);
            if (storyElements[index].type === StoryElementType.Image) {
                inputRef.current?.click();
            } else if (storyElements[index].type === StoryElementType.Drawing) {
                drawingActionsRef.current = JSON.parse(storyElements[index].content);
                setIsDrawing(true);
            }
        }

        const handleFinish = () => {
            setHasSubmitted(true);
            if (onSave) onSave();
        };

        const handleCancel = () => {
            setHasSubmitted(false);
            if (onCancel) onCancel();
        };


        const handleAddElementAbort = () => {
            setSelectedElementIndex(null);
        };
        const handleElementUp = (index: number) => {
            if (index === 0) return;
            const updatedStoryElements = [...storyElements];
            const temp = updatedStoryElements[index];
            updatedStoryElements[index] = updatedStoryElements[index - 1];
            updatedStoryElements[index - 1] = temp;
            updatedStoryElements[index].index++;
            updatedStoryElements[index - 1].index--;
            setStoryElements(updatedStoryElements);
        };

        const handleElementDown = (index: number) => {
            if (index === storyElements.length - 1) return;
            const updatedStoryElements = [...storyElements];
            const temp = updatedStoryElements[index];
            updatedStoryElements[index] = updatedStoryElements[index + 1];
            updatedStoryElements[index + 1] = temp;
            updatedStoryElements[index].index--;
            updatedStoryElements[index + 1].index++;
            setStoryElements(updatedStoryElements);
        };


        const handleCancelDrawing = () => {
            setIsDrawing(false);
            drawingActionsRef.current = [];
            setSelectedElementIndex(null);
        }

        return (
            <div className="story-page">
                {!isEditable || hasSubmitted || !isDrawing ?
                    <>
                        <div>
                            <label htmlFor="autoPlay">Auto Play</label>
                            <input type="checkbox" checked={autoPlay}
                                   onChange={(event) => setAutoPlay(event.target.checked)}/>
                        </div>
                        <div>
                            <label htmlFor="tts">TTS</label>
                            <input type="checkbox" checked={tts}
                                   onChange={(event) => setTTS(event.target.checked)}/>
                        </div>
                        {getStoryElementsForEachUser(story.elements, !isEditable).map((elements, index, array) => {
                                return (<>
                                    <StoryUserComponent ref={(el) => {
                                        if (storyUserElementComponentRefs.current[index] !== el && el) {
                                            storyUserElementComponentRefs.current[index] = el;
                                            if (autoPlay && index === array.length - 1) el.play(tts, true);
                                        }
                                    }}
                                                        key={index} elements={elements} isEditable={false}
                                                        isHidden={shownUserIndex !== undefined ? (index > shownUserIndex) : false}
                                                        onPlayingEnd={(isLast) => {
                                                            if (index === array.length - 1) {
                                                                setCanPlay(!isLast)
                                                                if (isLast){
                                                                    onPlayingEnd && onPlayingEnd();
                                                                }
                                                                setIsPlaying(false);
                                                            }
                                                        }}
                                    />
                                    {!autoPlay && index === array.length - 1 && canPlay &&
                                        (!isPlaying ?
                                                <button
                                                    onClick={() => {
                                                        setIsPlaying(true);
                                                        storyUserElementComponentRefs.current[index]?.play(tts,false);
                                                    }}>Play</button>
                                                :
                                                <button disabled={true}>...</button>
                                        )
                                    }
                                </>)
                                    ;
                            }
                        )}
                        {/* new element for the current user*/}
                        {isEditable &&
                            <>
                                <StoryUserComponent elements={storyElements}
                                                    isEditable={!hasSubmitted}
                                                    onElementChange={handleElementChange}
                                                    onElementDelete={handleElementDelete}
                                                    onElementEdit={handleElementEdit}
                                                    onUp={handleElementUp}
                                                    onDown={handleElementDown}
                                />

                                {!hasSubmitted ?
                                    <>
                                        <div className="side-button-container">
                                            <button onClick={handleElementAdd}>+</button>
                                            <input type="file" ref={inputRef} accept="image/*" hidden={true}
                                                   onAbort={handleAddElementAbort}
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
                    <div className="story-element">

                        <DrawingComponent initialActions={drawingActionsRef.current} isEditable={!hasSubmitted}
                                          onActionsChange={handleDrawingActionsChange} onSave={AddDrawingElement}
                                          onCancel={handleCancelDrawing}/>
                    </div>
                }
            </div>
        )
    });

export default StoryComponent;