console.log("Youtube Music Tracker content script loaded");

let currentTrack = null;
let currentStartTime = null;
let lastProgressPercent = 0;

const COMPLETE_THRESHOLD = 0.8;

function getTrackInfo() {
    const titleElement = document.querySelector(
        "ytmusic-player-bar .title" 
    );

    const artistElement = document.querySelector(
        "ytmusic-player-bar .byline"
    );

    const timeInfoElement = document.querySelector(
        "ytmusic-player-bar .time-info"
    );

    const title = titleElement?.textContent?.trim() || null;
    const artist = artistElement?.textContent?.trim() || null;

    let progressPercent = 0;
    let currentSeconds = 0;
    let durationSeconds = 0;

    if(timeInfoElement) {
        const timeText = timeInfoElement.textContent.trim();

        const parts = timeText.split("/");

        if(parts.length == 2) { 
            currentSeconds = parseTimeToSeconds(parts[0]);
            durationSeconds = parseTimeToSeconds(parts[1]);

            if(durationSeconds > 0){
                progressPercent = currentSeconds / durationSeconds;
            }
        }
    }

    if(!title || !artist) {
        return null;
    }

    return { 
        title,
        artist,
        progressPercent,
        currentSeconds,
        durationSeconds
    };
}

function parseTimeToSeconds(timeText) {
    if(!timeText) return 0;

    const parts = timeText.trim().split(":").map(Number);

    if(parts.length === 2) { 
        return parts[0] * 60 + parts[1];
    }

    if(parts.length === 3) { 
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
}

function sameTrack(a, b) {
    if (!a || !b) return false;

    return a.title === b.title && a.artist === b.artist;
}

function sendSongEvent(eventType, track, extra = {}) {
    chrome.runtime.sendMessage({
        type: "SONG_EVENT",
        data: {
            eventType, 
            title: track.title,
            artitst: track.artist,
            timestamp: Date.now(),
            ...extra
        }
    });
}

function startTrack(track) {
    currentTrack = {
        track, 
        progressPercent: track.progressPecent || 0,
        currentSeconds: track.currentSeconds || 0,
        durationSeconds: track.durationSeconds || 0
    };
    currentStartTime = Date.now();
    lastProgressPercent = track.progressPercent || 0;

    console.log("Started:", track.title, "-", track.artist);

    sendSongEvent("STARTED", track, {
        progressPercent: track.progressPercent
    });
}

function finishCurrentTrack(reason) {
    if(!currentTrack || !currentStartTime) return;

    const listenedSeconds = Math.round(
        (Date.now() - currentStartTime) / 1000
    );

    const finalProgress = currentTrack.progressPercent || lastProgressPercent || 0;

    const completed = lastProgressPercent >= COMPLETE_THRESHOLD;
    const eventType = completed ? "COMPLETED" : "SKIPPED";

    console.log(
        `${eventType}:`,
        currentTrack.title,
        currentTrack.artist,
        "progress:",
        lastProgressPercent,
        "reason:",
        reason
    );

    sendSongEvent(eventType, currentTrack, {
        listenedSeconds,
        progressPercent: finalProgress,
        currentSeconds: currentTrack.currentSeconds,
        durationSeconds: currentTrack.durationSeconds,
        reason
    });
}

function checkPlayer() {
    const track = getTrackInfo();
    console.log("Track check:", track)

    if(!track) return;

    if(!currentTrack) { 
        startTrack(track);
        return;
    }

    if(sameTrack(currentTrack, track)) { 
        if(track.progressPecent > lastProgressPercent) {
            lastProgressPercent = track.progressPercent;
        }

        currentTrack.progressPecent = lastProgressPercent;
        currentTrack.currentSeconds = track.currentSeconds;
        currentTrack.durationSeconds = track.durationSeconds; 

        return;
    }

    finishCurrentTrack("track_changed");
    startTrack(track);
}

setInterval(checkPlayer, 1000);

window.addEventListener("beforeunload", () => {
    finishCurrentTrack("page_unloaded");
});