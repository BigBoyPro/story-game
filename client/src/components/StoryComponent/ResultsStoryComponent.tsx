import React, {createRef, useEffect, useRef, useState} from "react";
import "./StoryComponent.css"
import {PlaceType, Story, StoryElementType} from "../../../../shared/sharedTypes.ts";
import StoryUserComponent, {StoryUserComponentHandles} from "../StoryUserComponent/StoryUserComponent.tsx";
import {StoryElementComponentHandles} from "../StoryElementComponent/StoryElementComponent.tsx";
import {getStoryElementsForEachUser} from "./StoryComponent.ts";


function ResultsStoryComponent({
                                   story,
                                   shownUserIndex,
                                   onPlayingEnd
                               }: {
    story: Story,
    shownUserIndex?: number,
    onPlayingEnd?: () => void
}) {

    const [autoPlay, setAutoPlay] = useState(true);
    const [tts, setTTS] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const alreadyPlayedRef = useRef(false);
    const [canPlay, setCanPlay] = useState(!autoPlay);
    const [placeImage, setPlaceImage] = useState((story.elements.find(element => element.type === StoryElementType.Place)?.content as PlaceType) || PlaceType.None);

    const storyUserElementComponentRefs = useRef<StoryUserComponentHandles[]>([]);
    useEffect(() => {
        storyUserElementComponentRefs.current = story.elements.map((_, i) => storyUserElementComponentRefs.current[i] ?? createRef<StoryElementComponentHandles>());
        setPlaceImage((story.elements.find(element => element.type === StoryElementType.Place)?.content as PlaceType) || PlaceType.None);
    }, [story]);
    useEffect(() => {
        alreadyPlayedRef.current = false;
        setIsPlaying(false);
        setCanPlay(!autoPlay);
    }, [story, shownUserIndex]);

    const handlePlayingEnd = (isLast: boolean) => {
        setCanPlay(!isLast && !autoPlay)
        if (isLast) {
            alreadyPlayedRef.current = true;
            if (onPlayingEnd) onPlayingEnd();
        }
        setIsPlaying(false);
    };
    const handlePlay = (index: number) => {
        setIsPlaying(true);
        storyUserElementComponentRefs.current[index]?.play(tts, true);
    };
    const handleStop = (index: number) => {
        storyUserElementComponentRefs.current[index]?.stop();
        setIsPlaying(false);
    }

    return (
        <div className="story-page"
             style={{
                 backgroundImage: `url(./places/${placeImage}.webp)`,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center',
                 backgroundRepeat: 'no-repeat'
             }}>
            <div>
                <label htmlFor="autoPlay">Auto Play</label>
                <input type="checkbox" checked={autoPlay}
                       onChange={(event) => setAutoPlay(event.target.checked)}/>
            </div>
            <div>
                <label htmlFor="tts">TTS</label>
                <input type="checkbox" checked={tts}
                       onChange={(event) => setTTS(event.target.checked)}/>
            </div>

            {getStoryElementsForEachUser(story.elements).map((elements, index) => {


                return (
                    <React.Fragment key={index}>
                        {index === shownUserIndex && canPlay &&
                            (!isPlaying ?
                                    <button onClick={() => handlePlay(index)}>Play</button>
                                    :
                                    <button onClick={() => handleStop(index)}>Stop</button>
                            )
                        }
                        <StoryUserComponent key={shownUserIndex}
                                            elements={elements}
                                            isEditable={false}
                                            ref={(el) => {
                                                if (storyUserElementComponentRefs.current[index] !== el && el) {
                                                    storyUserElementComponentRefs.current[index] = el;
                                                    if (!alreadyPlayedRef.current && !isPlaying && autoPlay && index === shownUserIndex) {
                                                        setIsPlaying(true)
                                                        setTimeout(() => el.play(tts, true), 1000);
                                                    }
                                                }
                                            }}
                                            resultsProps={{
                                                onPlayingEnd: (index === shownUserIndex) ? (isLast) => {
                                                    handlePlayingEnd(isLast)
                                                } : undefined,
                                                isHidden: shownUserIndex !== undefined ? (index > shownUserIndex) : false,
                                            }}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    )
}

export default ResultsStoryComponent;