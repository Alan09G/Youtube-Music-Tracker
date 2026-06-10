console.log("The extension is running on YouTube music")

let lastSong = null;

function getCurrentSong() {
    const titleElement = document.querySelector("ytmusic-player-bar .title");
    const bylineElement = document.querySelector("ytmusic-player-bar .byline");

    const title = titleElement?.textContent?.trim() || null;
    const byline = bylineElement?.textContent?.trim() || null;

    if(!title || !byline){
        return null;
    }
    
    return {
        title: title,
        byline: bylineElement
    };

}

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

    if(!lastSong){
        console.log("Song has started: ", currentSong);
        lastSong = currentSong;
        return;
    }

    if(!songsAreSame(currentSong, lastSong)){
        console.log("Songs have changed");
        console.log("Last song: ", lastSong);
        console.log("Current song: ", currentSong);
        lastSong = currentSong;
    }
}

setInterval(checkSongChange, 3000);