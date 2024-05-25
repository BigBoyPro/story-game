import {LobbyContext} from "../LobbyContext.tsx";
import {useContext, useEffect, useState} from "react";
import {onLobbySettings, requestLeaveLobby, requestStartGame, userId} from "../utils/socketService.ts";
import {useNavigate} from "react-router-dom";
import {Page, redirection} from "../App.tsx";

function LobbyView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
    // Lobby Settings
    const [nbOfPlayers, setNbOfPlayers] = useState(lobby?.lobbySettings.nbOfPlayers);
    const [seePrevStory,setSeePrevStory] =  useState(lobby?.lobbySettings.seePrevStory);
    const [nbOfElements, setNbOfElements] = useState(lobby?.lobbySettings.nbOfElements);
    const [dynamicTimer, setDynamicTimer] = useState(lobby?.lobbySettings.dynamicTimer)
    const [roundTime, setRoundTimer] = useState(lobby?.lobbySettings.roundTime);

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
        onLobbySettings(lobbySettings => {
            setNbOfPlayers(lobbySettings.nbOfPlayers)
            setSeePrevStory(lobbySettings.seePrevStory)
            setNbOfElements(lobbySettings.nbOfElements)
            setDynamicTimer(lobbySettings.dynamicTimer)
            setRoundTimer(lobbySettings.roundTime)
        })
    }, []);


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
                    <label id="nbOfPlayers">Max number of Players in the Party</label>
                    <input type="number" id="nbOfPlayers"/>

                    <label id="seePrevStory">See All The previous Content of The Story</label>
                    <input type="checkbox" id="myCheckbox"/>

                    <label id="nbOfElements">Max number of Elements added per Round</label>
                    <input type="number" id="nbOfElements"/>

                    <label id="dynamicTimer">Timer Settings</label>
                    <select id="selectDynamicTimer" multiple>
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