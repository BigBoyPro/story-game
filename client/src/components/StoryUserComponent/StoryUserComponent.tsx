import {PlaceType, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import StoryElementComponent, {StoryElementComponentHandles} from "../StoryElementComponent/StoryElementComponent.tsx";
import React, {createRef, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState} from "react";
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
            onPlayingEnd?: (isLast: boolean) => void
        }
    }, ref: React.Ref<StoryUserComponentHandles>) {
        const lobby = useContext(LobbyContext);
        const isPlayingRef = useRef(false);
        const autoPlayRef = useRef(false);
        const ttsRef = useRef(false);

        const [placeImage, setPlaceImage] = useState((elements.find(element => element.type === StoryElementType.Place)?.content as PlaceType) || PlaceType.None);

        useEffect(() => {
            setPlaceImage((elements.find(element => element.type === StoryElementType.Place)?.content as PlaceType) || PlaceType.None);
        }, [elements]);



        useImperativeHandle(ref, () => ({
            play,
            stop
        }));
        const play = (tts: boolean, autoPlay: boolean) => {
            autoPlayRef.current = autoPlay;
            ttsRef.current = tts;
            if (!isPlayingRef.current) {
                StoryElementComponentRefs.current[shownElementIndex + 1]?.play(tts);
                setShownElementIndex(shownElementIndex + 1);
                isPlayingRef.current = true;
            }
        }
        const stop = () => {
            StoryElementComponentRefs.current[shownElementIndex]?.stop();
        }

        const StoryElementComponentRefs = useRef<StoryElementComponentHandles[]>([]);
        const [shownElementIndex, setShownElementIndex] = useState(onPlayingEnd ? -1 : elements.length - 1);
        const handlePlayingEnd = (index: number) => {
            if (autoPlayRef.current && index < elements.length - 1) {
                setTimeout(() => {
                    setShownElementIndex(index + 1);
                    StoryElementComponentRefs.current[index + 1]?.play(ttsRef.current);
                }, 500);
            } else {
                autoPlayRef.current = false;
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
                    <div className="story-element"
                     style={{
                        backgroundImage: `url(${placeImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}>
                        {!isEditable && elements.length > 0 &&
                            <h3>{getUserNameFromId(elements[0].userId)}'s story</h3>
                        }
                        {elements.map((element, index) => (
                            <StoryElementComponent key={index}
                                                   ref={(el) => {
                                                       if (StoryElementComponentRefs.current[index] !== el && el)
                                                           StoryElementComponentRefs.current[index] = el;
                                                   }}
                                                   element={element}
                                                   isHidden={!isEditable && onPlayingEnd && (index > shownElementIndex)}
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