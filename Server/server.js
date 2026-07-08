const express = require('express');
const app = express();
const port = 3000;  
const { connectToDatabase } = require('./db_connection');

const connection = connectToDatabase();

addSong = async (song, album, artists) => {
    let sqlAddSong = `INSERT IGNORE INTO song (song_name, album) VALUES (?, ?)`;
    
    // Add the song to the database
    await new Promise((resolve, reject) => {
        connection.query(sqlAddSong, [song, album], (err, results) => {
            if (err) {
                console.error('Error occurred while adding song:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });

    // Add artists and song-artist relationships
    for (const artist of artists) {
        let sqlAddArtist = `INSERT IGNORE INTO artist (artist_name) VALUES (?)`;    

        await new Promise((resolve, reject) => {
            connection.query(sqlAddArtist, [artist], (err, results) => {
                if (err) {
                    console.error('Error occurred while adding artist:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        let sqlAddSongArtist = 
        `INSERT INTO song_artist (song_id, artist_id) 
        VALUES ((SELECT song_id FROM song WHERE song_name = ?), 
        (SELECT artist_id FROM artist WHERE artist_name = ?))`;
        
        await new Promise((resolve, reject) => {
            connection.query(sqlAddSongArtist, [song, artist], (err, results) => {
                if (err) {
                    console.error('Error occurred while adding song-artist relationship:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }
}

//byline has artists and album info
parseByline = (byline) => {
    // TODO: Implement byline parsing logic
    return {
        album: "No Album",
        artists: []
    };
};

// Function to get song ID from the database. Creates the song if it doesn't exist.
getSongId = async (song, album, artists) => {

    console.log("Getting song ID for:", song, "Album:", album, "Artists:", artists);

    let sql = `SELECT song_id FROM song WHERE song_name = ? AND album = ?`;

    // Check if the song already exists in the database
    const results = await new Promise((resolve, reject) => {
        connection.query(sql, [song, album], (err, results) => {
            if (err) {
                console.error('Error occurred while fetching song ID:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });

    if (results.length > 0) {
        return results[0].song_id;
    }else { 
        await addSong(song, album, artists);
        return await getSongId(song, album, artists); // Recursively call to get the newly added song's ID
    }
};

app.use(express.static('Extension'));
app.use(express.json());

// Endpoint to receive song events from the extension
app.post('/api/song_event', async (req, res) => {
    const song = req.body.song; 
    const eventType = req.body.eventType;
    const percentPlayed = req.body.percentPlayed;
    const byline = req.body.byline;
    const date = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format date for MySQL

    const album = parseByline(byline)["album"];
    const artists = parseByline(byline)["artists"];
    
    try { 
        const song_id = await getSongId(song, album, artists);

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