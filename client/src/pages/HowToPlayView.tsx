import { Link } from 'react-router-dom';
import './HowToPlayView.css';
import backButtonIcon from '../assets/icons/backHowToPlay.png';
import prevIcon from '../assets/icons/logo-P.png'; // Import the image for the "Previous" button
import nextIcon from '../assets/icons/logo-N.png'; // Import the image for the "Next" button
import { useState } from 'react';

function HowToPlayView() {
    const [currentRule, setCurrentRule] = useState(0);

    const rules = [
        'Objective: The goal of the game is to create a story in any way you want.',
        'Starting the Game: At the start of the game, each player writes, draws, or otherwise begins their story in the way they choose.',
        'Continuing the Story: In each round, every player will receive another player\'s story to continue.',
        'Winning the Game: The game continues until all players have contributed to each story. The most creative and engaging story, as voted by the players, wins!'
    ];

    const goPrevRule = () => {
        setCurrentRule((currentRule - 1 + rules.length) % rules.length);
    };

    const goNextRule = () => {
        setCurrentRule((currentRule + 1) % rules.length);
    };

    return (
        <div className="how-to-play-page">
            <img src={prevIcon} alt="Previous" onClick={goPrevRule} /> {/* Replace the "Previous" button with an image */}
            <div className="rules-text">
                <Link to="/" className="back-button">
                    <img src={backButtonIcon} alt="Back Button" />
                </Link>
                <h1>Rules of the Game</h1>
                <h2>Welcome to our Storytelling Game!</h2>
                <p>
                    {rules[currentRule]}
                </p>
            </div>
            <img src={nextIcon} alt="Next" onClick={goNextRule} /> {/* Replace the "Next" button with an image */}
        </div>
    );
}

export default HowToPlayView;