import React, {useContext, useEffect, useState} from "react";
import {requestCreateLobby, requestJoinLobby} from "../utils/socketService.ts";
import StoryGameLogo from "../assets/logo.svg?react";
import playButtonIcon from "../assets/playButton.png";
import helpButtonIcon from "../assets/helpButton.png";
import {useNavigate} from "react-router-dom";
import {LobbyContext} from "../LobbyContext.tsx";
import {Page, redirection} from "../App.tsx";


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
        redirection(lobby, navigate, Page.Join);

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

    return (
        <>
            <video autoPlay loop muted
                   className={"background"}>
                <source src="../JoinView.mp4" type="video/mp4" />
            </video>
            <header>
                <button type="button" className={"button-3d-icon button-3d-icon--help"} onClick={handleHelpClick}>
                    <img src={helpButtonIcon} alt="Help Button"/>
                </button>
            </header>
            <div className={"main-page"}>

                <div className={"main-box"}>
                    <form onSubmit={(event) => handleSubmit(event)}>
                        <StoryGameLogo className={"join__logo"} />
                        <input onChange={(event) => setNickname(event.target.value)}
                               type="text" placeholder="Nickname" className="join__input"/>
                        <input onChange={(event) => setLobbyCode(event.target.value)}
                               type="text" placeholder="Optional Lobby Code" className="join__input"/>
                        <button type="submit" className={"button-3d-icon button-3d-icon--play"}>
                            <img src={playButtonIcon} alt="Play Button"/>
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

export default JoinView;