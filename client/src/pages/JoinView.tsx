import React, {useContext, useEffect, useState} from "react";
import {requestCreateLobby, requestJoinLobby} from "../utils/socketService.ts";
import logo from '../assets/logo.svg';
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

    const handleHelpClick = () => {
        navigate("/how-to-play");
    };

    return (
      <>
          <button type="button" className={"button-3d-icon-help"} onClick={handleHelpClick}></button>
          {/*style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover",zIndex: 0}}*/}
          <video autoPlay loop muted
                 className={"background"}>
              <source src="../JoinView.mp4" type="video/mp4" />
          </video>
              <div className={"main-page"}>
                  <div className={"main-box"}>
                      {<img src={logo} alt="Logo" width={450} height={450} />}
                      <form onSubmit={(event) => handleSubmit(event)}>

                          <input onChange={(event) => setNickname(event.target.value)}
                                 type="text" placeholder="Nickname" className="input-placeholder"/>

                          <input onChange={(event) => setLobbyCode(event.target.value)}
                                 type="text" placeholder="Optional Lobby Code" className="input-placeholder"/>


                          <button type="submit" className={"button-3d-icon-play"}></button>
                      </form>
                  </div>
              </div>
      </>
    );
}

export default JoinView;