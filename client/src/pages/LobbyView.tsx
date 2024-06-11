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
import {redirection} from "../App.tsx";
import {DEFAULT_LOBBY_SETTINGS, Page, TimerSetting} from "../../../shared/sharedTypes.ts";
import CrownIcon from "../assets/icons/theCrown.png"
import LobbyVideo from "../assets/backgrounds/LobbyView.mp4";
import './LobbyView.css';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faPlay, faRightFromBracket} from '@fortawesome/free-solid-svg-icons'
import DurationPickerComponent from "../components/DurationPickerComponent/DurationPickerComponent.tsx";
import SpinnerComponent from "../components/SpinnerComponent/SpinnerComponent.tsx";

function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

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
        if (!lobby) return;
        console.log('starting game')
        requestStartGame(lobby.code)
        setIsLoading(true)
    }
    const handleBack = () => {
        if (!lobby) return;
        console.log('leaving lobby')
        requestLeaveLobby(lobby.code);
        setIsLoading(true)
    };
    const getColor = (index: number) => {
        const colors = ['#d056f5', '#609fcc', '#469d9d', '#dc6a7f','#dc6a7f', '#6a70dc', '#c5a821', 'rgba(185,147,199,0.53)' ];
        return colors[index % colors.length];
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
            {isLoading && (
                <div className="loading-overlay">
                    <SpinnerComponent/>
                </div>
            )}

            <video autoPlay loop muted className={"background background--lobby"}>
                <source src={LobbyVideo} type="video/mp4"/>
            </video>


            <div className={"main-page"}>
                <div className={"lobby-box"}>
                    <div className={"leave-lobby__header"}>
                        <button className={"leave-lobby__header_button"} onClick={handleBack} title="Leave Lobby">
                            <FontAwesomeIcon icon={faRightFromBracket} size="2x"/>
                        </button>
                    </div>
                    <div className={"lobby-info"}>
                        <div className={"sidebar"}>
                            <div className="lobby-code">
                                <h2 className={"lobby-info__title lobby-info__title--sidebar"}>Code:</h2>
                                <p className={"lobby-code__code"}>{lobby?.code}</p>
                            </div>

                            <div className="lobby-players">
                                <h2 className={"lobby-info__title lobby-info__title--sidebar"}>Players:</h2>
                                <ul className={"players__list"}>
                                    {lobby?.users?.map((user, index) => (
                                        <li className={"player"}
                                            key={user.id} style={{backgroundColor: getColor(index)}}>
                                            {user.nickname}
                                            {(lobby?.hostUserId === user.id) && <img src={CrownIcon} alt="Crown"
                                                                                     className="crown-icon-small"/>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>


                        <div className="lobby-settings">
                            <h2 className={"lobby-info__title lobby-info__title--settings"}>Settings:</h2>
                            <ul className={"lobby-settings__list"}>
                                <li>
                                    <label id="maxPlayers">Players limit</label>
                                    <input type="number" id="maxPlayers" value={maxPlayers} min="1"
                                           onChange={(e) => handleMaxPlayersChange(parseInt(e.target.value))}
                                           disabled={lobby?.hostUserId !== userId}
                                    />

                                </li>


                                <li>
                                    <label htmlFor="incrementNumber">Round Duration (m:s)</label>
                                    <DurationPickerComponent durationSeconds={roundSeconds}
                                           onChange={(newSeconds) => handleRoundSecondsChange(newSeconds)}
                                           disabled={lobby?.hostUserId !== userId}
                                    />
                                </li>
                                <li>
                                    <label id="timerSetting">Timer type</label>
                                    <select id="selectTimerTimer" value={timerSetting}
                                            onChange={(e) => handleTimerSettingChange(e.target.value as TimerSetting)}
                                            disabled={lobby?.hostUserId !== userId}>
                                        {Object.values(TimerSetting).map((value, index) => (
                                            <option key={value}
                                                    value={value}>{Object.keys(TimerSetting)[index]}</option>
                                        ))}
                                    </select>
                                </li>


                                <li>
                                    <label id="seePrevStoryPart">See full previous story</label>
                                    <input type="checkbox" id="prevPart" checked={seePrevStoryPart}
                                           onChange={(e) => handleSeePrevStoryPartChange(e.target.checked)}
                                           disabled={lobby?.hostUserId !== userId}
                                    />
                                </li>
                                <li>
                                    <label id="tss">Text-To-Speech</label>
                                    <input type="checkbox" id="tss" checked={withTextToSpeech}
                                           onChange={(e) => handleWithTextToSpeechChange(e.target.checked)}
                                           disabled={lobby?.hostUserId !== userId}
                                    />
                                </li>
                                <li>
                                    <label id="maxTexts">Texts limit</label>
                                    <input type="number" id="nbOfTexts" value={maxTexts} min="0"
                                           onChange={(e) => handleMaxTextsChange(parseInt(e.target.value))}
                                           disabled={lobby?.hostUserId !== userId}
                                    />
                                </li>
                                <li>
                                    <label id="maxAudios">Audios limit</label>
                                    <input type="number" id="nbOfAudios" value={maxAudios} min="0"
                                           onChange={(e) => handleMaxAudiosChange(parseInt(e.target.value))}
                                           disabled={lobby?.hostUserId !== userId}
                                    />
                                </li>
                                <li>
                                    <label id="maxImages">Images limit</label>
                                    <input type="number" id="nbOfImages" value={maxImages} min="0"
                                           onChange={(e) => handleMaxImagesChange(parseInt(e.target.value))}
                                           disabled={lobby?.hostUserId !== userId}
                                    />
                                </li>
                                <li>
                                    <label id="maxDrawings">Drawings limit</label>
                                    <input type="number" id="nbOfDrawings" value={maxDrawings} min="0"
                                           onChange={(e) => handleMaxDrawingsChange(parseInt(e.target.value))}
                                           disabled={lobby?.hostUserId !== userId}
                                    />
                                </li>


                            </ul>
                        </div>
                    </div>
                    <div className="lobby-play-button">
                        <button className={"button-play"} onClick={handleStartGame} title={"Start Game"}
                                disabled={lobby?.hostUserId !== userId}>
                            <FontAwesomeIcon icon={faPlay} size="2x"/>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default LobbyView;