import {PlaceType, StoryElement, StoryElementType} from "../../../../shared/sharedTypes.ts";
import StoryElementComponent, {StoryElementComponentHandles} from "../StoryElementComponent/StoryElementComponent.tsx";
import React, {forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState} from "react";
import {LobbyContext} from "../../LobbyContext.tsx";
import {userId} from "../../utils/socketService.ts";
import './StoryUserComponent.css';

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

        const [placeImage, setPlaceImage] = useState((elements.find(element => element.type === StoryElementType.Place)?.content as PlaceType) || PlaceType.None);

        useEffect(() => {
            setPlaceImage((elements.find(element => element.type === StoryElementType.Place)?.content as PlaceType) || PlaceType.None);
        }, [elements]);


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
        const [playingEndedIndex, setPlayingEndedIndex] = useState(shownElementIndex - 1)

        const play = (tts: boolean, autoPlay: boolean) => {
            autoPlayRef.current = autoPlay;
            ttsRef.current = tts;
            if (!isPlayingRef.current) {
                isPlayingRef.current = true;
                setPlayingEndedIndex(shownElementIndex)
            }
        }

        useEffect(() => {
            setShownElementIndex(prevIndex => {
                if (prevIndex !== playingEndedIndex) return prevIndex;
                const nextIndex = prevIndex + 1;
                if (elements[nextIndex] && elements[nextIndex].type === StoryElementType.Audio) {
                    elements.forEach((element, index) => {
                        element.type === StoryElementType.Audio && getStoryElementComponentsMap().get(index)?.stop();
                    });
                }
                setTimeout(() => {
                    getStoryElementComponentsMap().get(nextIndex)?.play(ttsRef.current);
                }, 0);
                return nextIndex;
            });
        }, [playingEndedIndex]);
        const stop = () => {
            getStoryElementComponentsMap().get(shownElementIndex)?.stop();
        }

        const handlePlayingEnd = (index: number) => {
            if (isPlayingRef.current && autoPlayRef.current && index < elements.length - 1) {
                setTimeout(() => {
                    setPlayingEndedIndex(index)
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
                    <div className="story-user-elements"
                         style={{
                             backgroundImage: `url(${placeImage})`,
                             backgroundSize: 'cover',
                             backgroundPosition: 'center',
                             backgroundRepeat: 'no-repeat'
                    }}>
                        {!isEditable && elements.length > 0 &&
                            (elements[0].userId === userId ?
                                <h3 style= {{ color:'black'}}>Your part:</h3>
                                :
                                (isHidden !== undefined ?
                                        <h3 style= {{ color:'black'}}>{getUserNameFromId(elements[0].userId)}'s part:</h3>
                                        :
                                        <h3 style= {{ color:'black'}}>Previous story part:</h3>
                                ))
                        }
                        {elements.map((element, index) => {
                            return (
                                <StoryElementComponent key={index}
                                                       ref={(node) => {
                                                           const map = getStoryElementComponentsMap();
                                                           if (node) {
                                                               map.set(index, node);
                                                           } else {
                                                               map.delete(index);
                                                           }

                                                       }}
                                                       element={element}
                                                       isHidden={(!isEditable && onPlayingEnd && (element.index > shownElementIndex))
                                                           || element.type === StoryElementType.Place}
                                                       isEditable={isEditable}
                                                       onElementChange={onElementChange ? (newElement) => onElementChange(element.index, newElement) : undefined}
                                                       onElementDelete={onElementDelete ? () => onElementDelete(element.index) : undefined}
                                                       onElementEdit={onElementEdit ? () => onElementEdit(element.index) : undefined}
                                                       isLast={element.index === elements.length - 1}
                                                       onUp={() => onUp ? onUp(element.index) : undefined}
                                                       onDown={() => onDown ? onDown(element.index) : undefined}
                                                       onPlayingEnd={() => handlePlayingEnd(element.index)}/>
                            );
                        })}
                    </div>
                }
            </>
        );
    });

export default StoryUserComponent;