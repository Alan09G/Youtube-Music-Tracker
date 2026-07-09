const API_URL = "http://localhost:3000/api/song_event";

chrome.runtime.onMessage.addListener((message) => { 

    console.log("Message Recieved: ", message);

    if(message.type === "SAVE_SONG_EVENT"){
        //Get stored song events and append the new event
        (async () => { 
            try{
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(message.songEvent)
                    });

                if(response.ok){
                    const result = await response.json();
                    console.log("Response: ", result);
                }else{
                    console.error("Error sending song event to server:", response.statusText);
                }
            }catch(error){
                console.error("Error sending song event to server:", error);
            }
    
        })();        
    }
});