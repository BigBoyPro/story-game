import { useState, useEffect } from "react";

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

type Timestamp = {
  days: number,
  hours: number,
  minutes: number,
  seconds: number
}


const getTimestamp = (time : number) : Timestamp => {
  if(time < 0) return {days: 0, hours: 0, minutes: 0, seconds: 0};
  return {
    days: Math.floor(time / DAY),
    hours: Math.floor((time / HOUR) % 24),
    minutes: Math.floor((time / MINUTE) % 60),
    seconds: Math.floor((time / SECOND) % 60)
  }
}

const pad = (number: number): string => number.toString().padStart(2, '0');

function TimerComponent({start, end} : {start : Date, end : Date}) {


  const [duration,setDuration] = useState(getTimestamp(end.getTime() - start.getTime()))
  const [timer, setTimer] = useState(getTimestamp(end.getTime() - Date.now()))


  useEffect(() => {
    const intervalId = setInterval(() => {

      const now = Date.now();
      const newTime = end.getTime() - now
      if(start.getTime() > now){
        setTimer(duration)
      } else if(newTime >= 0) {
        setTimer(getTimestamp(newTime))
      } else {
        clearInterval(intervalId);
      }
    }, SECOND);

    return () => {
      clearInterval(intervalId);
    };
  }, [end]);

  useEffect(() => {
    const newDuration = end.getTime() - start.getTime();
    if(newDuration >= 0){
      setDuration(getTimestamp(newDuration))
    }
    if(start.getTime() > Date.now()){
      setTimer(duration)
    }
  }, [start,end])


  return (
      <b>{pad(timer.minutes)}:{pad(timer.seconds)}/{pad(duration.minutes)}:{pad(duration.seconds)}</b>
  );
}

export default TimerComponent;