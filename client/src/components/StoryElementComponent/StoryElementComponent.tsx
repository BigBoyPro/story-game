import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import DrawingComponent from "../DrawingComponent/DrawingComponent.tsx";
import React, {forwardRef, useImperativeHandle, useState} from "react";
import LanguageDetect from "languagedetect";

export interface StoryElementComponentHandles {
    play: (tts: boolean) => void;
    stop: () => void;
}

const StoryElementComponent = forwardRef(
    function StoryElementComponent({
                                       element,
                                       isEditable,
                                       isHidden = false,
                                       onElementChange,
                                       onElementDelete,
                                       onElementEdit,
                                       isLast = false,
                                       onUp,
                                       onDown,
                                       onPlayingEnd
                                   }: {
        element: StoryElement,
        isEditable: boolean,
        isHidden?: boolean
        isLast?: boolean,
        onElementChange?: (newElement: StoryElement) => void,
        onElementDelete?: () => void,
        onElementEdit?: () => void,
        onUp?: () => void,
        onDown?: () => void,
        onPlayingEnd?: () => void
    }, ref: React.Ref<StoryElementComponentHandles>) {
        useImperativeHandle(ref, () => ({
            play,
            stop
        }));
        const play = (tts: boolean) => {
            if (element.type === StoryElementType.Text && tts) {
                handleSpeak();
            } else {
                onPlayingEnd && onPlayingEnd();
            }
        }
        const stop = () => {
            synth.cancel();
            setIsPlaying(false);
            if (!synth.speaking) {
                // If not, manually call the onend function
                onPlayingEnd && onPlayingEnd();
            }
        }

        const [isPlaying, setIsPlaying] = useState(false);
        const synth = window.speechSynthesis;
        const languageDetector = new LanguageDetect();
        languageDetector.setLanguageType('iso2');

        const handleSpeak = () => {
            if (isPlaying) {
                synth.cancel();
                setIsPlaying(false);
                if (!synth.speaking) {
                    // If not, manually call the onend function
                    onPlayingEnd && onPlayingEnd();
                }
            } else {



                const utterance = new SpeechSynthesisUtterance(element.content);
                utterance.lang = languageDetector.detect(element.content, 1)[0][0];
                utterance.onend = () => {
                    onPlayingEnd && onPlayingEnd();
                    setIsPlaying(false);
                };
                synth.speak(utterance);
                setIsPlaying(true);
            }
        };

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
                    const textArea = <textarea value={element.content}
                                               onChange={(e) => handleContentChange(e.target.value)}
                                               disabled={!isEditable}/>;
                    if (isEditable) {
                        return textArea;
                    } else {

                        return <>
                            {textArea}
                            <button onClick={handleSpeak}>{isPlaying ? 'Stop' : 'Play'}</button>
                        </>

                    }
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


        return (<>
                {!isHidden &&
                    <div className="story-element">
                        {renderContent()}
                        {isEditable && onElementEdit && (element.type === StoryElementType.Image || element.type === StoryElementType.Drawing) &&
                            <button onClick={() => onElementEdit()}>Edit</button>
                        }
                        {isEditable && onElementDelete && <button onClick={() => onElementDelete()}>Delete</button>}
                        <div>
                            {isEditable && onUp && element.index !== 0 &&
                                <button onClick={onUp}>Up</button>
                            }
                            {isEditable && onDown && !isLast &&
                                <button onClick={onDown}>Down</button>
                            }
                        </div>
                    </div>
                }
            </>
        );
    });

export default StoryElementComponent;
