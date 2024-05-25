import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import DrawingComponent from "../DrawingComponent/DrawingComponent.tsx";

const StoryElementComponent = ({element, isEditable, onElementChange, onElementDelete}: {
    element: StoryElement,
    isEditable: boolean,
    onElementChange?: (newElement: StoryElement) => void,
    onElementDelete?: () => void,
}) => {

    const handleContentChange = (content: string) => {
        if (isEditable && onElementChange) {
            onElementChange({...element, content: content});
        }
    }

    const renderContent = () => {
        switch (element.type) {
            case StoryElementType.Empty:
                return <div/>;
            case StoryElementType.Text:
                return <textarea value={element.content} readOnly={!isEditable}
                                 onChange={(e) => handleContentChange(e.target.value)}/>;
            case StoryElementType.Image:
                return <img src={element.content} alt="Story element" width="250"/>;
            case StoryElementType.Drawing:
                const actions = JSON.parse(element.content)
                return <DrawingComponent initialActions={actions} isEditable={false}/>;
            case StoryElementType.Audio:
                return <audio controls src={element.content}/>;
            default:
                return null;
        }
    };


    return (
        <div className="story-element">
            {renderContent()}
            {isEditable && onElementDelete &&
                <button onClick={() => onElementDelete()}>delete</button>}
        </div>
    );
};

export default StoryElementComponent;
