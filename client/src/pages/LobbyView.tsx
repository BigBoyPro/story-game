import {LobbyContext} from "../LobbyContext.tsx";
import {useContext, useEffect} from "react";
import {requestLeaveLobby, requestStartGame, userId} from "../utils/socketService.ts";
import {useNavigate} from "react-router-dom";
import {Page, redirection} from "../App.tsx";
import CrownIcon from "../assets/icons/theCrown.png"
import LobbyVideo from "../assets/backgrounds/LobbyView.mp4";
import './LobbyView.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'



function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
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
                            <FontAwesomeIcon icon={faRightFromBracket} size="2x" />
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
                                <li>Max Players:</li>
                                <li>Round Time:</li>
                                <li>Winning Score:</li>
                            </ul>
                        </div>
                    </div>
                    <div className="lobby-play-button">
                        <button className={"button-play"} onClick={handleStartGame} title={"Start Game"}
                                disabled={lobby?.hostUserId !== userId}>
                            <FontAwesomeIcon icon={faPlay} size="2x" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default LobbyView;