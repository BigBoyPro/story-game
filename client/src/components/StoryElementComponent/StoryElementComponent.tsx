import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import DrawingComponent from "../DrawingComponent/DrawingComponent.tsx";

const StoryElementComponent = ({ storyElement, setContent , isEditable, onDeleteStoryElement }: { storyElement : StoryElement, setContent?: (content: string) => void , isEditable : boolean,onDeleteStoryElement?:(index:number)=>void}) => {
    const renderContent = () => {
        switch (storyElement.type) {
            case StoryElementType.Empty:
                return <div/>;
            case StoryElementType.Text:
                return <textarea value={storyElement.content} readOnly={!isEditable}
                onChange={(e) => setContent && setContent(e.target.value)}/>;
            case StoryElementType.Image:
                return <img src={storyElement.content} alt="Story element" width="250"  />;
            case StoryElementType.Drawing:
                const actions = JSON.parse(storyElement.content)
                return <DrawingComponent initialActions={actions}/>;
            case StoryElementType.Audio:
                return <audio controls src={storyElement.content} />;
            default:
                return null;
        }
    };


    return (
        <div className="story-element">
            {renderContent()} 
            {onDeleteStoryElement && isEditable && 
            <button onClick={()=>onDeleteStoryElement(storyElement.index)}>delete</button>}
        </div>
    );
};

export default StoryElementComponent;
