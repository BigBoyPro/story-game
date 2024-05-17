import {Lobby, Story} from "../../../shared/sharedTypes.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import {
    onEndGame,
    onStoryAtPart,
    requestEndGame,
    offEndGame,
    offStories,
    userId, requestGetStoryAtPart, requestNextPart, onPart
} from "../utils/socketService.ts";
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";


const redirection = (lobby: null | Lobby, navigate: NavigateFunction) => {
    if (lobby && lobby.users.find(user => user.id === userId)) {
        if (lobby.round == 0) {
            navigate("/lobby", {replace: true});
        } else if(lobby.round > 0){
            navigate("/game", {replace: true});
        }
    }else{
        navigate("/", {replace: true})
    }
};

function ResultsView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
    const [story, setStory] = useState<Story | null>(null);
    const [userIndex, setUserIndex] = useState<number>(0);
    useEffect(() => {
        redirection(lobby, navigate);

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
            redirection(lobby, navigate);
        });

        if(lobby && !story) requestGetStoryAtPart(lobby.code)

        return () => {
            offStories()
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
      <div className="game-page">
          { lobby && story &&
            <div className="game-box">
                <h2>Results</h2>
                <div className="story-box">
                    <h3>{story.name}</h3>
                    <StoryComponent key={story.id} story={story} userIndexToShow={userIndex}/>
                </div>
                { (story.index < (lobby.users.length - 1) || userIndex < (lobby.users.length - 1)) ?
                    <button onClick={handleNextUser} disabled={lobby?.hostUserId !== userId}>Next Story</button>
                    :
                    <button onClick={handleEndGame} disabled={lobby?.hostUserId !== userId}>End</button>
                }
            </div>
          }
      </div>
  );
}

export default ResultsView;