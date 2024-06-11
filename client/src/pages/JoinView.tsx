import React, {useContext, useEffect, useState} from "react";
import {requestCreateLobby, requestJoinLobby} from "../utils/socketService.ts";
import StoryGameLogo from "../assets/logos/logo.svg?react";
import playButtonIcon from "../assets/icons/playButton.png"
import helpButtonIcon from "../assets/icons/helpButton.png";
import JoinVideo from "../assets/backgrounds/JoinView.mp4";
import {useNavigate} from "react-router-dom";
import {LobbyContext} from "../LobbyContext.tsx";
import {Page, redirection} from "../App.tsx";
import "./JoinView.css";


function JoinView() {
    const navigate = useNavigate();
    const lobby = useContext(LobbyContext);

    useEffect(() => {
        redirection(lobby, navigate, Page.Join);
    }, [lobby, navigate]);

    const [nickname, setNickname] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (lobbyCode && lobbyCode.length > 0) {
            // join existing lobby
            requestJoinLobby(nickname, lobbyCode)
            console.log('joining lobby')
        } else {
            // create new lobby
            requestCreateLobby(nickname)
            console.log('creating lobby')
        }
    }

    const handleHelpClick = () => {
        navigate("/how-to-play");
    };

    const handleContactClick = () => {
        navigate("/contact");
    };

    return (
        <>
            <video autoPlay loop muted
                   className={"background background--join"}>
                <source src={JoinVideo} type="video/mp4"/>
            </video>
            <header>
                <div className="header-buttons">
                    <button type="button" className={"join__button-3d button-3d-icon--help"} onClick={handleHelpClick}>
                        <img src={helpButtonIcon} alt="Help Button"/>
                    </button>


                </div>
            </header>


            <div className={"main-page"}>

                <div className={"join-box"}>
                    <form onSubmit={(event) => handleSubmit(event)}>
                        <StoryGameLogo className={"join__logo"}/>
                        <input onChange={(event) => setNickname(event.target.value)}
                               type="text" placeholder="Nickname" className="join__input"/>
                        <input onChange={(event) => setLobbyCode(event.target.value)}
                               type="text" placeholder="Optional Lobby Code" className="join__input"/>
                        <button type="submit" className={"join__button-3d button-3d-icon--play"}>
                            <img src={playButtonIcon} alt="Play Button"/>
                        </button>
                    </form>


                </div>
            </div>
            <footer>
                <button type="button" className={"contactButton"} onClick={handleContactClick}>
                    Contact Us
                </button>
            </footer>


        </>
    );
}

export default JoinView;