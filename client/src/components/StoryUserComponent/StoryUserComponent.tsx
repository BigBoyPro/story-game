import {StoryElement} from "../../../../shared/sharedTypes.ts";
import StoryElementComponent, {StoryElementComponentHandles} from "../StoryElementComponent/StoryElementComponent.tsx";
import React, {createRef, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState} from "react";
import {LobbyContext} from "../../LobbyContext.tsx";


export interface StoryUserComponentHandles {
    play: (tts: boolean, autoPlay: boolean) => void;
}

const StoryUserComponent = forwardRef(
    function StoryUserComponent({
                                    elements,
                                    isEditable,
                                    isHidden = false,
                                    onElementChange,
                                    onElementDelete,
                                    onElementEdit,
                                    onUp,
                                    onDown,
                                    onPlayingEnd
                                }: {
        elements: StoryElement[],
        isEditable: boolean,
        isHidden?: boolean
        onElementChange?: (index: number, newElement: StoryElement) => void,
        onElementDelete?: (index: number) => void,
        onElementEdit?: (index: number) => void,
        onUp?: (index: number) => void,
        onDown?: (index: number) => void,
        onPlayingEnd?: (isLast: boolean) => void
    }, ref: React.Ref<StoryUserComponentHandles>) {
        const lobby = useContext(LobbyContext);
        const isPlayingRef = useRef(false);
        const autoPlayRef = useRef(false);
        const ttsRef = useRef(false);

        useImperativeHandle(ref, () => ({
            play,
        }));
        const play = (tts: boolean, autoPlay: boolean) => {
            autoPlayRef.current = autoPlay;
            ttsRef.current = tts;
            if(!isPlayingRef.current) {
                isPlayingRef.current = true;
                StoryElementComponentRefs.current[shownElementIndex + 1]?.play(tts);
                setShownElementIndex(shownElementIndex + 1);
            }
        }

        const StoryElementComponentRefs = useRef<StoryElementComponentHandles[]>([]);
        const [shownElementIndex, setShownElementIndex] = useState(-1);
        const handlePlayingEnd = (index: number) => {
            if(!isPlayingRef.current) return;

            if (autoPlayRef.current && index < elements.length - 1) {
                setTimeout(() => {
                    setShownElementIndex(index + 1);
                    StoryElementComponentRefs.current[index + 1]?.play(ttsRef.current);
                }, 500);
            } else {
                isPlayingRef.current = false;
                onPlayingEnd && onPlayingEnd(index === elements.length - 1);
            }
        }

        useEffect(() => {
            StoryElementComponentRefs.current = elements.map((_, i) => StoryElementComponentRefs.current[i] ?? createRef<StoryElementComponentHandles>());
        }, [elements]);


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
                        {elements.map((element, index) => (
                            <StoryElementComponent ref={(el) => {
                                if (StoryElementComponentRefs.current[index] !== el && el)
                                    StoryElementComponentRefs.current[index] = el;
                            }}
                                                   key={index}
                                                   element={element}
                                                   isHidden={!isEditable && shownElementIndex !== -1 && (index > shownElementIndex)}
                                                   isEditable={isEditable}
                                                   onElementChange={onElementChange ? (newElement) => onElementChange(index, newElement) : undefined}
                                                   onElementDelete={onElementDelete ? () => onElementDelete(index) : undefined}
                                                   onElementEdit={onElementEdit ? () => onElementEdit(index) : undefined}
                                                   isLast={index === elements.length - 1}
                                                   onUp={() => onUp ? onUp(index) : undefined}
                                                   onDown={() => onDown ? onDown(index) : undefined}
                                                   onPlayingEnd={() => handlePlayingEnd(index)}/>
                        ))}
                    </div>
                }
            </>
        );
    });

export default StoryUserComponent;