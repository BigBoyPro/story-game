import './App.css'
import StoryLogo from "./assets/story-logo.svg?react";
import React, {useState} from "react";
import { v4 as uuidv4 } from 'uuid';
import { useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');


function App() {
    useEffect(() => {
        socket.on('connect', () => {
            console.log('connected to server');
        });
        socket.on('disconnect', () => {
            console.log('disconnected from server');
        });
        socket.on('error', (error) => {
            console.error('Error:', error);
        });
        socket.on('lobby info', (data) => {
            console.log(data);
        });
        // Return a cleanup function to remove the listeners when the component unmounts
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('error');
            socket.off('lobby info');
        };
    }, []);

    const [nickname, setNickname] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');
    const handleSubmit = (event : React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = uuidv4();
            localStorage.setItem('userId', userId);
        }
        if (lobbyCode && lobbyCode.length > 0) {
            // join existing lobby
            socket.emit('join lobby', userId, nickname, lobbyCode);
            console.log('joining lobby');
        } else {
            // create new lobby
            socket.emit('create lobby', userId, nickname);
            console.log('creating lobby');
        }
    }
  return (
      <>
          <div className={"main-page"}>
              <div className={"play-box"}>
                  <StoryLogo width={200} height={200}/>
                  <h1>Story Mode</h1>
                  <form onSubmit={(event) => handleSubmit(event) } >
                      <input onChange={(event) => setNickname(event.target.value)}
                          type="text" placeholder="Nickname"/>
                      <input onChange={(event) => setLobbyCode(event.target.value)}
                          type="text" placeholder="Optional Lobby Code"
                      />
                      <button type="submit" >Play</button>
                  </form>
              </div>
          </div>
          <footer>i'm foot</footer>
      </>
  )
}

export default App
