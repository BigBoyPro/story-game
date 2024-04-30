import {Lobby, Story, StoryElement} from "../../../shared/sharedTypes.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";
import {getStory, sendStoryElements, unmountStory, userId} from "../utils/socketService.ts";

const redirection = (lobby: null | Lobby, navigate: NavigateFunction) => {
    if (lobby && lobby.users.find(user => user.id === userId)) {
        if (lobby.round == 0) {
            navigate("/lobby", {replace: true});
        } else if(lobby.round > lobby.users.length){
            navigate("/results", {replace: true});
        }
    }else{
        navigate("/", {replace: true})
    }
};

function GameView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
    const [story, setStory] = useState<Story | null>(null);
    useEffect(() => {
        redirection(lobby, navigate);

        getStory((story) => {
            console.log('Story received:', story);

            // don't set story if the last story element is from the current user
            if (story.elements.length == 0 || story.elements[story.elements.length - 1].userId != userId) {
                setStory(story);
            }
        });

        return () => {
            unmountStory();
        }
    }, [lobby, navigate]);

    const OnFinish = (newStoryElements : Array<StoryElement>) => {
        console.log(newStoryElements);
        if (!lobby || !story) return;
        console.log('sending story elements');
        sendStoryElements(lobby.code, newStoryElements);
        setStory(null);
    }

  return(
      <div className="game-page" >
          <div className="game-box">
              <h2>Write your own story!             Round : {lobby?.round}/{lobby?.users.length}</h2>
              {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
              { story && <StoryComponent story={story} onFinish={OnFinish}/>}
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