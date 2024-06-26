import {Page, Story, StoryElement} from "../../../shared/sharedTypes.ts";
import {useNavigate} from "react-router-dom";
import {useContext, useEffect, useRef, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './GameView.css';
import CrownIcon from '../assets/icons/theCrown.png';
import {CountdownCircleTimer} from 'react-countdown-circle-timer'
import {
    onStory,
    onGetStoryElements,
    submitStoryElements,
    offStory,
    offGetStoryElements, unsubmitStoryElements, userId, requestLeaveLobby, onSubmitted, offSubmitted
} from "../utils/socketService.ts";
import {redirection} from "../App.tsx";
import GameStoryComponent, {GameStoryComponentHandles} from "../components/StoryComponent/GameStoryComponent.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRightFromBracket} from "@fortawesome/free-solid-svg-icons";

function GameView() {
    const navigate = useNavigate();
    const lobby = useContext(LobbyContext);
    // const changeIsLoading = useContext(ChangeIsLoadingContext);
    // const user = lobby?.users.find(user => user.id === userId);
    const [story, setStory] = useState<Story | null>(null);
    const newStoryElementsRef = useRef<StoryElement[]>([]);
    const storyComponentRef = useRef<GameStoryComponentHandles>(null);

    useEffect(() => {
        redirection(lobby, navigate, Page.Game);

        onStory((story) => {
            console.log('story received!', story);
            setStory(story);
        });

        onGetStoryElements(() => {
            console.log('story elements requested!');
            const e = storyComponentRef.current?.forceSave();
            if (e && lobby) {
                console.log('story elements sent!', e);
                submitStoryElements(lobby.code, e);
            }
        });

        onSubmitted((_submitted: boolean) => {
        });


        return () => {
            offStory();
            offGetStoryElements();
            offSubmitted();
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

    const handleBack = () => {
        if (!lobby) return;
        console.log('leaving lobby')
        requestLeaveLobby(lobby.code);
    };
    const getSeconds = (start: Date | null, end: Date | null) => {
        if (!start || !end) return 0;
        return (end.getTime() - start.getTime()) / 1000;
    }
    if (!lobby) return null;
    const roundSeconds = getSeconds(lobby.roundStartAt, lobby.roundEndAt);
    return (
        <>
            <div className="game-page">
                <div className={"floating floating-elements"}>
                    <div className={"timer"}>
                        <h2>Timer</h2>
                        {lobby?.roundStartAt && lobby?.roundEndAt &&
                            <span className={"timer__clock"}>
                                <CountdownCircleTimer key={lobby.roundEndAt.getTime()}
                                    isPlaying
                                    duration={roundSeconds}
                                    colors={['#6F66E7', '#6F66E7', '#CAA12E', '#E37434', '#E0491F']}
                                    colorsTime={[roundSeconds, roundSeconds / 2, roundSeconds / 3, roundSeconds / 5, 0]}
                                    initialRemainingTime={getSeconds(new Date(), lobby.roundEndAt)}
                                    size={100} strokeWidth={10}
                                    onComplete={() => {
                                        console.log('round ended');
                                    }}
                                >
                                    {({remainingTime}) => {
                                        const minutes = Math.floor(remainingTime / 60).toString().padStart(2, '0');
                                        const seconds = (remainingTime % 60).toString().padStart(2, '0');

                                        return `${minutes}:${seconds}`;
                                    }}
                                        </CountdownCircleTimer>

                                        </span>
                        }
                    </div>
                    <div className={"round"}>
                        <h2>Round</h2>
                        <p className={"round__text"}>{lobby?.round}/{(lobby && lobby.roundsCount > lobby.users.length) ? lobby.roundsCount : lobby?.users.length}</p>
                    </div>
                </div>
                <div className="game-box">
                    <div className={"leave-lobby__header"}>
                        <div className="floating-elements--mobile">
                         <span className={"timer__clock--mobile"}>
                              {lobby?.roundStartAt && lobby?.roundEndAt &&
                                  <CountdownCircleTimer
                                      isPlaying
                                      duration={roundSeconds}
                                      colors={['#6F66E7', '#6F66E7', '#CAA12E', '#E37434', '#E0491F']}
                                      colorsTime={[roundSeconds, roundSeconds / 2, roundSeconds / 3, roundSeconds / 5, 0]}
                                      initialRemainingTime={getSeconds(new Date(), lobby.roundEndAt)}
                                      size={75} strokeWidth={5}
                                      onComplete={() => {
                                          console.log('round ended');
                                      }}
                                  >
                                      {({remainingTime}) => {
                                          const minutes = Math.floor(remainingTime / 60).toString().padStart(2, '0');
                                          const seconds = (remainingTime % 60).toString().padStart(2, '0');

                                          return `${minutes}:${seconds}`;
                                      }}
                                  </CountdownCircleTimer>
                              }
                        </span>
                            <div className={"round"}>
                                <p className={"round__text--mobile"}>{lobby?.round}/{(lobby && lobby.roundsCount > lobby.users.length) ? lobby.roundsCount : lobby?.users.length}</p>
                            </div>
                        </div>
                        <button className={"leave-lobby__header_button"} onClick={handleBack} title="Leave Lobby">
                            <FontAwesomeIcon icon={faRightFromBracket} size="2x"/>
                        </button>

                    </div>


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
                    <div className="footer-lobby-code">
                        <p className={"footer-lobby-code__text"}>
                            <strong className={"footer-lobby-code__text--bold"}>Lobby code:</strong> {lobby.code}</p>
                    </div>
                </div>

                <div className="floating users">
                    <h2>Players</h2>
                    <ul className="users__list">
                        {lobby?.users && lobby.users.map(user =>
                            <li key={user.id} className="user">
                                {(lobby?.hostUserId === user.id) &&
                                    <img src={CrownIcon} alt="Crown" className="crown-icon crown-icon-small"/>}
                                {user.nickname}
                            </li>
                        )}
                    </ul>
                </div>


            </div>

        </>
    )
        ;
}

export default GameView;