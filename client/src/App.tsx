import './App.css'
import {useEffect, useState} from "react";
import {getError, getLobbyInfo, unmountError, unmountLobbyInfo} from "./utils/socketService.ts";
import {Lobby} from "../../shared/sharedTypes.ts";

import {Route} from 'react-router-dom';

import LobbyView from "./pages/LobbyView.tsx";
import JoinView from "./pages/JoinView";
import {LobbyContext} from "./LobbyContext.tsx";

import { createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
import GameView from "./pages/GameView.tsx";


const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<JoinView />} />
            <Route path="/lobby" element={<LobbyView />} />
            <Route path="/game" element={<GameView />} />

        </>
    )
);

function App() {

    const [lobby, setLobby] = useState<Lobby | null>(null);
    useEffect(() => {
        getLobbyInfo(lobby => {
            console.log('Lobby Info:', lobby);
            setLobby(lobby);
        });

        getError(error => {
            console.error('Error:', error);
        });

        return () => {
            unmountLobbyInfo();
            unmountError();
        };
    });



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
