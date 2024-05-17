import React, {useContext, useEffect, useState} from "react";
import {requestCreateLobby, requestJoinLobby, userId} from "../utils/socketService.ts";
import StoryLogo from "../assets/story-logo.svg?react";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {LobbyContext} from "../LobbyContext.tsx";
import {Lobby} from "../../../shared/sharedTypes.ts";
import DrawingComponent from "../components/DrawingComponent/DrawingComponent.tsx";


const redirection = (lobby: null | Lobby, navigate: NavigateFunction) => {
    if (lobby && lobby.users.find(user => user.id === userId)) {
        if (lobby.round == 0) {
            navigate("/lobby", {replace: true});
        } else if (lobby.round > 0) {
            navigate("/game", {replace: true});
        } else if (lobby.round < 0) {
            navigate("/results", {replace: true});
        }
    }
};

function JoinView() {
    const lobby = useContext(LobbyContext);
    const navigate = useNavigate();
    useEffect(() => {
        redirection(lobby, navigate);
    }, [lobby, navigate]);

    const [nickname, setNickname] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');

    const handleSubmit = (event : React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        redirection(lobby, navigate);

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
                  <div>
                      <DrawingComponent></DrawingComponent>
                  </div>
              </div>
          </div>
      </>
  );
}

export default JoinView;