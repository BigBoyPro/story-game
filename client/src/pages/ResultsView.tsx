import {Story} from "../../../shared/sharedTypes.ts";
import {useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './ResultsView.css';
// import backgroundImage from "../assets/backgrounds/ResultsView.png";
import ResultVideo from "../assets/backgrounds/ResultView.mp4";

import {
    onEndGame,
    onStoryAtPart,
    requestEndGame,
    offEndGame,
    userId, requestGetStoryAtPart, requestNextPart, onPart, offStoryAtPart, offPart
} from "../utils/socketService.ts";
import {Page, redirection} from "../App.tsx";
import ResultsStoryComponent from "../components/StoryComponent/ResultsStoryComponent.tsx";



function ResultsView() {
    const navigate = useNavigate();
    const lobby = useContext(LobbyContext);
    const [story, setStory] = useState<Story | null>(null);
    const [userIndex, setUserIndex] = useState<number>(0);
    const [storiesCount, setStoriesCount] = useState<number>(lobby?.users.length || 0);
    const [isPlaying, setIsPlaying] = useState(true);
    useEffect(() => {
        redirection(lobby, navigate, Page.Results);

        onStoryAtPart(({story, userIndex, storiesCount}) => {
            setStory(story);
            setUserIndex(userIndex);
            setStoriesCount(storiesCount);
            console.log('Story at part', story, userIndex);
            console.log('Stories Count', storiesCount);
        });

        onPart(({userIndex, storiesCount}) => {
            setUserIndex(userIndex);
            setStoriesCount(storiesCount);
            console.log('Part', userIndex);
            console.log('Stories Count', storiesCount);
        });

        onEndGame(() => {
            console.log('Game Ended');
            setStory(null);
            if(lobby) {
                lobby.usersSubmitted = 0;
                lobby.round = 0;
            }
            redirection(lobby, navigate, Page.Lobby);
        });

        if(lobby && !story) requestGetStoryAtPart(lobby.code)

        return () => {
            offStoryAtPart()
            offPart()
            offEndGame()
        }
    }, [lobby, navigate]);


    const handleNextUser = () => {
        if (!lobby) return;
        requestNextPart(lobby.code)
    };

    const handleEndGame = () => {
        if(!lobby) return;
        console.log('ending game')
        requestEndGame(lobby.code)
    };

    return(

        <>
                <video autoPlay loop muted className={"background"}>
                    <source src={ResultVideo} type="video/mp4"/>
                </video>

                <div className="results-page">
                    { lobby && story &&
                        <div className="game-box-results">
                            <h2>Results</h2>
                        <div className="story-box-results">

                        <h3>{story.name}</h3>

                        <ResultsStoryComponent key={story.id} story={story} shownUserIndex={userIndex}
                                            onPlayingEnd={() => setIsPlaying(false)}
                        />

                        </div>
                            { !isPlaying &&
                                ((story.index < (storiesCount - 1) || userIndex < (storiesCount - 1)) ?
                                <button className={"button"} onClick={handleNextUser} disabled={lobby?.hostUserId !== userId}>Next Story</button>
                                :
                                <button className={"button"} onClick={handleEndGame} disabled={lobby?.hostUserId !== userId}>End</button>)
                            }
                        </div>
                    }
              </div>
        </>
  );
}

export default ResultsView;