import {Story} from "../../../shared/sharedTypes.ts";
import {useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
// import './ResultsView.css';
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
    const [isPlaying, setIsPlaying] = useState(true);
    useEffect(() => {
        redirection(lobby, navigate, Page.Results);

        onStoryAtPart(({story, userIndex}) => {
            setStory(story);
            setUserIndex(userIndex);
            console.log('Story at part', story, userIndex);
        });

        onPart((userIndex) => {
            setUserIndex(userIndex);
            console.log('Part', userIndex);
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
      <div className="results-page">
          { lobby && story &&
            <div className="game-box">
                <h2>Results</h2>
                <div className="story-box">
                    <h3>{story.name}</h3>
                    <ResultsStoryComponent key={story.id} story={story} shownUserIndex={userIndex}
                                    onPlayingEnd={() => setIsPlaying(false)}
                    />
                </div>
                { !isPlaying &&
                    ((story.index < (lobby.users.length - 1) || userIndex < (lobby.users.length - 1)) ?
                    <button onClick={handleNextUser} disabled={lobby?.hostUserId !== userId}>Next Story</button>
                    :
                    <button onClick={handleEndGame} disabled={lobby?.hostUserId !== userId}>End</button>)
                }
            </div>
          }
      </div>
  );
}

export default ResultsView;