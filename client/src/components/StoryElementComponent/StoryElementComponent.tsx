import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import DrawingComponent from "../DrawingComponent/DrawingComponent.tsx";

const StoryElementComponent = ({ storyElement, setContent , isEditable }: { storyElement : StoryElement, setContent?: (content: string) => void , isEditable : boolean}) => {
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
                return <DrawingComponent initialActions={actions}></DrawingComponent>;
            case StoryElementType.Audio:
                return <audio controls src={storyElement.content} />;
            default:
                return null;
        }
    };

    return (
        <div className="story-element">
            {renderContent()}
        </div>
    );
};

export default StoryElementComponent;
