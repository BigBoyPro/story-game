import {useContext, useEffect, useRef, useState} from "react";
import "./StoryComponent.css"
import {AudioName, Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import {userId} from "../../utils/socketService.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import {uploadImage} from "../../utils/imageAPI.ts";
import DrawingComponent, {DrawingAction} from "../DrawingComponent/DrawingComponent.tsx";

import forestImg from '../../assets/Places/forest.png';
import beachImg from '../../assets/Places/beach.png';
import scaryAlleyImg from '../../assets/Places/scary_alley.png';
import streetImg from '../../assets/Places/street.png';
import bedroomImg from '../../assets/Places/bedroom.png';
import hauntedHouseImg from '../../assets/Places/haunted-house.png';
import romanticImg from '../../assets/Places/romantic-outdoor.png';


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
    const [selectedElementIndex, setSelectedElementIndex] = useState<number|null>(null);

    const drawingActionsRef = useRef<DrawingAction[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const [placeImage, setPlaceImage] = useState(beachImg);



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
            else if (type == StoryElementType.Place) {
                addStoryElement(StoryElementType.Place, placeImage)
            }

        }
    }

    const createStoryElement = (index: number, type: StoryElementType, content: string) => {
        if(!lobby) return;
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
        if(newElement) setStoryElements([...storyElements, newElement]);
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
        if(selectedElementIndex !== null) {
            updateElement(selectedElementIndex, StoryElementType.Image, fileURL);
            setSelectedElementIndex(null);
        } else {
            addStoryElement(StoryElementType.Image, fileURL);
        }
    };

    const AddDrawingElement = () => {
        if (!lobby) return;
        setIsDrawing(false);
        if(selectedElementIndex !== null) {
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


    const getPlaceImage = (place:string) :string=> {
        switch (place) {
            case 'forest':
                return forestImg;
            case 'beach':
                return beachImg;
            case 'scary_alley':
                return scaryAlleyImg;
            case 'street':
                return streetImg;
            case 'bedroom':
                return bedroomImg;
            case 'hauntedHouse':
                return hauntedHouseImg;
            case 'romantic':
                return romanticImg;
            default:
                return beachImg;
        }
    };

    return (

        <div className="story-page" style={{ backgroundImage: `url(${placeImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat' }}>
            {!isEditable || hasSubmitted || !isDrawing ?
                <>
                <div >
                    {isEditable &&
                    <select onChange={(event)=>setPlaceImage(getPlaceImage(event.target.value))}>
                       <option value="beach">Beach</option>
                       <option value="forest">Forest</option>
                       <option value="scary_alley">Scary Alley</option>
                       <option value="street">Street</option>
                       <option value="bedroom">Bedroom</option>
                       <option value="hauntedHouse">Haunted House</option>
                       <option value="romantic">Romantic outdoor setting</option>

                </select>}
                {/* Rest of your component */}
                </div>
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
                                                onElementEdit={handleElementEdit}
                                                onUp={handleElementUp}
                                                onDown={handleElementDown}
                            />

                            {!hasSubmitted ?
                                <>
                                    <div className="side-button-container">
                                        <button onClick={handleElementAdd}>+</button>
                                        <input type="file" ref={inputRef} accept="image/*" hidden={true} onAbort={handleAddElementAbort}
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