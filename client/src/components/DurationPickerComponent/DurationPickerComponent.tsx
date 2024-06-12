import React, {useEffect, useState} from "react";
import './DurationPickerComponent.css';

function DurationPickerComponent({durationSeconds, onChange, disabled}: {durationSeconds: number, onChange: (newSeconds: number) => void, disabled: boolean}) {
    // two input type="number" one for minutes and one for seconds
    const [seconds, setSeconds] = useState<number>(durationSeconds % 60);
    const [minutes, setMinutes] = useState<number>(Math.floor(durationSeconds / 60));


    useEffect(() => {
        setSeconds(durationSeconds % 60);
        setMinutes(Math.floor(durationSeconds / 60));
    }, [durationSeconds]);

    const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSeconds(parseInt(e.target.value));
        onChange(minutes * 60 + parseInt(e.target.value));
    };

    const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(parseInt(e.target.value) > 120) {
            e.target.value = "120";
        } else if(parseInt(e.target.value) < 1) {
            e.target.value = "1";
        }
        setMinutes(parseInt(e.target.value));
        onChange(parseInt(e.target.value) * 60 + seconds);
    };

    return (
        <span className={"duration-picker"}>
            <input className={"duration-picker__input"} type="number" value={minutes} onChange={handleMinutesChange} min={1} max={120}
            disabled={disabled}/>
            <span className={"duration-picker__colon"}> : </span>
            <input type="number" className={"duration-picker__input"} value={seconds} onChange={handleSecondsChange} min={0} max={59}
            disabled={disabled}/>
        </span>
    );
}

export default DurationPickerComponent;