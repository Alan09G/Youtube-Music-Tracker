const express = require('express');
const app = express();
const cors = require('cors');
const port = 3000;
const { connectToDatabase } = require('./db_connection.cjs');
const { parseByline, getSongId } = require('./helper_functions');

const connection = connectToDatabase();

app.use(express.static('Extension'));
app.use(express.json());
app.use(cors({
    origin: "chrome-extension://jmcbekfjjpffbmhlpobhjibdjklpefbk"
}));

// Endpoint to receive song events from the extension
app.post('/api/song_event', async (req, res) => {
    console.log("Request Body: ", req.body);
    console.log("Song title: ", req.body.title);

    const song = req.body.title; 
    console.log("Song Title: ", song);
    const eventType = req.body.result;
    const percentPlayed = req.body.percentPlayed;
    const byline = req.body.byline;
    const date = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format date for MySQL

    const album = parseByline(byline)["album"];
    const artists = parseByline(byline)["artists"];
    
    try { 
        const song_id = await getSongId(song, album, artists, connection);

        console.log(`Received song event: 
            Song: ${song}, 
            Event Type: ${eventType}, 
            Percent Played: ${percentPlayed}, 
            Byline: ${byline}, 
            Song ID: ${song_id}, 
            Date: ${date}`
        );

        let sql = 
        `INSERT INTO song_event (song_id, event_type, percent_played, created_at) 
        VALUES (?, ?, ?, ?)`;

        await new Promise((resolve, reject) => {
            connection.query(sql, [song_id, eventType, percentPlayed, date], (err, results) => {
                if (err) {
                    console.error('Error occurred while inserting song event:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    } catch (error) {
        console.error('Error processing song event:', error);
        res.status(500).send('Error processing song event');
        return;
    }


    res.send('Song event received');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});