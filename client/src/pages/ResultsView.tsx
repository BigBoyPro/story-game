import {Story, StoryElementType} from "../../../shared/sharedTypes.ts";
import {useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import {LobbyContext} from "../LobbyContext.tsx";
import './ResultsView.css';
import ResultVideo from "../assets/backgrounds/ResultView.mp4";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faForward } from '@fortawesome/free-solid-svg-icons'

import {
    offEndGame,
    offPart,
    offStoryAtPart,
    onEndGame,
    onPart,
    onStoryAtPart,
    requestEndGame,
    requestGetStoryAtPart,
    requestNextPart,
    userId
} from "../utils/socketService.ts";
import {Page, redirection} from "../App.tsx";
import ResultsStoryComponent from "../components/StoryComponent/ResultsStoryComponent.tsx";
import {savedComponentAsHTML} from "../components/StoryComponent/ResultsStoryComponentAsHTML.tsx";
import {
    drawElement,
    DrawingAction,
    DrawingElement,
    handleAction
} from "../components/DrawingComponent/DrawingComponent.tsx";
import rough from "roughjs";


function ResultsView() {
    const navigate = useNavigate();
    const lobby = useContext(LobbyContext);
    const [story, setStory] = useState<Story | null>(null);
    const [userIndex, setUserIndex] = useState<number>(0);
    const [storiesCount, setStoriesCount] = useState<number>(lobby?.users.length || 0);
    const [isPlaying, setIsPlaying] = useState(true);
    useEffect(() => {
        redirection(lobby, navigate, Page.Results);

        onStoryAtPart(({story, userIndex, storiesCount}) => {
            setStory(story);
            setUserIndex(userIndex);
            setStoriesCount(storiesCount);
            console.log('Story at part', story, userIndex);
            console.log('Stories Count', storiesCount);
        });

        onPart(({userIndex, storiesCount}) => {
            setUserIndex(userIndex);
            setStoriesCount(storiesCount);
            console.log('Part', userIndex);
            console.log('Stories Count', storiesCount);
        });

        onEndGame(() => {
            console.log('Game Ended');
            setStory(null);
            if (lobby) {
                lobby.usersSubmitted = 0;
                lobby.round = 0;
            }
        });

        if (lobby && !story) requestGetStoryAtPart(lobby.code)

        return () => {
            offStoryAtPart()
            offPart()
            offEndGame()
        }
    }, [lobby, navigate]);


    const handleNextUser = () => {
        if (!lobby) return;
        requestNextPart(lobby.code)
    };

    const handleEndGame = () => {
        if (!lobby) return;
        console.log('ending game')
        requestEndGame(lobby.code)
    };


    const handleActions = (actions: DrawingAction[]) => {
        let elements: DrawingElement[] = [];
        let oldActions: DrawingAction[] = [];

        actions.forEach((action, index) => {
            elements = handleAction(action, elements, oldActions);
            action.index = index;
            oldActions = [...oldActions, action];
        });

        return elements;
    }

    const getDrawings = () => {
        const canvases : HTMLCanvasElement[] = [];
        if (story?.elements) {
            story.elements.forEach(element => {
                if (element.type === StoryElementType.Drawing) {
                    const canvas = new HTMLCanvasElement;
                    const context = canvas.getContext('2d')!;
                    const roughCanvas = rough.canvas(canvas);
                    const drawingElements = handleActions(JSON.parse(element.content));
                    drawingElements.forEach(drawingElement => {
                        drawElement(roughCanvas, context, drawingElement, canvas.width, canvas.height);
                    });
                    canvases.push(canvas)
                }
            });
        }
        return canvases;
    };

    const handleSave = () => {
        if (!lobby) return;
        if (story?.elements) savedComponentAsHTML(story?.elements, getDrawings());
    }
    return (
        <>
            <video autoPlay loop muted className={"background background--results"}>
                <source src={ResultVideo} type="video/mp4"/>
            </video>

            <div className="results-page">
                {lobby && story &&
                    <div className="game-box-results">
                        <h2>Results</h2>
                        <div className="story-box-results">

                            <h3>{story.name}</h3>

                            <ResultsStoryComponent key={story.id} story={story} shownUserIndex={userIndex}
                                                   onPlayingEnd={() => setIsPlaying(false)}
                            />

                        </div>
                        <button onClick={handleSave}>Share Story</button>
                        {!isPlaying &&
                            ((story.index < (storiesCount - 1) || userIndex < (storiesCount - 1)) ?
                                <button title="Next Story" className={"button"} onClick={handleNextUser}
                                        disabled={lobby?.hostUserId !== userId}>
                                    <FontAwesomeIcon icon={faForward} size="2x" />
                                </button>
                                :
                                <button className={"button"} onClick={handleEndGame}
                                        disabled={lobby?.hostUserId !== userId}>End</button>)
                        }
                    </div>
                }
            </div>
        </>
    );
}

export default ResultsView;