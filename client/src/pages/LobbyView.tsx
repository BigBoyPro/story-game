import {LobbyContext} from "../LobbyContext.tsx";
import {useContext, useEffect, useState} from "react";
import {
    offLobbyMaxAudios, offLobbyMaxDrawings, offLobbyMaxImages,
    offLobbyMaxPlayers, offLobbyMaxTexts,
    offLobbyRoundSeconds,
    offLobbySeePrevStoryPart,
    offLobbyTimerSetting,
    offLobbyWithTextToSpeech,
    onLobbyMaxAudios, onLobbyMaxDrawings, onLobbyMaxImages,
    onLobbyMaxPlayers,
    onLobbyMaxTexts, onLobbyRoundSeconds,
    onLobbySeePrevStoryPart, onLobbyTimerSetting,
    onLobbyWithTextToSpeech,
    requestLeaveLobby,
    requestStartGame,
    submitLobbyMaxAudios,
    submitLobbyMaxDrawings,
    submitLobbyMaxImages,
    submitLobbyMaxPlayers,
    submitLobbyMaxTexts,
    submitLobbyRoundSeconds,
    submitLobbySeePrevStoryPart,
    submitLobbyTimerSetting,
    submitLobbyWithTextToSpeech,
    userId
} from "../utils/socketService.ts";
import {useNavigate} from "react-router-dom";
import {Page, redirection} from "../App.tsx";

function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();

    // Lobby Settings
    const [maxPlayers, setMaxPlayers] = useState(lobby?.lobbySettings.maxPlayers);
    const [seePrevStoryPart,setSeePrevStoryPart] =  useState(lobby?.lobbySettings.seePrevStoryPart);
    const [withTextToSpeech,setWithTextToSpeech] =  useState(lobby?.lobbySettings.withTextToSpeech);
    const [maxTexts, setMaxTexts] = useState(lobby?.lobbySettings.maxTexts);
    const [maxAudios, setMaxAudios] = useState(lobby?.lobbySettings.maxAudios);
    const [maxImages, setMaxImages] = useState(lobby?.lobbySettings.maxImages);
    const [maxDrawings, setMaxDrawings] = useState(lobby?.lobbySettings.maxDrawings);
    const [timerSetting, setTimerSetting] = useState(lobby?.lobbySettings.timerSetting)
    const [roundSeconds, setRoundSeconds] = useState(lobby?.lobbySettings.roundSeconds);

    useEffect(() => {
        redirection(lobby, navigate, Page.Lobby);
    }, [navigate, lobby]);


    const handleStartGame = () => {
        redirection(lobby, navigate, Page.Lobby);
        if(!lobby) return;
        console.log('starting game')
        requestStartGame(lobby.code)
    }
    const handleBack = () => {
        if(!lobby) return;
        console.log('leaving lobby')
        requestLeaveLobby(lobby.code);
    };


    useEffect(() => {
        onLobbyMaxPlayers(maxPlayers => {
            setMaxPlayers(maxPlayers);
        });

        onLobbySeePrevStoryPart(seePrevStoryPart => {
            setSeePrevStoryPart(seePrevStoryPart);
        });

        onLobbyWithTextToSpeech(withTextToSpeech => {
            setWithTextToSpeech(withTextToSpeech);
        })

        onLobbyMaxTexts(maxTexts => {
            setMaxTexts(maxTexts);
        });

        onLobbyMaxAudios(maxAudios => {
            setMaxAudios(maxAudios);
        });

        onLobbyMaxImages(maxImages => {
            setMaxImages(maxImages);
        });

        onLobbyMaxDrawings(maxDrawings => {
            setMaxDrawings(maxDrawings);
        });

        onLobbyTimerSetting(timerSetting => {
            setTimerSetting(timerSetting);
        });

        onLobbyRoundSeconds(roundSeconds => {
            setRoundSeconds(roundSeconds)
        });

        return () => {
            offLobbyMaxPlayers();
            offLobbySeePrevStoryPart();
            offLobbyWithTextToSpeech();
            offLobbyMaxTexts();
            offLobbyMaxAudios();
            offLobbyMaxImages();
            offLobbyMaxDrawings();
            offLobbyTimerSetting();
            offLobbyRoundSeconds()
        }

    }, []);


    // update Settings for the server
    useEffect(() => {
        if (lobby?.code && maxPlayers) submitLobbyMaxPlayers(lobby?.code, maxPlayers);
    }, [maxPlayers]);

    useEffect(() => {
        if (lobby?.code && seePrevStoryPart) submitLobbySeePrevStoryPart(lobby?.code, seePrevStoryPart);
    }, [seePrevStoryPart]);

    useEffect(() => {
        if (lobby?.code && withTextToSpeech) submitLobbyWithTextToSpeech(lobby?.code, withTextToSpeech);
    }, [withTextToSpeech]);

    useEffect(() => {
        if (lobby?.code && maxTexts) submitLobbyMaxTexts(lobby?.code, maxTexts);
    }, [maxPlayers]);

    useEffect(() => {
        if (lobby?.code && maxAudios) submitLobbyMaxAudios(lobby?.code, maxAudios);
    }, [maxPlayers]);

    useEffect(() => {
        if (lobby?.code && maxImages) submitLobbyMaxImages(lobby?.code, maxImages);
    }, [maxPlayers]);

    useEffect(() => {
        if (lobby?.code && maxDrawings) submitLobbyMaxDrawings(lobby?.code, maxDrawings);
    }, [maxPlayers]);

    useEffect(() => {
        if (lobby?.code && timerSetting) submitLobbyTimerSetting(lobby?.code, timerSetting);
    }, [maxPlayers]);

    useEffect(() => {
        if (lobby?.code && roundSeconds) submitLobbyRoundSeconds(lobby?.code, roundSeconds);
    }, [maxPlayers]);



    // Always block navigation
    return (
        <>
            <div className={"main-page"}>

                <div className={"main-box"}>
                    <div className={"header"}>
                        <button onClick={handleBack}>Back</button>
                    </div>
                    <h1>Story Mode</h1>
                    <p>code : {lobby?.code}</p>
                    <h2>Players:</h2>
                    <ul>
                        {lobby?.users?.map(user => <li
                            key={user.id}>{(lobby?.hostUserId === user.id) && "Crown: "}{user.nickname}</li>)}
                    </ul>
                    <h2>Settings:</h2>
                    <label id="maxPlayers">Max number of Players in the Party</label>
                    <input type="number" id="nbOfPlayers"/>

                    <label id="seePrevStoryPart">See All The previous Content of The Story</label>
                    <input type="checkbox" id="prevPart"/>

                    <label id="tss">Activate Text To Speech option</label>
                    <input type="checkbox" id="tss"/>

                    <label id="maxTexts">Max number of Texts added per Round</label>
                    <input type="number" id="nbOfTexts"/>

                    <label id="maxAudios">Max number of Audios added per Round</label>
                    <input type="number" id="nbOfAudios"/>

                    <label id="maxImages">Max number of Images added per Round</label>
                    <input type="number" id="nbOfImages"/>

                    <label id="maxDrawings">Max number of Drawings added per Round</label>
                    <input type="number" id="nbOfDrawings"/>

                    <label id="timerSetting">Timer Settings</label>
                    <select id="selectTimerTimer" multiple>
                        <option value="dynamic">Dynamic</option>
                        <option value="normal">Normal</option>
                    </select>

                    <label htmlFor="incrementNumber">Select Timer:</label>
                    <input type="number" id="roundTimer" step="1" value="5"/>

                    <button onClick={handleStartGame}
                            disabled={lobby?.hostUserId !== userId}>Start Game
                    </button>
                </div>
            </div>
        </>
    );
}

export default LobbyView;