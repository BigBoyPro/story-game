import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import "./StoryComponent.css"
import { AudioType, PlaceType, Story, StoryElement, StoryElementType } from "../../../../shared/sharedTypes.ts";
import { LobbyContext } from "../../LobbyContext.tsx";
import { userId } from "../../utils/socketService.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import { uploadImage } from "../../utils/imageAPI.ts";
import DrawingComponent, { DrawingAction } from "../DrawingComponent/DrawingComponent.tsx";
import { getStoryElementsForEachUser } from "./StoryComponent.ts";

export interface GameStoryComponentHandles {
    forceSave: () => StoryElement[];
}

const GameStoryComponent = forwardRef(
    function GameStoryComponent({
        story,
        initialNewStoryElements = [],
        onNewStoryElementsChange,
        onSave,
        onCancel,
    }: {
        story: Story,
        initialNewStoryElements: StoryElement[],
        onNewStoryElementsChange: (newNewStoryElements: StoryElement[]) => void,
        onSave: () => void,
        onCancel: () => void,
    }, ref: React.Ref<GameStoryComponentHandles>) {
        useImperativeHandle(ref, () => ({
            forceSave,
        }

    ));
    const [placeImage, setPlaceImage] = useState(PlaceType.None);


        const forceSave = (): StoryElement[] => {
            const newStoryElements = [...storyElements];
            if (lobby && isDrawing && selectedElementIndex === null) {
                const drawingElement = createStoryElement(newStoryElements.length,lobby.round, StoryElementType.Drawing, JSON.stringify(drawingActionsRef.current));
                if (drawingElement) newStoryElements.push(drawingElement);
            }
            return newStoryElements;
        }

        const lobby = useContext(LobbyContext);
        const [storyElements, setStoryElements] = useState<StoryElement[]>
            (() : StoryElement[] => {
                if(!lobby) return [];
                const elements = initialNewStoryElements;
                const placeElement = elements.find((e) => e.type === StoryElementType.Place);
                if (!placeElement) {
                    for (let i = 0; i < elements.length; i++) {
                        elements[i].index++;
                    }
                    const newElement = createStoryElement(0, lobby.round, StoryElementType.Place, PlaceType.None);
                    if (newElement)
                        elements.unshift(newElement);

                }
                else{
                     setPlaceImage(placeElement.content as PlaceType);
                }
                return elements;
            }

            );

        const [hasSubmitted, setHasSubmitted] = useState(false);

        const [isDrawing, setIsDrawing] = useState<boolean>(false);

        const [type, setType] = useState<StoryElementType>(StoryElementType.Text);
        const [audio, setAudio] = useState<AudioType>(AudioType.Scary);
        const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);

        const drawingActionsRef = useRef<DrawingAction[]>([]);

        const inputRef = useRef<HTMLInputElement>(null);


        onNewStoryElementsChange && useEffect(() => {
            onNewStoryElementsChange(storyElements);
        }, [storyElements]);

        useEffect(() => {
            const placeElement = storyElements.find((e) => e.type === StoryElementType.Place);
            if(placeElement)
            {
               placeElement.content = placeImage;
               const updatedElements = [...storyElements];
               updatedElements[placeElement.index]=placeElement;
               setStoryElements(updatedElements);
            }

        },[placeImage]
        );

        const handleDrawingActionsChange = (newActions: DrawingAction[]) => {
            drawingActionsRef.current = newActions;
        };

        const handleTypeChange = (newType: StoryElementType) => {
            setType(newType);
        };

        const handleAudioChange = (newAudio: AudioType) => {
            setAudio(newAudio);
        };

        const handleElementAdd = () => {
            setSelectedElementIndex(null);
            if (lobby) {
                if (type == StoryElementType.Image) {
                    inputRef.current?.click();
                } else if (type == StoryElementType.Audio) {
                    if (!audio) return;
                    const audioURL = `${audio}`;
                    addStoryElement(lobby.round, StoryElementType.Audio, audioURL);

                } else if (type == StoryElementType.Drawing) {
                    drawingActionsRef.current = [];
                    setIsDrawing(true);
                } else if (type == StoryElementType.Text) {
                    // add new element to the story
                    addStoryElement(lobby.round, StoryElementType.Text, "");
                } else if (type == StoryElementType.Place) {
                    addStoryElement(lobby.round, StoryElementType.Place, placeImage)
                }
            }
        }

        const createStoryElement = (index: number, round: number, type: StoryElementType, content: string): StoryElement => {
            return {
                index: index,
                userId: userId,
                storyId: story.id,
                round: round,
                type,
                content
            };
        };

        const addStoryElement = (round: number, type: StoryElementType, content: string) => {
            setStoryElements((prevElements) => [...prevElements, createStoryElement(prevElements.length, round, type, content)]);
        }

        const updateElement = (index: number, round: number, type: StoryElementType, content: string) => {
            setStoryElements((prevElements) => {
                const updatedStoryElements = [...prevElements];
                updatedStoryElements[index] = createStoryElement(index, round, type, content);
                return updatedStoryElements;
            });
        };

        const addImageElement = async (file: File) => {
            if (!lobby || !file) return;
            const fileURL = await uploadImage(file);
            if (!fileURL) return;
            if (selectedElementIndex !== null) {
                updateElement(selectedElementIndex, lobby.round, StoryElementType.Image, fileURL);
                setSelectedElementIndex(null);
            } else {
                addStoryElement(lobby.round, StoryElementType.Image, fileURL);
            }
        };

        const AddDrawingElement = () => {
            if (!lobby) return;
            setIsDrawing(false);
            if (selectedElementIndex !== null) {
                updateElement(selectedElementIndex, lobby.round, StoryElementType.Drawing, JSON.stringify(drawingActionsRef.current));
                setSelectedElementIndex(null);
            } else {
                addStoryElement(lobby.round, StoryElementType.Drawing, JSON.stringify(drawingActionsRef.current));
            }
            drawingActionsRef.current = [];
        };

        const handleElementChange = (index: number, storyElement: StoryElement) => {
            if(!lobby) return;
            updateElement(index, lobby.round, storyElement.type, storyElement.content);
        };

        const handleElementDelete = (index: number): void => {
            setStoryElements((prevElements) => {
                const updatedStoryElements = [...prevElements];
                updatedStoryElements.splice(index, 1);
                for (let i = index; i < updatedStoryElements.length; i++) {
                    updatedStoryElements[i].index--;
                }
                return updatedStoryElements
            });
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

            setStoryElements((prevElements) => {
                const updatedStoryElements = [...prevElements];
                const temp = updatedStoryElements[index];
                updatedStoryElements[index] = updatedStoryElements[index - 1];
                updatedStoryElements[index - 1] = temp;
                updatedStoryElements[index].index++;
                updatedStoryElements[index - 1].index--;
                return updatedStoryElements;
            });
        };

        const handleElementDown = (index: number) => {
            if (index === storyElements.length - 1) return;
            setStoryElements((prevElements) => {
                const updatedStoryElements = [...prevElements];
                const temp = updatedStoryElements[index];
                updatedStoryElements[index] = updatedStoryElements[index + 1];
                updatedStoryElements[index + 1] = temp;
                updatedStoryElements[index].index--;
                updatedStoryElements[index + 1].index++;
                return updatedStoryElements;
            });
        };


        const handleCancelDrawing = () => {
            setIsDrawing(false);
            drawingActionsRef.current = [];
            setSelectedElementIndex(null);
        }

        return (
            <div className="story-page">
                {hasSubmitted || !isDrawing ?
                    <>
                        <select onChange={(event) => setPlaceImage(event.target.value as PlaceType)}>
                            {Object.values(PlaceType).map((value, index) => (
                                <option key={value}
                                    value={value}>
                                    {Object.keys(PlaceType)[index]}
                                </option>
                            ))}
                        </select>

                        {getStoryElementsForEachUser(story.elements, false).map((elements, index) => {
                            return (
                                <React.Fragment key={index}>
                                    <StoryUserComponent elements={elements} isEditable={false} />
                                </React.Fragment>
                            );
                        })}
                        {/* new element for the current user*/}
                        <StoryUserComponent elements={storyElements}
                            isEditable={!hasSubmitted}
                            gameProps={{
                                onElementChange: handleElementChange,
                                onElementDelete: handleElementDelete,
                                onElementEdit: handleElementEdit,
                                onUp: handleElementUp,
                                onDown: handleElementDown
                            }}
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
                                        } />

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
                                                handleAudioChange(event.target.value as AudioType)
                                            }}>
                                            {Object.values(AudioType).map((value) => (
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
                    :
                    <div className="story-element">

                        <DrawingComponent initialActions={drawingActionsRef.current} isEditable={!hasSubmitted}
                            onActionsChange={handleDrawingActionsChange} onSave={AddDrawingElement}
                            onCancel={handleCancelDrawing} />
                    </div>
                }
            </div>
        )
    });

export default GameStoryComponent;