import React, {useContext, useRef, useState} from "react";
import "./StoryComponent.css"
import {Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
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

    const [placeImage, setPlaceImage] = useState(beachImg);
    


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
            else if (type == StoryElementType.Place) {
                addPlace();
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

    function handleDeleteStoryElement(index: number): void {
        const updatedStoryElements = [...storyElements];
        updatedStoryElements.splice(index, 1);
        for (let i = index; i < updatedStoryElements.length; i++) {
            updatedStoryElements[i].index--;
        }
        setStoryElements(updatedStoryElements);
    }

    const addPlace = () => {
        if (!lobby || !placeImage) return;
        addNewElement(StoryElementType.Place, placeImage)
        
    };
    const getPlaceImage = (place:string) :string=> {
        switch (place) {
            case 'forest':
                return forestImg;
                break;
            case 'beach':
                return beachImg;
                break;
            case 'scary_alley':
                return scaryAlleyImg;
                break;
            case 'street':
                return streetImg;
                break;
            case 'bedroom':
                return bedroomImg;
                break;
            case 'hauntedHouse':
                return hauntedHouseImg;
                break; 
            case 'romantic':
                return romanticImg;
                break;       
            default:
                return beachImg;
        }
    };

    return (
        
        <div className="story-page" style={{ backgroundImage: `url(${placeImage})`,
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat' }}>
            {!isDrawing ?
                <>
                <div >
                    {storyElementsState &&
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
                    {getStoryElementsForEachUser(story.elements, !storyElementsState).map((elements, index) =>
                         <StoryUserComponent key={index} elements={elements} isEditable={false}
                                            hidden={userIndexToShow !== undefined ? (index > userIndexToShow) : false}/>
                    )}
                    {/* new element for the current user*/}
                    {storyElementsState &&
                        <>
                            <StoryUserComponent elements={storyElements}
                                                isEditable={!hasSubmitted}
                                                onElementContentChange={handleElementContentChange}
                                                onDeleteStoryElement={handleDeleteStoryElement}
                            />

                            <div className="side-button-container">
                                <button onClick={handleAddElement}>+</button>
                                <input onChange={addImageElement} type="file" ref={inputRef}
                                       accept="image/*"
                                       hidden={true}/>
                                {type === StoryElementType.Audio &&
                                    <select ref={audioNameRef} >
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
                                        value !== StoryElementType.Empty && value !== StoryElementType.Place &&
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