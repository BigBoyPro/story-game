import {LobbyContext} from "../LobbyContext.tsx";
import {useContext, useEffect} from "react";
import {requestLeaveLobby, requestStartGame, userId} from "../utils/socketService.ts";
import {useNavigate} from "react-router-dom";
import {Page, redirection} from "../App.tsx";
import './LobbyView.css';
import CrownIcon from "../assets/icons/theCrown.png"
import LobbyVideo from "../assets/backgrounds/LobbyView.mp4";



function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
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
    const getColor = (index:number) => {
        const colors = ['#d056f5', '#609fcc', '#469d9d', '#dc6a7f'];
        return colors[index % colors.length];
    };

    // Always block navigation
    return (
        <>
            <div className={"main-page-lobby"}>

                <div className={"video-background-container"}>

                    <video autoPlay loop muted className={"background"}>
                        <source src={LobbyVideo} type="video/mp4" />
                    </video>

                    {/*<div className={"main-box-lobby"}>*/}
                    <div className={"centered-content"}>

                        <div className={"back-button-box"}>
                            <button className={"button-back"} onClick={handleBack}>Back</button>
                        </div>

                        <div className={"info-container"}>

                            <div className="lobby-code-container">
                                <h2 className={"lobby-code-title"}>Lobby Code</h2>
                                <p className={"lobby-code-text"}>{lobby?.code}</p>
                            </div>

                            <div className="player-list-container">
                                <h2 className={"players-title"}>Players:</h2>
                                {/*<ul className={"player-list"}>*/}
                                {/*    {lobby?.users?.map((user,index) => <li className={"players-text"}*/}
                                {/*        key={user.id} style={{ backgroundColor: getColor(index) }}>{(lobby?.hostUserId === user.id) && "Crown: "}{user.nickname}</li>)}*/}
                                {/*</ul>*/}
                                <ul className={"player-list"}>
                                    {lobby?.users?.map((user,index) => (
                                        <li className={"players-text"}
                                            key={user.id} style={{ backgroundColor: getColor(index) }}>
                                            {(lobby?.hostUserId === user.id) && <img src={CrownIcon} alt="Crown" className="crown-icon crown-icon-small" />}
                                            {user.nickname}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/*<h2>Settings:</h2>*/}
                            {/*<p>Max Players: {lobby?.maxPlayers}</p>*/}
                            {/*<p>Round Time: {lobby?.roundTime}</p>*/}
                            {/*<p>Winning Score: {lobby?.winningScore}</p>*/}
                        </div>

                        <div className={"play-button-box"}>
                            <button className={"button-play"} onClick={handleStartGame} disabled={lobby?.hostUserId !== userId}>Play</button>
                        </div>
                    {/*</div>*/}
                    </div>
                </div>
             </div>

        </>
    );
}

export default LobbyView;