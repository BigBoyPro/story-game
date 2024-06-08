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
import {DEFAULT_LOBBY_SETTINGS, TimerSetting} from "../../../shared/sharedTypes.ts";

function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();

    // Lobby Settings
    const [maxPlayers, setMaxPlayers] = useState(lobby?.lobbySettings.maxPlayers || DEFAULT_LOBBY_SETTINGS.maxPlayers);
    const [seePrevStoryPart, setSeePrevStoryPart] = useState(lobby?.lobbySettings.seePrevStoryPart || DEFAULT_LOBBY_SETTINGS.seePrevStoryPart);
    const [withTextToSpeech, setWithTextToSpeech] = useState(lobby?.lobbySettings.withTextToSpeech || DEFAULT_LOBBY_SETTINGS.withTextToSpeech);
    const [maxTexts, setMaxTexts] = useState(lobby?.lobbySettings.maxTexts || DEFAULT_LOBBY_SETTINGS.maxTexts);
    const [maxAudios, setMaxAudios] = useState(lobby?.lobbySettings.maxAudios || DEFAULT_LOBBY_SETTINGS.maxAudios);
    const [maxImages, setMaxImages] = useState(lobby?.lobbySettings.maxImages || DEFAULT_LOBBY_SETTINGS.maxImages);
    const [maxDrawings, setMaxDrawings] = useState(lobby?.lobbySettings.maxDrawings || DEFAULT_LOBBY_SETTINGS.maxDrawings);
    const [timerSetting, setTimerSetting] = useState(lobby?.lobbySettings.timerSetting || DEFAULT_LOBBY_SETTINGS.timerSetting)
    const [roundSeconds, setRoundSeconds] = useState(lobby?.lobbySettings.roundSeconds || DEFAULT_LOBBY_SETTINGS.roundSeconds);

    useEffect(() => {
        redirection(lobby, navigate, Page.Lobby);
    }, [navigate, lobby]);


    const handleStartGame = () => {
        redirection(lobby, navigate, Page.Lobby);
        if (!lobby) return;
        console.log('starting game')
        requestStartGame(lobby.code)
    }
    const handleBack = () => {
        if (!lobby) return;
        console.log('leaving lobby')
        requestLeaveLobby(lobby.code);
    };


    useEffect(() => {
        onLobbyMaxPlayers(maxPlayers => {
            console.log('maxPlayers', maxPlayers)
            setMaxPlayers(maxPlayers);
        });

        onLobbySeePrevStoryPart(seePrevStoryPart => {
            console.log('seePrevStoryPart', seePrevStoryPart)
            setSeePrevStoryPart(seePrevStoryPart);
        });

        onLobbyWithTextToSpeech(withTextToSpeech => {
            console.log('withTextToSpeech', withTextToSpeech)
            setWithTextToSpeech(withTextToSpeech);
        })

        onLobbyMaxTexts(maxTexts => {
            console.log('maxTexts', maxTexts)
            setMaxTexts(maxTexts);
        });

        onLobbyMaxAudios(maxAudios => {
            console.log('maxAudios', maxAudios)
            setMaxAudios(maxAudios);
        });

        onLobbyMaxImages(maxImages => {
            console.log('maxImages', maxImages)
            setMaxImages(maxImages);
        });

        onLobbyMaxDrawings(maxDrawings => {
            console.log('maxDrawings', maxDrawings)
            setMaxDrawings(maxDrawings);
        });

        onLobbyTimerSetting(timerSetting => {
            console.log('timerSetting', timerSetting)
            setTimerSetting(timerSetting);
        });

        onLobbyRoundSeconds(roundSeconds => {
            console.log('roundSeconds', roundSeconds)
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
    const handleMaxPlayersChange = (newMaxPlayer: number) => {
        if (!lobby) return;
        setMaxPlayers(newMaxPlayer);
        submitLobbyMaxPlayers(lobby?.code, newMaxPlayer);
    }

    const handleSeePrevStoryPartChange = (newSeePrevStoryPart: boolean) => {
        if (!lobby) return;
        setSeePrevStoryPart(newSeePrevStoryPart);
        submitLobbySeePrevStoryPart(lobby?.code, newSeePrevStoryPart);
    }

    const handleWithTextToSpeechChange = (newWithTextToSpeech: boolean) => {
        if (!lobby) return;
        setWithTextToSpeech(newWithTextToSpeech);
        submitLobbyWithTextToSpeech(lobby?.code, newWithTextToSpeech);
    }

    const handleMaxTextsChange = (newMaxTexts: number) => {
        if (!lobby) return;
        setMaxTexts(newMaxTexts);
        submitLobbyMaxTexts(lobby?.code, newMaxTexts);
    }

    const handleMaxAudiosChange = (newMaxAudios: number) => {
        if (!lobby) return;
        setMaxAudios(newMaxAudios);
        submitLobbyMaxAudios(lobby?.code, newMaxAudios);
    }

    const handleMaxImagesChange = (newMaxImages: number) => {
        if (!lobby) return;
        setMaxImages(newMaxImages);
        submitLobbyMaxImages(lobby?.code, newMaxImages);
    }

    const handleMaxDrawingsChange = (newMaxDrawings: number) => {
        if (!lobby) return;
        setMaxDrawings(newMaxDrawings);
        submitLobbyMaxDrawings(lobby?.code, newMaxDrawings);
    }

    const handleTimerSettingChange = (newTimerSetting: TimerSetting) => {
        if (!lobby) return;
        setTimerSetting(newTimerSetting);
        submitLobbyTimerSetting(lobby?.code, newTimerSetting);
    }

    const handleRoundSecondsChange = (newRoundSeconds: number) => {
        if (!lobby) return;
        setRoundSeconds(newRoundSeconds);
        submitLobbyRoundSeconds(lobby?.code, newRoundSeconds);
    }




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
                    <ul>
                        <h2>Settings:</h2>
                        <li>
                            <label id="maxPlayers">Max number of Players in the Party</label>
                            <input type="number" id="maxPlayers" value={maxPlayers}
                                   onChange={(e) => handleMaxPlayersChange(parseInt(e.target.value))}/>

                        </li>
                        <li>
                            <label id="seePrevStoryPart">See All The previous Content of The Story</label>
                            <input type="checkbox" id="prevPart" checked={seePrevStoryPart}
                                      onChange={(e) => handleSeePrevStoryPartChange(e.target.checked)}/>
                        </li>
                        <li>
                            <label id="tss">Activate Text To Speech option</label>
                            <input type="checkbox" id="tss" checked={withTextToSpeech}
                                        onChange={(e) => handleWithTextToSpeechChange(e.target.checked)}/>
                        </li>
                        <li>
                            <label id="maxTexts">Max number of Texts added per Round</label>
                            <input type="number" id="nbOfTexts" value={maxTexts}
                                      onChange={(e) => handleMaxTextsChange(parseInt(e.target.value))}/>
                        </li>
                        <li>
                            <label id="maxAudios">Max number of Audios added per Round</label>
                            <input type="number" id="nbOfAudios" value={maxAudios}
                                        onChange={(e) => handleMaxAudiosChange(parseInt(e.target.value))}/>
                        </li>
                        <li>
                            <label id="maxImages">Max number of Images added per Round</label>
                            <input type="number" id="nbOfImages" value={maxImages}
                                        onChange={(e) => handleMaxImagesChange(parseInt(e.target.value))}/>
                        </li>
                        <li>
                            <label id="maxDrawings">Max number of Drawings added per Round</label>
                            <input type="number" id="nbOfDrawings" value={maxDrawings}
                                        onChange={(e) => handleMaxDrawingsChange(parseInt(e.target.value))}/>
                        </li>
                        <li>
                            <label id="timerSetting">Timer Settings</label>
                            <select id="selectTimerTimer" value={timerSetting}
                                    onChange={(e) => handleTimerSettingChange(e.target.value as TimerSetting)}>
                                {Object.values(TimerSetting).map((value, index) => (
                                    <option key={value}
                                            value={value}>{Object.keys(TimerSetting)[index]}</option>
                                ))}
                            </select>
                        </li>
                        <li>
                            <label htmlFor="incrementNumber">Select Timer:</label>
                            <input type="number" id="roundTimer" step="1" min="0" value={roundSeconds}
                                      onChange={(e) => handleRoundSecondsChange(parseInt(e.target.value))}/>
                        </li>
                    </ul>
                    <button onClick={handleStartGame}
                            disabled={lobby?.hostUserId !== userId}>Start Game
                    </button>
                </div>
            </div>
        </>
    );
}

export default LobbyView;