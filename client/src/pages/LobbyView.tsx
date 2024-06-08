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
import CrownIcon from "../assets/icons/theCrown.png"
import LobbyVideo from "../assets/backgrounds/LobbyView.mp4";
import './LobbyView.css';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faPlay, faRightFromBracket} from '@fortawesome/free-solid-svg-icons'


function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();

    // Lobby Settings
    const [maxPlayers, setMaxPlayers] = useState(lobby?.lobbySettings.maxPlayers);
    const [seePrevStoryPart, setSeePrevStoryPart] = useState(lobby?.lobbySettings.seePrevStoryPart);
    const [withTextToSpeech, setWithTextToSpeech] = useState(lobby?.lobbySettings.withTextToSpeech);
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
        if (!lobby) return;
        console.log('starting game')
        requestStartGame(lobby.code)
    }
    const handleBack = () => {
        if (!lobby) return;
        console.log('leaving lobby')
        requestLeaveLobby(lobby.code);
    };
    const getColor = (index: number) => {
        const colors = ['#d056f5', '#609fcc', '#469d9d', '#dc6a7f'];
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
            <video autoPlay loop muted className={"background"}>
                <source src={LobbyVideo} type="video/mp4"/>
            </video>

            <div className={"main-page"}>
                <div className={"lobby-box"}>
                    <div className={"lobby-box__header"}>
                        <button className={"lobby-box__header_button"} onClick={handleBack} title="Leave Lobby">
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
                                            {(lobby?.hostUserId === user.id) && <img src={CrownIcon} alt="Crown"
                                                                                     className="crown-icon-small"/>}
                                            {user.nickname}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="lobby-settings">
                            <h2 className={"lobby-info__title lobby-info__title--settings"}>Settings:</h2>
                            <ul className={"lobby-settings__list"}>
                                <li>
                                    <label id="maxPlayers">Max number of Players in the Party</label>
                                    <input type="number" id="nbOfPlayers"/>
                                </li>
                                <li>
                                    <label id="seePrevStoryPart">See All The previous Content of The Story</label>
                                    <input type="checkbox" id="prevPart"/>
                                </li>
                                <li>
                                    <label id="tss">Activate Text To Speech option</label>
                                    <input type="checkbox" id="tss"/>
                                </li>
                                <li>
                                    <label id="maxTexts">Max number of Texts added per Round</label>
                                    <input type="number" id="nbOfTexts"/>
                                </li>
                                <li>
                                    <label id="maxAudios">Max number of Audios added per Round</label>
                                    <input type="number" id="nbOfAudios"/>
                                </li>
                                <li>
                                    <label id="maxImages">Max number of Images added per Round</label>
                                    <input type="number" id="nbOfImages"/>
                                </li>
                                <li>
                                    <label id="maxDrawings">Max number of Drawings added per Round</label>
                                    <input type="number" id="nbOfDrawings"/>
                                </li>
                                <li>
                                    <label id="timerSetting">Timer Settings</label>
                                    <select id="selectTimerTimer" multiple>
                                        <option value="dynamic">Dynamic</option>
                                        <option value="normal">Normal</option>
                                    </select>
                                </li>
                                <li>
                                    <label htmlFor="incrementNumber">Select Timer:</label>
                                    <input type="number" id="roundTimer" step="1" value="5"/>
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