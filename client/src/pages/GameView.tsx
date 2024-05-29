import {Story, StoryElement} from "../../../shared/sharedTypes.ts";
import {useNavigate} from "react-router-dom";
import {useContext, useEffect, useRef, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import CrownIcon from '../pages/assets/theCrown.png';
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";
import TimerComponent from "../components/TimerComponent/TimerComponent.tsx";
import {
    onStory,
    onGetStoryElements,
    submitStoryElements,
    offStory,
    offGetStoryElements, unsubmitStoryElements, userId
} from "../utils/socketService.ts";
import {Page, redirection} from "../App.tsx";


function GameView() {
    const navigate = useNavigate();
    const lobby = useContext(LobbyContext);
    const user = lobby?.users.find(user => user.id === userId);
    const [story, setStory] = useState<Story | null>(null);
    const newStoryElementsRef = useRef<StoryElement[]>([]);
    useEffect(() => {
        redirection(lobby, navigate, Page.Game);

        onStory((story) => {
            setStory(story);
        });

        onGetStoryElements(() => {
            console.log('story elements requested!');
            handleSaveStoryElements();
        });


        return () => {
            offStory();
            offGetStoryElements();
        }
    }, [lobby, lobby?.roundStartAt, lobby?.roundEndAt, navigate, story]);

    const handleNewStoryElementsChange = (newStoryElements: StoryElement[]) => {
        newStoryElementsRef.current = newStoryElements;
    }

    const handleSaveStoryElements = () => {
        if (!lobby) {
            console.log('lobby does not exist', lobby);
            return;
        }
        if (!story) {
            console.log('story does not exist', story);
            return;
        }
        console.log('lobby and story exist');
        if (newStoryElementsRef.current.length > 0) {
            console.log("sending story elements", newStoryElementsRef.current);
            submitStoryElements(lobby.code, newStoryElementsRef.current);
        }
    }

    const handleCancelStoryElements = () => {
        console.log('onCancel');
        if (!lobby) {
            console.log('lobby does not exist', lobby);
            return;
        }
        unsubmitStoryElements(lobby.code);
    }


    return (
        <div className="game-page">
            <div className={"video-background-container"}>

                <video autoPlay loop muted className={"video-background"}>
                    <source src="../GameVideo.mp4" type="video/mp4" />
                </video>

                <div className="side-bar">
                    <h2>Players</h2>
                    {lobby?.users && lobby.users.map(user =>
                        <div key={user.id} className="user-box">
                            {(lobby?.hostUserId === user.id) && <img src={CrownIcon} alt="Crown" className="crown-icon crown-icon-small" />}
                            {user.nickname}
                        </div>
                    )}
                </div>

                <div className="current-user-bar">
                    <h2>Current user</h2>
                    <div className={"current-user"}>
                        {user?.nickname}
                    </div>
                </div>

                <div className={"round-box"}>
                    <h2>Round :</h2>
                    <div className={"round"}>{lobby?.round}/{lobby?.users.length}</div>
                </div>

                <div className={"timer-box"}>
                    <h2>Timer :</h2>
                    {lobby?.roundStartAt && lobby?.roundEndAt && <TimerComponent start={lobby.roundStartAt} end={lobby.roundEndAt}/>}
                </div>

                <div className="game-box">
                  {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
                  { story && <StoryComponent key={story.id} story={story} isEditable={true}
                                    initialNewStoryElements={story.elements.filter(element => element.userId === userId)}
                                    onNewStoryElementsChange={handleNewStoryElementsChange}
                                    onSave={handleSaveStoryElements}
                                    onCancel={handleCancelStoryElements}
                    />
                }
              </div>
          </div>
      </div>
  );
}

export default GameView;