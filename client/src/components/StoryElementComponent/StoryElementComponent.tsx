import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import DrawingComponent from "../DrawingComponent/DrawingComponent.tsx";
import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react";
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
        const [isPlaying, setIsPlaying] = useState(false);
        const isPlayingRef = useRef(isPlaying);
        const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
        const utterance = useRef<SpeechSynthesisUtterance | null>(null);

        useEffect(() => {
            isPlayingRef.current = isPlaying;
        }, [isPlaying]);

        const play = (tts: boolean) => {
            if (isPlaying) return;

            if (element.type === StoryElementType.Text && tts && element.content.length > 0) {
                handleSpeak();
            } else {
                onPlayingEnd && onPlayingEnd();
            }
        }

        const stop = () => {
            if (element.type === StoryElementType.Text && element.content.length > 0 && synthRef.current.speaking) {
                synthRef.current.cancel();
                if (!synthRef.current.speaking) {
                    // If not, manually call the onend function
                    if (utterance.current !== null) utterance.current.onend = null;
                    if (isPlayingRef.current) {
                        setIsPlaying(false);
                        onPlayingEnd && onPlayingEnd();
                    }
                }
            } else {
                onPlayingEnd && onPlayingEnd();
            }
        }


        const handleSpeak = () => {
            if (isPlaying) {
                synthRef.current.cancel();
                if (!synthRef.current.speaking) {
                    // If not, manually call the onend function
                    if (utterance.current !== null) utterance.current.onend = null;
                    if (isPlayingRef.current) {
                        setIsPlaying(false);
                        onPlayingEnd && onPlayingEnd();
                    }
                }
            } else {
                utterance.current = new SpeechSynthesisUtterance(element.content);
                const languageDetector = new LanguageDetect();
                languageDetector.setLanguageType('iso2');
                if (element.content.length > 0) {
                    const lang = languageDetector.detect(element.content, 1)[0]?.[0]
                    if (lang) utterance.current.lang = lang;
                }

                utterance.current.onend = () => {
                    if (isPlayingRef.current) {
                        setIsPlaying(false);
                        onPlayingEnd && onPlayingEnd();
                    }
                };
                synthRef.current.speak(utterance.current);
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
