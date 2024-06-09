import React, {useContext, useEffect, useRef} from "react";
import "./StoryComponent.css"

import {Story} from "../../../../shared/sharedTypes.ts";
import StoryUserComponent, {StoryUserComponentHandles} from "../StoryUserComponent/StoryUserComponent.tsx";
import {getStoryElementsForEachUser} from "./StoryComponent.ts";
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import {LobbyContext} from "../../LobbyContext.tsx";


function ResultsStoryComponent({
                                   story,
                                   shownUserIndex,
                                   onPlayingEnd
                               }: {
    story: Story,
    shownUserIndex: number,
    onPlayingEnd: () => void
}) {
    const lobby = useContext(LobbyContext);
    // const [isPlaying, setIsPlaying] = useState(false);
    const alreadyPlayedRef = useRef(false);

    const storyUserComponentRefs = useRef(new Map<number, StoryUserComponentHandles>());

    const getStoryUserComponentsMap = () => {
        if (!storyUserComponentRefs.current) {
            // Initialize the Map on first usage.
            storyUserComponentRefs.current = new Map();
        }
        return storyUserComponentRefs.current;
    };



    useEffect(() => {
        alreadyPlayedRef.current = false;
        // setIsPlaying(false);
        handlePlay(shownUserIndex);
    }, [story, shownUserIndex]);

    const handlePlayingEnd = () => {
        if(!alreadyPlayedRef.current && onPlayingEnd) onPlayingEnd();
        alreadyPlayedRef.current = true;
        // setIsPlaying(false);
    };


    const handlePlay = (index: number) => {
        if(!lobby) return;
        // setIsPlaying(true);
        getStoryUserComponentsMap().get(index)?.play(lobby.lobbySettings.withTextToSpeech, true);
    };

    // const handleStop = (index: number) => {
    //     getStoryUserComponentsMap().get(index)?.stop();
    // }

    return (
        <div className="story-page">

            {getStoryElementsForEachUser(story.elements).map((elements, index) => {

                return (
                    <React.Fragment key={index}>
                        {/*{index === shownUserIndex && !autoPlay &&*/}
                        {/*    (!isPlaying ?*/}
                        {/*            <button onClick={() => handlePlay(index)}>*/}
                        {/*                <FontAwesomeIcon icon={faPlay} size="2x" />*/}
                        {/*            </button>*/}
                        {/*            :*/}
                        {/*            <button onClick={() => handleStop(index)}>*/}
                        {/*                <FontAwesomeIcon icon={faStop} size="2x" />*/}
                        {/*            </button>*/}
                        {/*    )*/}
                        {/*}*/}
                        <StoryUserComponent key={shownUserIndex}
                            elements={elements}
                                            isEditable={false}
                                            ref={(node) => {
                                                const map = getStoryUserComponentsMap();
                                                if (node) {
                                                    map.set(index, node);
                                                } else {
                                                    map.delete(index);
                                                }
                                            }}
                                            resultsProps={{
                                                onPlayingEnd: (index === shownUserIndex) ? () => {
                                                    handlePlayingEnd()
                                                } : () => {},
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