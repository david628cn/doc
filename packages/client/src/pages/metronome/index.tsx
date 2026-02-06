import { Button } from 'antd';
import React, { useEffect, useRef } from 'react';

class Metronome {
    private audioContext: any;
    private oscillatorNode: any;
    private gainNode: any;
    private timerWorker: any;
    constructor() {
        this.init();
    }
    init() {
        this.audioContext = this.createAudioContext();
    }
    createAudioContext() {
        const win: any = window;
        const AudioContext = win.AudioContext || win.webkitAudioContext;
        const audioContext = new AudioContext();
        return audioContext;
    }
    play() {
        this.oscillatorNode = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();
        this.oscillatorNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        this.oscillatorNode.frequency.setValueAtTime(300, 0);
        this.gainNode.gain.setValueAtTime(200, 0);
        // this.gainNode.gain.linearRampToValueAtTime(200, 100);
        // this.gainNode.gain.linearRampToValueAtTime(0, time + tempsCurr.releaseLength);

        this.oscillatorNode.start(0);
        console.log(this.audioContext);
    }
    pause() {
        this.oscillatorNode.stop();
    }
}

// const createAudioContext = () => {
//     const win: any = window;
//     const AudioContext = win.AudioContext || win.webkitAudioContext;
//     const audioCtx = new AudioContext();
//     // const oscillatorNode = audioCtx.createOscillator();
//     // const gainNode = audioCtx.createGain();
//     // const finish = audioCtx.destination;
//     return audioCtx;
// }

// const scheduleNote = (audioContext: any, beatNumber?: number, time?: number) => {

// const params: any = {
//     dec: 2,
//     volume: 7
// };
// const current16thNote = -1;
// let currentTime = 0;
//     const oscillatorNode = audioContext.createOscillator();
//     const gainNode = audioContext.createGain();
//     const finish = audioContext.destination;
//     oscillatorNode.connect(gainNode);
//     gainNode.connect(finish);
//     // currentTime = Math.floor(current16thNote / params.dec);
//     oscillatorNode.start(0);
//     // oscillatorNode.stop(0 + 1);
// }

interface IProps {
}

const Page: React.FC<IProps> = props => {
    let metronomeRef = useRef<any>(null);
    useEffect(() => {
        metronomeRef.current = new Metronome();
        // console.log(audioCtxRef.current.currentTime);
    }, []);
    const handlePlay = (e: any) => {
        metronomeRef.current.play();
    }
    const handlePause = (e: any) => {
        metronomeRef.current.pause();
    }
    return (
        <div>
            <Button onClick={handlePlay}>{ '>' }</Button>
            <Button onClick={handlePause}>{ '||' }</Button>
        </div>
    );
}

export default Page;