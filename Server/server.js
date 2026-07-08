const express = require('express');
const app = express();
const port = 3000;  
const { connectToDatabase } = require('./db_connection');

const connection = connectToDatabase();

addSong = (song, album, artists) => {
    let sqlAddSong = `INSERT INTO song (song_name) VALUES (${song})`;
    connection.query(sqlAddSong, (err, results) => {
        if (err) {
            console.error('Error occurred while adding song:', err);
        }
    });
    for (const artist of artists) {
        let sqlAddArtist = `INSERT IGNORE INTO artist (artist_name) VALUES (${artist})`;    
        connection.query(sqlAddArtist, (err, results) => {
            if (err) {
                console.error('Error occurred while adding artist:', err);
            }
        });
        let sqlAddSongArtist = 
        `INSERT INTO song_artist (song_id, artist_id) 
        VALUES ((SELECT song_id FROM song WHERE song_name = ${song}), 
        (SELECT artist_id FROM artist WHERE artist_name = ${artist}))`;
        connection.query(sqlAddSongArtist, (err, results) => {
            if (err) {
                console.error('Error occurred while adding song-artist relationship:', err);
            }
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
getSongId = (song, byline) => {
    const album = parseByline(byline)["album"];
    const artists = parseByline(byline)["artists"];

    console.log("Getting song ID for:", song, "Album:", album, "Artists:", artists);

    let sql = `SELECT song_id FROM songs WHERE title = ?`;

    connection.query(sql, [song], (err, results) => {
        if (err) {
            console.error('Error occurred while fetching song ID:', err);
            return null;
        }
        if (results.length > 0) {
            return results[0].song_id;
        }else { 
            addSong(song, album, artists);
        }
    });
};

app.use(express.static('Extension'));

app.post('/api/song_event', (req, res) => {
    const song = req.query.song; 
    const eventType = req.query.eventType;
    const percentPlayed = req.query.percentPlayed;
    const byline = req.query.byline;
    const song_id = getSongId(song, byline);
    const date = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format date for MySQL

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

    connection.query(sql, [song_id, eventType, percentPlayed, date], (err, results) => {
        if (err) {
            console.error('Error occurred while inserting song event:', err);
        }
    });


    res.send('Song event received');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});