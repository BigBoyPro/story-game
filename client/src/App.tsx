import './App.css'
import StoryLogo from "./assets/story-logo.svg?react";
function App() {

  return (
      <>
          <div className={"main-page"}>
              <div className={"play-box"}>
                  <h1>hello world</h1>
                  <StoryLogo width={200} height={200}/>
              </div>
          </div>
          <footer>i'm foot</footer>
      </>
  )
}

export default App
