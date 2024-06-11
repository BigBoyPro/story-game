
import  { useEffect, useState } from 'react';
import './TimerComponent.css';

function TimerComponent({ start, end }: { start: Date, end: Date }) {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        if(date && end.getTime() - date.getTime() > 1000) {
            const timerID = setTimeout(() => tick(), 1000);
            return function cleanup() {
                clearTimeout(timerID);
            };
        }
    });

    const tick = () => {
        setDate(new Date());
    };
    //
    // const secondsStyle = {
    //     transform: `rotate(${date.getSeconds() * 6}deg)`
    // };
    //
    // const minutesStyle = {
    //     transform: `rotate(${date.getMinutes() * 6}deg)`
    // };
    //
    // const hoursStyle = {
    //     transform: `rotate(${date.getHours() * 30}deg)`
    // };

    const calculateStrokeDashoffset = () => {
        const totalSeconds = (end.getTime() - start.getTime()) / 1000;
        const remainingSeconds = (end.getTime() - Date.now()) / 1000;
        const percentage = remainingSeconds / totalSeconds;
        return 282.6 * percentage;
    };

    return (
        <div className="clock">
            <svg className="clock-svg">
                <circle className="clock-circle" cx="50" cy="50" r="45" />
                <circle className="clock-timer" cx="50" cy="50" r="45" style={{ strokeDashoffset: calculateStrokeDashoffset() }} />
            </svg>
            {/*<div className="hand hour-hand" style={hoursStyle} hidden/>*/}
            {/*<div className="hand minute-hand" style={minutesStyle} hidden/>*/}
            {/*<div className="hand second-hand" style={secondsStyle} hidden/>*/}
            {/*<div className="dot" />*/}
        </div>
    );
}

export default TimerComponent;