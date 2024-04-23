import './App.css'
import StoryLogo from "./assets/story-logo.svg?react";
import React, {useState} from "react";
function App() {
    const [nickname, setNickname] = useState('');
    const handleSubmit = (event : React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // You can use the nickname state here
        console.log(nickname);
    }
  return (
      <>
          <div className={"main-page"}>
              <div className={"play-box"}>
                  <StoryLogo width="200" height="200"/>
                  <h1>Story Mode</h1>
                  <form onSubmit={(event) => {handleSubmit(event)}} >
                      <input onChange={(event) => setNickname(event.target.value)}
                          type="text" placeholder="Nickname"/>
                      <button type="submit" >Play</button>
                  </form>
              </div>
          </div>
          <footer>i'm foot</footer>
      </>
  )
}

export default App
