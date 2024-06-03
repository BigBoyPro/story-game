import {StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import StoryElementComponent, {StoryElementComponentHandles} from "../StoryElementComponent/StoryElementComponent.tsx";
import React, {forwardRef, useContext, useImperativeHandle, useRef, useState} from "react";
import {LobbyContext} from "../../LobbyContext.tsx";


export interface StoryUserComponentHandles {
    play: (tts: boolean, autoPlay: boolean) => void;
    stop: () => void;
}

const StoryUserComponent = forwardRef(
    function StoryUserComponent({
                                    elements,
                                    isEditable,
                                    gameProps: {
                                        onElementChange,
                                        onElementDelete,
                                        onElementEdit,
                                        onUp,
                                        onDown
                                    } = {},
                                    resultsProps: {
                                        isHidden,
                                        onPlayingEnd
                                    } = {}
                                }: {
        elements: StoryElement[],
        isEditable: boolean,
        gameProps?: {
            onElementChange?: (index: number, newElement: StoryElement) => void,
            onElementDelete?: (index: number) => void,
            onElementEdit?: (index: number) => void,
            onUp?: (index: number) => void,
            onDown?: (index: number) => void
        },
        resultsProps?: {
            isHidden?: boolean
            onPlayingEnd?: () => void
        }
    }, ref: React.Ref<StoryUserComponentHandles>) {

        const lobby = useContext(LobbyContext);
        const isPlayingRef = useRef(false);
        const autoPlayRef = useRef(false);
        const ttsRef = useRef(false);
        const [shownElementIndex, setShownElementIndex] = useState(onPlayingEnd ? -1 : elements.length - 1);
        const storyElementComponentRefs = useRef(new Map<number, StoryElementComponentHandles>());

        useImperativeHandle(ref, () => ({
            play,
            stop
        }));

        const getStoryElementComponentsMap = () => {
            if (!storyElementComponentRefs.current) {
                // Initialize the Map on first usage.
                storyElementComponentRefs.current = new Map();
            }
            return storyElementComponentRefs.current;
        };

        const play = (tts: boolean, autoPlay: boolean) => {
            autoPlayRef.current = autoPlay;
            ttsRef.current = tts;
            if (!isPlayingRef.current) {
                isPlayingRef.current = true;
                if(elements[shownElementIndex + 1] && elements[shownElementIndex + 1].type === StoryElementType.Audio) {
                    elements.forEach((element) => {
                        element.type === StoryElementType.Audio && getStoryElementComponentsMap().get(element.index)?.stop();
                    });
                }
                getStoryElementComponentsMap().get(shownElementIndex + 1)?.play(tts);
                setShownElementIndex(shownElementIndex + 1);
            }
        }
        const stop = () => {
            getStoryElementComponentsMap().get(shownElementIndex)?.stop();
        }

        const handlePlayingEnd = (index: number) => {
            if (isPlayingRef.current && autoPlayRef.current && index < elements.length - 1) {
                setShownElementIndex(index + 1);
                setTimeout(() => {
                    if(elements[index + 1] && elements[index + 1].type === StoryElementType.Audio) {
                        elements.forEach((element, index) => {
                            element.type === StoryElementType.Audio && getStoryElementComponentsMap().get(index)?.stop();
                        });
                    }
                    getStoryElementComponentsMap().get(index + 1)?.play(ttsRef.current);
                }, 500);
            } else {
                autoPlayRef.current = false;
                isPlayingRef.current = false;
                onPlayingEnd && onPlayingEnd();
            }
        }

        const getUserNameFromId = (userId: string): string => {
            const nickname = lobby?.users.find(user => user.id === userId)?.nickname;
            if (nickname)
                return nickname;
            return "unknown";
        };
        return (
            <>
                {!isHidden &&
                    <div className="story-element">
                        {!isEditable && elements.length > 0 &&
                            <h3>{getUserNameFromId(elements[0].userId)}'s story</h3>
                        }
                        {elements.map((element) => (
                            <StoryElementComponent key={element.index}
                                                   ref={(node) => {
                                                       const map = getStoryElementComponentsMap();
                                                       if (node) {
                                                           map.set(element.index, node);
                                                       } else {
                                                           map.delete(element.index);
                                                       }
                                                   }}
                                                   element={element}
                                                   isHidden={!isEditable && onPlayingEnd && (element.index > shownElementIndex)}
                                                   isEditable={isEditable}
                                                   onElementChange={onElementChange ? (newElement) => onElementChange(element.index, newElement) : undefined}
                                                   onElementDelete={onElementDelete ? () => onElementDelete(element.index) : undefined}
                                                   onElementEdit={onElementEdit ? () => onElementEdit(element.index) : undefined}
                                                   isLast={element.index === elements.length - 1}
                                                   onUp={() => onUp ? onUp(element.index) : undefined}
                                                   onDown={() => onDown ? onDown(element.index) : undefined}
                                                   onPlayingEnd={() => handlePlayingEnd(element.index)}/>
                        ))}
                    </div>
                }
            </>
        );
    });

export default StoryUserComponent;