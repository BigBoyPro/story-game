import React, {useContext, useEffect, useState} from "react";
import {requestCreateLobby, requestJoinLobby} from "../utils/socketService.ts";
import StoryLogo from "../assets/story-logo.svg?react";
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

    const handleSubmit = (event : React.FormEvent<HTMLFormElement>) => {
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
    return (
      <>
          <div className={"main-page"}>

              <div className={"main-box"}>
                  <StoryLogo width={200} height={200}/>
                  <h1>Story Mode</h1>
                  <form onSubmit={(event) => handleSubmit(event)}>
                      <input onChange={(event) => setNickname(event.target.value)}
                             type="text" placeholder="Nickname"/>
                      <input onChange={(event) => setLobbyCode(event.target.value)}
                             type="text" placeholder="Optional Lobby Code"
                      />
                      <button type="submit">Play</button>
                  </form>

              </div>
          </div>
      </>
    );
}

export default JoinView;