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

} from "./utils/socketService.ts";
import {ErrorType, Lobby, LogLevel} from "../../shared/sharedTypes.ts";

import {createBrowserRouter, createRoutesFromElements, NavigateFunction, Route, RouterProvider} from 'react-router-dom';

import LobbyView from "./pages/LobbyView.tsx";
import JoinView from "./pages/JoinView";
import HowToPlayView from './pages/HowToPlayView.tsx';

import {LobbyContext} from "./LobbyContext.tsx";
import GameView from "./pages/GameView.tsx";
import ResultsView from "./pages/ResultsView.tsx";


const getPageForLobby = (lobby: Lobby | null) => {
    if (!lobby) {
        return Page.Join;
    }
    if (lobby.round === 0) {
        return Page.Lobby;
    } else if (lobby.round > 0) {
        return Page.Game;
    } else if (lobby.round < 0) {
        return Page.Results;
    }
    return Page.Join;
}

export const redirection = (lobby: null | Lobby, navigate: NavigateFunction, currentPage : Page) => {
    let nextPage: Page = getPageForLobby(lobby);
    if(nextPage !== currentPage) {
        console.log('Redirecting from', currentPage, 'to', nextPage);
        navigate(nextPage, {replace: true});
    }
}


export enum Page {
    Join = "/",
    Lobby = "/lobby",
    Game = "/game",
    Results = "/results",
    HowToPlay = "/how-to-play"
}

const WrongErrorsForPageMap = new Map<Page, ErrorType[]>([
    [Page.Join, [ErrorType.STORY_ID_NOT_FOUND, ErrorType.STORY_INDEX_OUT_OF_BOUNDS, ErrorType.PART_IS_NULL,
        ErrorType.NO_STORY_ELEMENTS_TO_UPSERTLETE, ErrorType.STORY_NOT_FOUND, ErrorType.USER_NOT_HOST, ErrorType.USER_NOT_IN_LOBBY,
        ErrorType.USER_INDEX_ORDER_IS_NULL, ErrorType.GAME_ALREADY_STARTED]],
    [Page.Lobby, [ErrorType.STORY_INDEX_OUT_OF_BOUNDS, ErrorType.PART_IS_NULL,
        ErrorType.NO_STORY_ELEMENTS_TO_UPSERTLETE, ErrorType.STORY_ID_NOT_FOUND, ErrorType.STORY_NOT_FOUND,
        ErrorType.USER_ALREADY_IN_LOBBY, ErrorType.USER_INDEX_ORDER_IS_NULL, ErrorType.LOBBY_MAX_PLAYERS_REACHED, ErrorType.LOBBY_ALREADY_PLAYING]],
    [Page.Game, [ErrorType.PART_IS_NULL, ErrorType.LOBBY_MAX_PLAYERS_REACHED, ErrorType.LOBBY_ALREADY_PLAYING, ErrorType.GAME_ALREADY_STARTED,
        ErrorType.STORY_INDEX_OUT_OF_BOUNDS, ErrorType.USER_ALREADY_IN_LOBBY]],
    [Page.Results, [ErrorType.STORY_ID_NOT_FOUND, ErrorType.STORY_NOT_FOUND, ErrorType.NO_STORY_ELEMENTS_TO_UPSERTLETE,
        ErrorType.GAME_ALREADY_STARTED, ErrorType.USER_ALREADY_IN_LOBBY, ErrorType.USER_INDEX_ORDER_IS_NULL, ErrorType.LOBBY_MAX_PLAYERS_REACHED,
        ErrorType.LOBBY_MAX_PLAYERS_REACHED, ErrorType.LOBBY_ALREADY_PLAYING]],
    [Page.HowToPlay, [ErrorType.USER_ALREADY_IN_LOBBY, ErrorType.LOBBY_MAX_PLAYERS_REACHED, ErrorType.LOBBY_ALREADY_PLAYING,
        ErrorType.USER_NOT_HOST, ErrorType.USER_NOT_IN_LOBBY, ErrorType.LOBBY_NOT_FOUND, ErrorType.GAME_ALREADY_STARTED,
        ErrorType.STORY_ID_NOT_FOUND, ErrorType.STORY_NOT_FOUND, ErrorType.NO_STORY_ELEMENTS_TO_UPSERTLETE, ErrorType.USER_INDEX_ORDER_IS_NULL,
        ErrorType.PART_IS_NULL, ErrorType.STORY_INDEX_OUT_OF_BOUNDS]]
]);


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



function App() {

    const [lobby, setLobby] = useState<Lobby | null>(null);
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();

        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);


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
            switch (error.logLevel) {
                case LogLevel.Error:
                    console.error("event: " + event + ", error type: " + error.type + " : " + error.error);
                    break;
                case LogLevel.Warning:
                    console.warn("event: " + event + ", error type: " + error.type + " : " + error.error);
                    break;
                case LogLevel.Information:
                    console.info("event: " + event + ", error type: " + error.type + " : " + error.error);
                    break;
            }
            const currentPage : Page = getPageForLobby(lobby);
            return !!((WrongErrorsForPageMap.get(currentPage)?.includes(error.type)))
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
              <RouterProvider key={lobby ? lobby.round : undefined} router={router}/>
          </LobbyContext.Provider>
      </>
  )
}

export default App
