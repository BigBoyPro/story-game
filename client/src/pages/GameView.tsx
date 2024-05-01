import {Lobby, Story, StoryElement, StoryElementType} from "../../../shared/sharedTypes.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useContext, useEffect, useRef, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";
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
        } else if(lobby.round == -1){
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

   const newStoryElementsRef = useRef<StoryElement[]>([]);
    useEffect(() => {
        console.log('redirecting',story);
        redirection(lobby, navigate);
        console.log('redirected',story);

        onStory((story) => {
            console.log('Story received:', story);

            // don't set story if the last story element is from the current user
            if (story.elements.length == 0 || story.elements[story.elements.length - 1].userId != userId) {
                console.log('Setting story');
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
    }, [lobby, navigate, story]);

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
          <div className="game-box">
              <h2>Write your own story!             Round : {lobby?.round}/{lobby?.users.length}</h2>
              {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
              { story && <StoryComponent key={story.id} story={story} onFinish={onFinish} onNewStoryElementsChange={(newStoryElements) => newStoryElementsRef.current = newStoryElements}/>}
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