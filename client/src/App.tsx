import './App.css'
import {useEffect, useState} from "react";
import {
    onError, onLobbyInfo, onLeftLobby, requestStory,
    offError, offLobbyInfo, offLeftLobby, onUsersSubmitted, offUsersSubmitted
} from "./utils/socketService.ts";
import {Lobby} from "../../shared/sharedTypes.ts";

import {Route} from 'react-router-dom';

import LobbyView from "./pages/LobbyView.tsx";
import JoinView from "./pages/JoinView";
import HowToPlay from './pages/HowToPlay';

import {LobbyContext} from "./LobbyContext.tsx";

import { createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
import GameView from "./pages/GameView.tsx";
import ResultsView from "./pages/ResultsView.tsx";


const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<JoinView/>}/>
            <Route path="/lobby" element={<LobbyView/>}/>
            <Route path="/game" element={<GameView/>}/>
            <Route path="/results" element={<ResultsView/>}/>
            <Route path="/how-to-play" element={<HowToPlay/>}/>
        </>
    )
);

function App() {

    const [lobby, setLobby] = useState<Lobby | null>(null);
    useEffect(() => {
        onLobbyInfo(newLobby => {

            const oldLobbyRound = lobby?.round;
            console.log('Lobby Info:', newLobby);
            setLobby(newLobby);
            if(newLobby && newLobby.round != oldLobbyRound) {
                if (newLobby.round > 0) {
                    console.log("requesting new story because round changed")
                    requestStory(newLobby.code)
                }
            }
        });

        onUsersSubmitted((usersSubmitted : number) => {
            console.log('Users Submitted:', usersSubmitted);
            if(lobby) {
                lobby.usersSubmitted++;
                setLobby({...lobby});
            }
        });

        onLeftLobby(() => {
            console.log('Lobby Left');
            setLobby(null);
        });

        onError(error => {
            console.error('Error:', error);
        });

        return () => {
            offLobbyInfo();
            offError();
            offLeftLobby();
            offUsersSubmitted();
        }

    }, []);



  return (
      <>
          <LobbyContext.Provider value={lobby}>
              <RouterProvider router={router}/>
              {/*<footer>i'm foot</footer>*/}
          </LobbyContext.Provider>
      </>
  )
}

export default App
