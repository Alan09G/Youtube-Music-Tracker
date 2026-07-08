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
export const parseByline = (byline) => {
    const bylineParts = byline.trim().split("•").map(part => part.trim());

    let artists = [];
    let album = null;

    if(bylineParts[0]){
        // Split artists by common delimiters like "&", "x", or "feat"
        artists = bylineParts[0].split(/[&,x]|feat/i).map(artist => artist.trim());
    }
    if(bylineParts[1]){
        // Regex to match view counts like "1.2K views", "3M views", etc.
        // music videos have view counts instead of album names.
        let regex = /^\d+(\.\d+)?[KMB]*\s+views$/i; 
        if(!regex.test(bylineParts[1])){
            album = bylineParts[1];
        }
    }
    return {
        album: album,
        artists: artists
    };
};

// Function to get song ID from the database. Creates the song if it doesn't exist.
export const getSongId = async (song, album, artists) => {

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