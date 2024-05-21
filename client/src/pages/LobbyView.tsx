import {LobbyContext} from "../LobbyContext.tsx";
import {useContext, useEffect} from "react";
import {requestLeaveLobby, requestStartGame, userId} from "../utils/socketService.ts";
import {useNavigate} from "react-router-dom";
import {Page, redirection} from "../App.tsx";



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
                    {/*<p>Max Players: {lobby?.maxPlayers}</p>*/}
                    {/*<p>Round Time: {lobby?.roundTime}</p>*/}
                    {/*<p>Winning Score: {lobby?.winningScore}</p>*/}
                    <button onClick={handleStartGame}
                            disabled={lobby?.hostUserId !== userId}>Start Game
                    </button>
                </div>
            </div>
        </>
    );
}

export default LobbyView;