import React, {useEffect, useRef, useState} from "react";
import "./StoryComponent.css"
import {Story} from "../../../../shared/sharedTypes.ts";
import StoryUserComponent, {StoryUserComponentHandles} from "../StoryUserComponent/StoryUserComponent.tsx";
import {getStoryElementsForEachUser} from "./StoryComponent.ts";


function ResultsStoryComponent({
                                   story,
                                   shownUserIndex,
                                   onPlayingEnd
                               }: {
    story: Story,
    shownUserIndex: number,
    onPlayingEnd: () => void
}) {

    const [autoPlay, setAutoPlay] = useState(true);
    const [tts, setTTS] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const alreadyPlayedRef = useRef(false);
    const [canPlay, setCanPlay] = useState(!autoPlay);

    const storyUserComponentRefs = useRef(new Map<number, StoryUserComponentHandles>());

    const getStoryUserElementComponentsMap = () => {
        if (!storyUserComponentRefs.current) {
            // Initialize the Map on first usage.
            storyUserComponentRefs.current = new Map();
        }
        return storyUserComponentRefs.current;
    };

    useEffect(() => {
        alreadyPlayedRef.current = false;
        setIsPlaying(false);
        setCanPlay(!autoPlay);
        if(autoPlay){
            handlePlay(shownUserIndex);
        }
    }, [story, shownUserIndex]);

    const handlePlayingEnd = () => {
        setCanPlay(!autoPlay)
        if(!alreadyPlayedRef.current && onPlayingEnd) onPlayingEnd();
        alreadyPlayedRef.current = true;
        setIsPlaying(false);
    };

    const handlePlay = (index: number) => {
        setIsPlaying(true);
        getStoryUserElementComponentsMap().get(index)?.play(tts, true);
    };

    const handleStop = (index: number) => {
        getStoryUserElementComponentsMap().get(index)?.stop();
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
                        <StoryUserComponent elements={elements}
                                            isEditable={false}
                                            ref={(node) => {
                                                const map = getStoryUserElementComponentsMap();
                                                if (node) {
                                                    map.set(index, node);
                                                } else {
                                                    map.delete(index);
                                                }
                                            }}
                                            resultsProps={{
                                                onPlayingEnd: (index === shownUserIndex) ? () => {
                                                    handlePlayingEnd()
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