/*
// src/pages/HowToPlay.tsx

import './HowToPlay.css';

function HowToPlay() {
    return (
        <div className="how-to-play-page">
            <div className="rules-text">
                <h1>Rules of the Game</h1>
                <h2>Here are the rules of the game...</h2>
                <p> ici on doit écrire les règle du jeu.</p>
            </div>
        </div>
    );
}


export default HowToPlay;*/

// src/pages/HowToPlay.tsx

import { Link } from 'react-router-dom';
import './HowToPlay.css';

function HowToPlay() {
    return (
        <div className="how-to-play-page">
            <Link to="/" className="back-button">
                <img src="../../public/backHowToPlay.png" alt="Back Button" />
            </Link>
            <div className="rules-text">
                <h1>Rules of the Game</h1>
                <h2>Here are the rules of the game...</h2>
                <p> ici on doit écrire les règle du jeu.</p>
            </div>
        </div>
    );
}

export default HowToPlay;