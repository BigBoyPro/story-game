import {LobbyContext} from "../LobbyContext.tsx";
import {useContext, useEffect} from "react";
import {requestLeaveLobby, requestStartGame, userId} from "../utils/socketService.ts";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {Lobby} from "../../../shared/sharedTypes.ts";
import './LobbyView.css';


const redirection = (lobby: null | Lobby, navigate: NavigateFunction) => {
    if (lobby && lobby.users.find(user => user.id === userId)) {
        if (lobby.round == 0) {
        } else if (lobby.round > 0) {
            console.log('navigating to game')
            navigate("/game", {replace: true});
        } else if (lobby.round < 0) {
            navigate("/results", {replace: true})
        }
    } else {
        navigate("/", {replace: true})
    }
};

function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
    useEffect(() => {
        redirection(lobby, navigate);
    }, [navigate, lobby]);


    const handleStartGame = () => {
        redirection(lobby, navigate);
        // start game
        console.log('starting game')
        if(!lobby) {
            navigate("/", {replace: true});
            return;
        }
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
                <video autoPlay loop muted
                    style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover",zIndex: 0}}>
                    <source src="../LobbyView.mp4" type="video/mp4" />
                </video>

                <div className={"main-box-lobby"}>

                    <div className={"back-button-box"}>
                        <button className={"button-3d-icon-back"} onClick={handleBack}></button>
                    </div>

                    <div className={"info-container"}>

                        <div className="lobby-code-container">
                            <h2 className={"lobby-code-title"}>Lobby Code</h2>
                            <p className={"text-lobby-code"}>{lobby?.code}</p>
                        </div>

                        <div className="player-list-container"> {/* Container for player list */}
                            <h1>Players:</h1>
                            <ul className={"player-list"}>
                                {lobby?.users?.map((user,index) => <li className={"player-item"}
                                    key={user.id} style={{ backgroundColor: getColor(index) }}>{(lobby?.hostUserId === user.id) && "Crown: "}{user.nickname}</li>)}
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
                </div>
             </div>

        </>
    );
}

export default LobbyView;