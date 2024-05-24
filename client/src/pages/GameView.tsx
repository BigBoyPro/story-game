import {Lobby, Story, StoryElement, StoryElementType} from "../../../shared/sharedTypes.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useContext, useEffect, useRef, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import CrownIcon from '../pages/assets/theCrown.png';
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";
import TimerComponent from "../components/TimerComponent/TimerComponent.tsx";
import {
    onStory,
    onGetStoryElements,
    sendStoryElements,
    offStory,
    userId,
    offGetStoryElements
} from "../utils/socketService.ts";


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
    const user = lobby?.users.find(user => user.id === userId);
    const [story, setStory] = useState<Story | null>(null);
    // const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const newStoryElementsRef = useRef<StoryElement[]>([]);
    useEffect(() => {
        redirection(lobby, navigate);

        onStory((story) => {
            const showStory = story.elements.length == 0 || story.elements[story.elements.length - 1].userId != userId;
            console.log('Story received:', story, showStory);
            // don't set story if the last story element is from the current user
            if (showStory) {
                setStory(story);
            }
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
            sendStoryElements(lobby.code, newStoryElementsRef.current);
        } else {
            const storyElement: StoryElement = {
                index: newStoryElementsRef.current.length,
                userId: userId,
                storyId: story.id,
                round: lobby.round,
                type: StoryElementType.Empty,
                content: ""
            }
            console.log("sending empty story element");
            sendStoryElements(lobby.code, [storyElement]);
        }
        setStory(null);
    }

  return(
      <div className="game-page" >
          <div className={"video-background-container"}>


              <video autoPlay loop muted className={"video-background"}>
                  <source src="../GameVideo.mp4" type="video/mp4" />
              </video>

              <div className="current-user-bar">
                  <h2>Current user</h2>
                  <div className={"current-user"}>
                      {user?.nickname}
                  </div>
              </div>

              <div className="game-box">
                  <h2>Round : {lobby?.round}/{lobby?.users.length}</h2>
                  {lobby?.roundStartAt && lobby?.roundEndAt && <TimerComponent start={lobby.roundStartAt} end={lobby.roundEndAt}/>}
                  {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
                  { story && <StoryComponent key={story.id} story={story} onFinish={onFinish} onNewStoryElementsChange={(newStoryElements) => newStoryElementsRef.current = newStoryElements}/>}
              </div>

              <div className="side-bar">
                  <h2>Players</h2>
                  {lobby?.users && lobby.users.map(user =>
                      <div key={user.id} className="user-box">
                          {(lobby?.hostUserId === user.id) && <img src={CrownIcon} alt="Crown" className="crown-icon crown-icon-small" />}
                          {user.nickname}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
}

export default GameView;