import {Lobby, Story} from "../../../shared/sharedTypes.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import {
    getEndGame,
    getNextStory,
    requestEndGame,
    requestNextStory, unmountEndGame,
    unmountNextStory,
    userId
} from "../utils/socketService.ts";
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";

const redirection = (lobby: null | Lobby, navigate: NavigateFunction) => {
    if (lobby) {
        if (lobby.round == 0) {
            navigate("/lobby", {replace: true});
        } else if(lobby.round <= lobby.users.length){
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

    useEffect(() => {
        redirection(lobby, navigate);

        getNextStory((story) => {
            setStory(story);
            console.log('Story:', story);
        });

        getEndGame(() => {
            console.log('Game Ended');
            setStory(null);
            if(lobby) {
                lobby.usersSubmitted = 0 ;
                lobby.round = 0;
            }
            redirection(lobby, navigate);
        });

        if(lobby && !story) requestNextStory(lobby.code,0)

        return () => {
            unmountNextStory()
            unmountEndGame()
        }
    }, [lobby, navigate]);


    const handleNextStory = () => {
        if (!lobby) return;
        requestNextStory(lobby.code, story? story.index  + 1 : 0)
    };

    const handleEndGame = () => {
        if(!lobby) return;
        requestEndGame(lobby.code)
    };

    return(
      <div className="game-page">
          { lobby && story &&
            <div className="game-box">
                <h2>Results</h2>
                <div className="story-box">
                    <h3>{story.name}</h3>
                    <StoryComponent key={story.id} story={story}/>
                </div>
                {story.index !== lobby?.users.length - 1 ?
                    <button onClick={handleNextStory} disabled={lobby?.hostUserId !== userId}>Next Story</button>
                    :
                    <button onClick={handleEndGame} disabled={lobby?.hostUserId !== userId}>End</button>
                }
            </div>
          }
      </div>
  );
}

export default ResultsView;