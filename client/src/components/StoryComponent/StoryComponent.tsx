import {useContext, useEffect, useState} from "react";
import "./StoryComponent.css"
import {Story, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import {LobbyContext} from "../../LobbyContext.tsx";
import {userId} from "../../utils/socketService.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import {uploadImage} from "../../utils/imageAPI.ts";








function StoryComponent({
                            story,
                            onFinish,
                            onNewStoryElementsChange
                        }: {
    story: Story,
    onFinish?: () => void,
    onNewStoryElementsChange?: (newStoryElements: StoryElement[]) => void
}) {

    const lobby = useContext(LobbyContext);
    const [newStoryElements, setNewStoryElements] = useState<StoryElement[]>([]);
    const [type, setType] = useState<StoryElementType>(StoryElementType.Text);


    useEffect(() => {
        if(onNewStoryElementsChange) {
            onNewStoryElementsChange(newStoryElements);
        }
    } ,[newStoryElements]);

    const addElement = () => {
        if (lobby && type) {
            if (type == StoryElementType.Image){
                    document.getElementById('importDiag')?.click()
            }
            if (type ==StoryElementType.Audio){
                    addAudioElement();

            }
             else {
                // add new element to the story
                setNewStoryElements([...newStoryElements, {
                    index: newStoryElements.length,
                    userId: userId,
                    storyId: story.id,
                    round: lobby.round,
                    type,
                    content: ""
                }]);
            }
        }
    }

    const onElementContentUpdate = (index: number, content: string) => {
        const updatedNewStoryElements = [...newStoryElements];
        updatedNewStoryElements[index].content = content;
        setNewStoryElements(updatedNewStoryElements);
    };



    const handleFinish = () => {
        if(!onFinish) return;
        onFinish();
        setNewStoryElements([]);
    };

    const getStoryElementsForEachUser = () => {
        const storyUserIds = [...new Set(story.elements.map((element) => element.userId))];
        return storyUserIds.map((userId) => {
                return story.elements.filter((element) => element.userId == userId);
            }
        );
    };

    const addImageElement = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!lobby) return;
        const file = event.target.files ? event.target.files[0] : null;
        if (file) {

            const fileURL = await uploadImage(file);
            if (!fileURL) return;
            setNewStoryElements([...newStoryElements, {
                index: newStoryElements.length,
                userId: userId,
                storyId: story.id,
                round: lobby.round,
                type: StoryElementType.Image,
                content: fileURL
            }]);
        }
    };
   
    const [audioName, setAudioType] = useState<string>("");
    const addAudioElement = () => {
        if (!lobby || !audioName) return;
    const audioURL = `/audio/${audioName}.mp3`;
    setNewStoryElements([...newStoryElements, {
      index: newStoryElements.length,
      userId: userId,
      storyId: story.id,
      round: lobby.round,
      type: StoryElementType.Audio,
      content: audioURL
        }]);
      };

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
                         <input onChange={addImageElement} type="file" id="importDiag" accept="image/*" hidden={true} />
                         {type === StoryElementType.Audio &&
              <select value={audioName} onChange={(event) => setAudioType(event.target.value)}>
                <option value="">please select a background music</option>
                <option value="romantic">romantic</option>
                <option value="scary">Scary</option>
                <option value="sad">Sad</option>
                <option value="suspense">suspense</option>
              </select>
            }
                         <select value={type} onChange={(event) => setType(event.target.value as StoryElementType)}>
                            {Object.values(StoryElementType).map((value) => (
                                value !== StoryElementType.Empty &&
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