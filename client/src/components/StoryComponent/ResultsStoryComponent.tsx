import React, {createRef, useEffect, useRef, useState} from "react";
import "./StoryComponent.css"
import {Story} from "../../../../shared/sharedTypes.ts";
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

    const [autoPlay, setAutoPlay] = useState(false);
    const [tts, setTTS] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [canPlay, setCanPlay] = useState(true);

    const storyUserElementComponentRefs = useRef<StoryUserComponentHandles[]>([]);
    useEffect(() => {
        storyUserElementComponentRefs.current = story.elements.map((_, i) => storyUserElementComponentRefs.current[i] ?? createRef<StoryElementComponentHandles>());
    }, [story]);

    const handlePlayingEnd = (isLast : boolean) => {
            setCanPlay(!isLast)
            if (isLast && onPlayingEnd) onPlayingEnd();
            setIsPlaying(false);
    };
    const handlePlay = (index: number) => {
        setIsPlaying(true);
        storyUserElementComponentRefs.current[index]?.play(tts, false);
    };
    const handleStop = (index: number) => {
        storyUserElementComponentRefs.current[index]?.stop();
        setIsPlaying(false);
    }

    return (
        <div className="story-page">
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

            {getStoryElementsForEachUser(story.elements).map((elements, index, array) => {


                return (
                    <React.Fragment key={index}>
                        <StoryUserComponent elements={elements}
                                            isEditable={false}
                                            ref={(el) => {
                                                if (storyUserElementComponentRefs.current[index] !== el && el) {
                                                    storyUserElementComponentRefs.current[index] = el;
                                                    if (autoPlay && index === array.length - 1) setTimeout(() => el.play(tts, true), 1000);
                                                }
                                            }}
                                            resultsProps={{
                                                onPlayingEnd: (isLast) => {if (index === array.length - 1) handlePlayingEnd(isLast)},
                                                isHidden: shownUserIndex !== undefined ? (index > shownUserIndex) : false,
                                            }}
                        />
                        {!autoPlay && index === array.length - 1 && canPlay &&
                            (!isPlaying ?
                                    <button onClick={() => handlePlay(index)}>Play</button>
                                    :
                                    <button onClick={() => handleStop(index)}>Stop</button>
                            )
                        }
                    </React.Fragment>
                );
            })}
        </div>
    )
}

export default ResultsStoryComponent;