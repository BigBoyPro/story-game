import './App.css'
import {useEffect, useState} from "react";
import {
    offError,
    offLeftLobby,
    offLobbyInfo, offSubmitted,
    offUsersSubmitted,
    onError,
    onLeftLobby,
    onLobbyInfo, onSubmitted,
    onUsersSubmitted,
    requestStory,
    userId
} from "./utils/socketService.ts";
import {Lobby} from "../../shared/sharedTypes.ts";

import {createBrowserRouter, createRoutesFromElements, NavigateFunction, Route, RouterProvider} from 'react-router-dom';

import LobbyView from "./pages/LobbyView.tsx";
import JoinView from "./pages/JoinView";
import HowToPlayView from './pages/HowToPlayView.tsx';

import {LobbyContext} from "./LobbyContext.tsx";
import GameView from "./pages/GameView.tsx";
import ResultsView from "./pages/ResultsView.tsx";

export enum Page {
    Join = "/",
    Lobby = "/lobby",
    Game = "/game",
    Results = "/results",
    HowToPlay = "/how-to-play"
}


const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path={Page.Join} element={<JoinView/>}/>
            <Route path={Page.Lobby} element={<LobbyView/>}/>
            <Route path={Page.Game} element={<GameView/>}/>
            <Route path={Page.Results} element={<ResultsView/>}/>
            <Route path={Page.HowToPlay} element={<HowToPlayView/>}/>
        </>
    )
);

export const redirection = (lobby: null | Lobby, navigate: NavigateFunction, currentPage : Page) => {
    let nextPage: Page = Page.Join;
    if (lobby && lobby.users.find(user => user.id === userId)) {
        if (lobby.round == 0) {
            nextPage = Page.Lobby;
        } else if(lobby.round > 0){
            nextPage = Page.Game;
        } else if(lobby.round < 0){
            nextPage = Page.Results;
        }
    }
    if(nextPage !== currentPage) navigate(nextPage);
}


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

        onSubmitted((submitted : boolean) => {
            console.log('Submitted:', submitted);
            if(lobby) {

                setLobby({...lobby ,usersSubmitted: submitted ? lobby.usersSubmitted + 1 : lobby.usersSubmitted - 1});
            }
        });

        onUsersSubmitted((usersSubmitted : number) => {
            console.log('Users Submitted:', usersSubmitted);
            if(lobby) {
                setLobby({...lobby, usersSubmitted});
            }
        });

        onLeftLobby(() => {
            console.log('Lobby Left');
            setLobby(null);
        });

        onError((event, error) => {
            console.error('Event: ', event, 'Error: ', error);

        });

        return () => {
            offLobbyInfo();
            offError();
            offLeftLobby();
            offUsersSubmitted();
            offSubmitted();
        }

    }, []);



  return (
      <>
          <LobbyContext.Provider value={lobby}>
              <RouterProvider router={router}/>
          </LobbyContext.Provider>
      </>
  )
}

export default App
