chrome.runtime.onMessage.addListener((message) => { 

    console.log("Message Recieved: ", message);

    if(message.type === "SAVE_SONG_EVENT"){
        //Get stored song events and append the new event
        (async () => { 
            const result = await chrome.storage.local.get("songEvents");
            const newSongEvent = message.songEvent;
            const events = result.songEvents || [];
            events.push(newSongEvent);
            console.log("Stored events: ", events);
            await chrome.storage.local.set({songEvents: events});
        })();        
    }
});