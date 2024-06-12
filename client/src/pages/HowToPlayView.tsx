import {Link} from 'react-router-dom';
import './HowToPlayView.css';
import backButtonIcon from '../assets/icons/backHowToPlay.png';
import prevIcon from '../assets/icons/logo-P.png'; // Import the image for the "Previous" button
import nextIcon from '../assets/icons/logo-N.png'; // Import the image for the "Next" button
import {useState} from 'react';

function HowToPlayView() {
    const [currentRule, setCurrentRule] = useState(0);

    const rules = [
        'Objective: \nThe goal of the game is to create a story in any way you want.',
        'Starting the Game: \nAt the start of the game, each player writes, draws, or otherwise begins their story in the way they choose.',
        'Continuing the Story: \nIn each round, every player will receive another player\'s story to continue.',
        'Seeing the Results: \nAfter all players have contributed to each story, the stories will be revealed to all players, and everyone can see how the story has developed.',
    ];

    const goPrevRule = () => {
        setCurrentRule((currentRule - 1 + rules.length) % rules.length);
    };

    const goNextRule = () => {
        setCurrentRule((currentRule + 1) % rules.length);
    };

    const ruleParts = rules[currentRule].split('\n');
    const boldPart = `<strong>${ruleParts[0]}</strong>`;
    const restOfText = ruleParts.slice(1).join('<br />');
    const formattedRule = `${boldPart}<br />${restOfText}`;

    return (
        <div className="how-to-play-page">
            <img src={prevIcon} alt="Previous" className={"arrows"} onClick={goPrevRule}/>
            <div className="rules-text">
                <Link to="/" className="back-button">
                    <img src={backButtonIcon} alt="Back Button"/>
                </Link>
                <h1>Rules of the Game</h1>
                <h2>Welcome to our Storytelling Game!</h2>
                <p dangerouslySetInnerHTML={{__html: formattedRule}}/>
            </div>
            <img src={nextIcon} alt="Next" className={"arrows"} onClick={goNextRule}/>
        </div>
    );
}

export default HowToPlayView;