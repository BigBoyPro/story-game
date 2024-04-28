import './App.css'
import {useEffect, useState} from "react";
import {
    getError,
    getLobbyInfo, requestStory,
    unmountError,
    unmountLobbyInfo
} from "./utils/socketService.ts";
import {Lobby} from "../../shared/sharedTypes.ts";

import {Route} from 'react-router-dom';

import LobbyView from "./pages/LobbyView.tsx";
import JoinView from "./pages/JoinView";
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
        </>
    )
);

function App() {

    const [lobby, setLobby] = useState<Lobby | null>(null);
    useEffect(() => {
        getLobbyInfo(newLobby => {
            const oldLobbyRound = lobby?.round;
            console.log('Lobby Info:', newLobby);
            setLobby(newLobby);
            if(newLobby.round != oldLobbyRound) {
                if (newLobby.round > 0) {
                    console.log("requesting new story because round changed")
                    requestStory(newLobby.code)
                }
            }
        });

        getError(error => {
            console.error('Error:', error);
        });


        return () => {
            unmountLobbyInfo();
            unmountError();
        };
    }, []);



  return (
      <>
          <LobbyContext.Provider value={lobby}>
              <RouterProvider router={router}/>
              <footer>i'm foot</footer>
          </LobbyContext.Provider>
      </>
  )
}

export default App
