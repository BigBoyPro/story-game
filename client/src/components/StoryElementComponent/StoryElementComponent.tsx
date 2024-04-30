import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";

const StoryElementComponent = ({ storyElement, setContent , isEditable }: { storyElement : StoryElement, setContent?: (content: string) => void , isEditable : boolean}) => {
    const renderContent = () => {
        switch (storyElement.type) {
            case StoryElementType.Text:
                return <textarea value={storyElement.content} readOnly={!isEditable}
                onChange={(e) => setContent && setContent(e.target.value)}/>;
            case StoryElementType.Image:
                return <img src={storyElement.content} alt="Story element" />;
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
