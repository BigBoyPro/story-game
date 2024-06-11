import { Link } from 'react-router-dom';
import './HowToPlayView.css';
import backButtonIcon from '../assets/icons/backHowToPlay.png';
import { useState, useEffect } from 'react';

function HowToPlayView() {
    const [currentRule, setCurrentRule] = useState(0);

    const rules = [
        'Objective: The goal of the game is to create a story in any way you want.',
        'Starting the Game: At the start of the game, each player writes, draws, or otherwise begins their story in the way they choose.',
        'Continuing the Story: In each round, every player will receive another player\'s story to continue.',
        'Winning the Game: The game continues until all players have contributed to each story. The most creative and engaging story, as voted by the players, wins!'
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentRule((currentRule + 1) % rules.length);
        }, 5000); // Change rule every 5 seconds

        return () => clearTimeout(timer); // Clear the timer if the component is unmounted
    }, [currentRule, rules.length]);

    const goPrevRule = () => {
        setCurrentRule((currentRule - 1 + rules.length) % rules.length);
    };

    const goNextRule = () => {
        setCurrentRule((currentRule + 1) % rules.length);
    };

    return (
        <div className="how-to-play-page">
            <button className="button-HTP" onClick={goPrevRule}>Previous</button>
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
            <button className="button-HTP" onClick={goNextRule}>Next</button>
        </div>
    );
}

export default HowToPlayView;