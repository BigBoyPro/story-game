import {Lobby, Story, StoryElement} from "../../../shared/sharedTypes.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useContext, useEffect, useRef, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";
import {
    onStory,
    onGetStoryElements,
    submitStoryElements,
    offStory,
    userId,
    offGetStoryElements, unsubmitStoryElements
} from "../utils/socketService.ts";
import TimerComponent from "../components/TimerComponent/TimerComponent.tsx";

const redirection = (lobby: null | Lobby, navigate: NavigateFunction) => {
    if (lobby && lobby.users.find(user => user.id === userId)) {
        if (lobby.round == 0) {
            navigate("/lobby", {replace: true});
        } else if(lobby.round < 0){
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
    // const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const newStoryElementsRef = useRef<StoryElement[]>([]);

    useEffect(() => {
        redirection(lobby, navigate);

        onStory((story) => {
            setStory(story);
        });

        onGetStoryElements(() => {
            console.log('Get story elements');
            onFinish();
        });


        return () => {
            offStory();
            offGetStoryElements();
        }
    }, [lobby, lobby?.roundStartAt, lobby?.roundEndAt, navigate, story]);

    const onFinish = () => {
        console.log('onFinish');
        if(!lobby) {
            console.log('lobby does not exist',lobby);
            return;
        }
        if(!story) {
            console.log('story does not exist',story);
            return;
        }
        console.log('lobby and story exist');
        if(newStoryElementsRef.current.length > 0){
            console.log("sending story elements", newStoryElementsRef.current);
            submitStoryElements(lobby.code, newStoryElementsRef.current);
        }
    }

    const onCancel = () => {
        console.log('onCancel');
        if(!lobby) {
            console.log('lobby does not exist',lobby);
            return;
        }
        unsubmitStoryElements(lobby.code);
    }
  return(
      <div className="game-page">
          <div className="game-box">
              <h2>Write your own story!             Round : {lobby?.round}/{lobby?.users.length}</h2>
              {lobby?.roundStartAt && lobby?.roundEndAt && <TimerComponent start={lobby.roundStartAt} end={lobby.roundEndAt}/>}
              {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
              { story && <StoryComponent key={story.id} story={story} onFinish={onFinish} onCancel={onCancel} onNewStoryElementsChange={(newStoryElements) => newStoryElementsRef.current = newStoryElements}/>}
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