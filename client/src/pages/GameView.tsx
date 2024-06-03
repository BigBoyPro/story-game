import {Story, StoryElement} from "../../../shared/sharedTypes.ts";
import {useNavigate} from "react-router-dom";
import {useContext, useEffect, useRef, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import {
    onStory,
    onGetStoryElements,
    submitStoryElements,
    offStory,
    offGetStoryElements, unsubmitStoryElements, userId
} from "../utils/socketService.ts";
import TimerComponent from "../components/TimerComponent/TimerComponent.tsx";
import {Page, redirection} from "../App.tsx";
import GameStoryComponent, {GameStoryComponentHandles} from "../components/StoryComponent/GameStoryComponent.tsx";

function GameView() {
    const navigate = useNavigate();
    const lobby = useContext(LobbyContext);
    const [story, setStory] = useState<Story | null>(null);
    const newStoryElementsRef = useRef<StoryElement[]>([]);
    const storyComponentRef = useRef<GameStoryComponentHandles>(null);
    useEffect(() => {
        redirection(lobby, navigate, Page.Game);

        onStory((story) => {
            setStory(story);
        });

        onGetStoryElements(() => {
            console.log('story elements requested!');
            const e = storyComponentRef.current?.forceSave();
            if(e && lobby) {
                console.log('story elements sent!', e);
                submitStoryElements(lobby.code, e);
            }
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
        console.log('newStoryElementsRef.current', newStoryElementsRef.current);
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
            <div className="game-box">
                <h2>Write your own story! Round : {lobby?.round}/{lobby?.users.length}</h2>
                {lobby?.roundStartAt && lobby?.roundEndAt &&
                    <TimerComponent start={lobby.roundStartAt} end={lobby.roundEndAt}/>}
                {lobby?.round && lobby.round > 1 && <h3>here should be the previous player's prompt</h3>}
                {story &&
                    <GameStoryComponent key={story.id}
                                    ref={storyComponentRef}
                                    story={story}
                                    initialNewStoryElements={story.elements.filter(element => element.userId === userId)}
                                    onNewStoryElementsChange={handleNewStoryElementsChange}
                                    onSave={handleSaveStoryElements}
                                    onCancel={handleCancelStoryElements}
                    />
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