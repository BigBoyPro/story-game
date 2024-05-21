import {Story, StoryElement} from "../../../shared/sharedTypes.ts";
import {useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import StoryComponent from "../components/StoryComponent/StoryComponent.tsx";
import {
    onStory,
    onGetStoryElements,
    submitStoryElements,
    offStory,
    offGetStoryElements, unsubmitStoryElements
} from "../utils/socketService.ts";
import TimerComponent from "../components/TimerComponent/TimerComponent.tsx";
import {Page, redirection} from "../App.tsx";


function GameView() {
    const navigate = useNavigate();
    const lobby = useContext(LobbyContext);
    const [story, setStory] = useState<Story | null>(null);
    const [newStoryElements, setNewStoryElements] = useState<StoryElement[]>([]);


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
        if (newStoryElements.length > 0) {
            console.log("sending story elements", newStoryElements);
            submitStoryElements(lobby.code, newStoryElements);
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
            <div className="game-box">
                <h2>Write your own story! Round : {lobby?.round}/{lobby?.users.length}</h2>
                {lobby?.roundStartAt && lobby?.roundEndAt &&
                    <TimerComponent start={lobby.roundStartAt} end={lobby.roundEndAt}/>}
                {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
                {story && <StoryComponent key={story.id} story={story}
                                          storyElementsState={
                                              [
                                                  newStoryElements,
                                                  setNewStoryElements,
                                                  handleSaveStoryElements,
                                                  handleCancelStoryElements
                                              ]
                                          }/>}
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