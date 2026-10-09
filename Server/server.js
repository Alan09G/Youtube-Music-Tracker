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
    origin: [
        "http://localhost:5174",
        "chrome-extension://jmcbekfjjpffbmhlpobhjibdjklpefbk",
        "chrome-extension://phfcophdhpclenkemcjafbagebadgbee"
    ]
}));

async function runQuery(sql, cutoff){
    await new Promise((resolve, reject) => {
    connection.query(sql, [cutoff], (err, results) => {
        if (err){
            console.log("An error occured when getting the top tracks:", err);
            reject(err);
        }
        else{
            resolve(results);
        }
    })
})
}


// Endpoint to receive song events from the extension
app.post('/api/song_event', async (req, res) => {
    console.log("Request Body: ", req.body);

    const song = req.body.title; 
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


    res.send({
        message: 'Song event received'
    });
});

//Endpoint to retrieve music data from database
app.get('/get-music-data', async(req, res) => {
    try {
        const timeFrame = req.query.timeFrame;

        const now = new Date();
        const cutoff = new Date(now);

        switch (timeFrame) {
            case "last7Days":
                cutoff.setDate(now.getDate() - 7);
                break;

            case "last30Day":
                cutoff.setDate(now.getDate() - 30);
                break;
            
            case "last90Days":
                cutoff.setDate(now.getDate() - 90);
                break;
            
            case "lastYear":
                cutoff.setFullYear(now.getFullYear() - 1);
                break;

            case "allTime":
                cutoff.setFullYear(1970);
                break;

            default:
                return res.status(400).send({
                    error: "invalid timeframe"
                });
        }

        
        let sqlTracks = `
            SELECT
                s.song_name,
                s.album_name,
                GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.artist_name SEPARATOR ', ') AS artists,
                COUNT(DISTINCT CASE
                    WHEN se.event_type = 'PLAYED' THEN se.id
                END) AS num_times_played,
                COUNT(DISTINCT CASE
                    WHEN se.event_type = 'SKIPPED' THEN se.id
                END) AS num_times_skipped
            FROM song AS s
            LEFT JOIN song_event AS se
                ON se.song_id = s.song_id
            LEFT JOIN song_artist AS sa
                ON sa.song_id = s.song_id
            LEFT JOIN artist AS a
                ON a.artist_id = sa.artist_id
            WHERE ? < se.created_at
            GROUP BY s.song_id, s.song_name
            ORDER BY num_times_played DESC
        ;`;

        let sqlAlbums = `
            SELECT
                s.album_name,
                COUNT(DISTINCT CASE
                    WHEN se.event_type = 'PLAYED' THEN se.id
                END) AS num_times_played
            FROM song AS s 
            JOIN song_event AS se
                ON se.song_id = s.song_id
            WHERE ? < se.created_at AND s.album_name IS NOT NULL
            GROUP BY s.album_name
            ORDER BY num_times_played DESC
        ;`;

        let sqlArtists = `
            SELECT 
                a.artist_name,
                COUNT(DISTINCT CASE
                    WHEN se.event_type = 'PLAYED' THEN se.id
                END) AS num_times_played
                FROM artist AS a
                JOIN song_artist AS sa
                    ON sa.artist_id = a.artist_id
                JOIN song_event AS se
                    ON se.song_id = sa.song_id
                WHERE ? < se.created_at
                GROUP BY a.artist_name
                ORDER BY num_times_played DESC
        `

        const topTracks = runQuery(sqlTracks, cutoff)
        const topAlbums = runQuery(sqlAlbums, cutoff)
        const topArtists = runQuery(sqlArtists, cutoff)

        res.send({
            topTracks,
            topAlbums,
            topArtists
        })

    }catch (error){
        console.error("Error retrieving music data:", error);

        res.status(500).send({
            error: "Failed to retrieve music data"
        });
    }
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});