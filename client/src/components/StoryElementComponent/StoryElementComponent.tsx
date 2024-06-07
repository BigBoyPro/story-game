import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import DrawingComponent from "../DrawingComponent/DrawingComponent.tsx";
import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react";
import LanguageDetect from "languagedetect";
import './StoryElementComponent.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faArrowUp, faArrowDown, faTrashAlt, faEdit} from '@fortawesome/free-solid-svg-icons'

export interface StoryElementComponentHandles {
    play: (tts: boolean) => void;
    stop: () => void;
}
export const DRAW_INITIAL_ACTIONS_MILLISECONDS = 1000;
const AUDIO_PLAY_TIMEOUT_MILLISECONDS = 2 * 1000;

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
        const audioRef = useRef<HTMLAudioElement>(null);
        const timeoutRef = useRef<NodeJS.Timeout | null>(null);
        const shouldPlayOnLoad = useRef(false);

        const elementRef = useRef<HTMLDivElement>(null);



        useEffect(() => {
            isPlayingRef.current = isPlaying;
        }, [isPlaying]);

        function handleAudioPlay() {
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                    isPlayingRef.current = true;
                    timeoutRef.current = setTimeout(() => onPlayingEnd && onPlayingEnd(), AUDIO_PLAY_TIMEOUT_MILLISECONDS);
                }).catch((e) => {
                    if (e.name === 'NotAllowedError') {
                        alert('Audio playback was prevented by the browser. Please enable audio playback for this website.');
                    }
                    onPlayingEnd && onPlayingEnd();
                });
            } else {
                shouldPlayOnLoad.current = true;
            }
        }

        const play = (tts: boolean) => {
            if (isPlayingRef.current) return;
            if (element.type === StoryElementType.Text && tts) {
                handleSpeak();
            } else if (element.type === StoryElementType.Audio) {
                handleAudioPlay();

            } else if (element.type === StoryElementType.Drawing) {
                setIsPlaying(true);
                isPlayingRef.current = true;
                timeoutRef.current = setTimeout(() => {handlePlayingEnd()}, DRAW_INITIAL_ACTIONS_MILLISECONDS + 500);
            } else {
                setTimeout(() => {onPlayingEnd && onPlayingEnd()}, 500);
            }
            elementRef.current?.scrollIntoView({ behavior: 'smooth' });

        }

        const stop = () => {
            if(!isPlayingRef.current) return;
            if (element.type === StoryElementType.Text && element.content.length > 0 && synthRef.current.speaking) {
                synthRef.current.cancel();
                if (!synthRef.current.speaking) {
                    // If not, manually call the onend function
                    if (utterance.current !== null) utterance.current.onend = null;
                    handlePlayingEnd();
                }
            } else if (element.type === StoryElementType.Audio && audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setIsPlaying(false);
                isPlayingRef.current = false;

            } else {
                onPlayingEnd && onPlayingEnd();
            }
        }

        const handlePlayingEnd = () => {
            if (isPlayingRef.current) {
                setIsPlaying(false);
                isPlayingRef.current = false;
                onPlayingEnd && onPlayingEnd();
            }
        }


        const handleSpeak = () => {
            if (isPlayingRef.current) {
                synthRef.current.cancel();
                if (!synthRef.current.speaking) {
                    // If not, manually call the onend function
                    if (utterance.current !== null) utterance.current.onend = null;
                    handlePlayingEnd();
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
                    handlePlayingEnd();
                };
                synthRef.current.speak(utterance.current);
                setIsPlaying(true);
                isPlayingRef.current = true;
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
                case StoryElementType.Place:
                return <div/>
            case StoryElementType.Text:
                    const textArea = <textarea className="chat-bubble" value={element.content}

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
                    return <audio ref={audioRef} controls  src={element.content} loop
                                  onLoadedData={() => {
                                      if (shouldPlayOnLoad.current) {
                                          play(false);
                                      }
                                  }}/>;
                default:
                    return null;
            }
        };


        return (<>
                {!isHidden &&
                    <div className="story-element" ref={elementRef}>
                        {renderContent()}
                        <div className={"buttons-container"}>
                            {isEditable && onElementEdit && (element.type === StoryElementType.Image || element.type === StoryElementType.Drawing) &&
                                <button className={"button"} onClick={() => onElementEdit()}><FontAwesomeIcon icon={faEdit} /></button>
                            }
                            {isEditable && onElementDelete && <button className={"button"} onClick={() => onElementDelete()}><FontAwesomeIcon icon={faTrashAlt} color={"#FF6347"} /></button>}

                            {isEditable && onUp && element.index > 1 &&
                                <button className={"button"} onClick={onUp}><FontAwesomeIcon icon={faArrowUp} /></button>
                            }
                            {isEditable && onDown && !isLast &&
                                <button className={"button"} onClick={onDown}><FontAwesomeIcon icon={faArrowDown} /></button>
                            }
                        </div>
                    </div>
                }
            </>
        );
    });

export default StoryElementComponent;
