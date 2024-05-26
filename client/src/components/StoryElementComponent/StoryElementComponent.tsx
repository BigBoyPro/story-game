import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import DrawingComponent from "../DrawingComponent/DrawingComponent.tsx";

const StoryElementComponent = ({element, isEditable, onElementChange, onElementDelete, onElementEdit, isLast = false, onUp, onDown}: {
    element: StoryElement,
    isEditable: boolean,
    isLast?: boolean,
    onElementChange?: (newElement: StoryElement) => void,
    onElementDelete?: () => void,
    onElementEdit?: () => void,
    onUp?: () => void,
    onDown?: () => void
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
            case StoryElementType.Place:
                return <div/>
            case StoryElementType.Text:
                return <textarea value={element.content} readOnly={!isEditable}
                                 onChange={(e) => handleContentChange(e.target.value)}/>;
            case StoryElementType.Image:
                return <img src={element.content} alt="Story element" width="250"/>;
            case StoryElementType.Drawing:
                const actions = JSON.parse(element.content)
                return <DrawingComponent initialActions={actions} isEditable={false}/>;
            case StoryElementType.Audio:
                return <audio controls src={element.content} autoPlay loop/>;
            default:
                return null;
        }
    };


    return (
        <div className="story-element">
            {renderContent()}
            {isEditable && onElementEdit && (element.type === StoryElementType.Image || element.type === StoryElementType.Drawing) &&
                <button onClick={() => onElementEdit()}>Edit</button>
            }
            {isEditable && onElementDelete && <button onClick={() => onElementDelete()}>Delete</button>}
            <div>
                { isEditable && onUp && element.index !== 0 &&
                    <button onClick={onUp}>Up</button>
                }
                { isEditable && onDown && !isLast &&
                    <button onClick={onDown}>Down</button>
                }
            </div>
        </div>

    );
};

export default StoryElementComponent;
