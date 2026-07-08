console.log("The extension is running on YouTube music")

let lastSong = null;
let highestProgressPercent = 0;

const MIN_THRESHOLD = 0.5;

function getCurrentSong() {
    // get elements that contain music title, artist, and album
    const titleElement = document.querySelector("ytmusic-player-bar .title");
    const bylineElement = document.querySelector("ytmusic-player-bar .byline");

    // get song title and byline as strings
    const title = titleElement?.textContent?.trim() || null;
    const byline = bylineElement?.textContent?.trim() || null;

    if(!title || !byline){
        return null;
    }

    // get elements that contain current progress of the song
    const timeInfoElement = document.querySelector("ytmusic-player-bar .time-info");
    const timeParts = timeInfoElement?.textContent?.trim().split("/") || null;

    // get duration of song and play time in seconds
    let secondsPlayed = 0;
    let totalSeconds = 0;
    let percentPlayed = 0;

    if(timeParts.length === 2){
        secondsPlayed = parseTimeToSeconds(timeParts[0]);
        totalSeconds = parseTimeToSeconds(timeParts[1])

        if(totalSeconds > 0){
            percentPlayed = secondsPlayed / totalSeconds;
        }
    }


    return {
        title: title,
        byline: byline, 
        secondsPlayed: secondsPlayed,
        totalSeconds: totalSeconds,
        percentPlayed: percentPlayed
    };

}

// Compare if two songs are the same 
function songsAreSame(A, B) { 
    if(!A || !B){
        return false;
    }

    return A.title === B.title && A.byline === B.byline;
}

function checkSongChange(){
    currentSong = getCurrentSong();

    if(!currentSong){
        return;
    }

    // If this is the first song detected 
    if(!lastSong){
        console.log("Song has started: ", currentSong);
        lastSong = currentSong;
        highestProgressPercent = currentSong.percentPlayed;
        return;
    }

    // If the song has not changed update the play progress
    if(songsAreSame(currentSong, lastSong)){
        if(currentSong.percentPlayed > highestProgressPercent){
            highestProgressPercent = currentSong.percentPlayed;
        }

        console.log("Current progress: ", Math.round(highestProgressPercent * 100) + "%");
        return;
    }

    //If song has changed, create event 
    const result = highestProgressPercent >= MIN_THRESHOLD ? "PLAYED" : "SKIPPED";
    lastSong.result = result;
    delete lastSong.totalSeconds;
    delete lastSong.secondsPlayed;
    lastSong.percentPlayed = highestProgressPercent;

    chrome.runtime.sendMessage({
        type: "SAVE_SONG_EVENT",
        songEvent: lastSong
    });

    console.log("Song has changed!");
    console.log("Last song played:", lastSong.title);
    console.log("The song was:", result);
    console.log("Progress played:", Math.round(highestProgressPercent * 100) + "%");

    console.log("New song playing:", currentSong);

    //Update to new song
    lastSong = currentSong;
    highestProgressPercent = currentSong.percentPlayed;
}

function parseTimeToSeconds(timeText){
    if(!timeText){
        return;
    }

    const parts = timeText.trim().split(":").map(Number);

    if(parts.length === 2){
        return parts[0] * 60 + parts[1]; 
    }

    if(parts.length === 3){
        return parts[0] * 3600 + parts[1] * 60 + parts[0];
    }
}

//checks if song changes every second
setInterval(checkSongChange, 1000);