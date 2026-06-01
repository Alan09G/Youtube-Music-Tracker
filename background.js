chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message recieved:", message);

    if(message.type === "SONG_EVENT") {
        saveSongEvent(message.data).then(() => {
            sendResponse({ success: true });
        }).catch((error) => {
            console.error("Failed to save song event:", error);
            sendResponse({ success: false, error: error.message });
        });

        return true;
    }
});

async function saveSongEvent(eventData) {
    const result = await chrome.storage.local.get(["songEvents"]);

    const songEvents = result.songEvents || [];

    songEvents.push({
        ...eventData,
        savedAt: Date.now()
    });

    await chrome.storage.local.set({
        songEvents: songEvents
    });

    console.log("Saved event:", eventData);
}