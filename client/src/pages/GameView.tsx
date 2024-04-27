import {Lobby, Story, StoryElement} from "../../../shared/sharedTypes.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";
import {getStory, requestStory, sendStoryElements} from "../utils/socketService.ts";

const redirection = (lobby: null | Lobby, navigate: NavigateFunction) => {
    if (lobby) {
        if (lobby.round == 0) {
            navigate("/lobby", {replace: true});
        } else if (lobby.round > 1) {
            console.log('navigating to game')
            navigate("/game", {replace: true});
        }
    }
};

function GameView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
    const [story, setStory] = useState<Story | null>(null);

    useEffect(() => {
        redirection(lobby, navigate);

        getStory((story) => {
            setStory(story);
            console.log('Story:', story);
        });

        if (lobby) requestStory(lobby.code)


    }, [lobby, navigate]);

    const OnFinish = (newStoryElements : Array<StoryElement>) => {
        console.log(newStoryElements);
        if (!lobby || !story) {
            redirection(lobby, navigate);
            return;
        }
        sendStoryElements(lobby.code, story.id , newStoryElements);
        // reset StoryComponent
    }

  return(
      <div className="game-page">
          <div className="game-box">
              <h2>Write your own story!</h2>
              {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
              { story &&
                  <>
                      <StoryComponent story={story}/>
                      <StoryComponent story={story} onFinish={OnFinish}/>
                  </>
              }
          </div>
          <div className="side-bar">
              {lobby?.users && lobby.users.map(user =>
                  <div key={user.id} className="user-box">
                      {user.nickname}
                  </div>
              )}
          </div>
      </div>
  );
}

export default GameView;