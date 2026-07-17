async function addSong(song, album, artists, connection){
    let sqlAddSong = `INSERT IGNORE INTO song (song_name, album) VALUES (?, ?)`;
    
    // Add the song to the database
    const addSongResult = await new Promise((resolve, reject) => {
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

    return addSongResult.insertId; // Return the song_id of the newly added song
}

//byline has artists and album info
const parseByline = (byline) => {
    if(!byline){
        console.log("Byline is null or undefined. Returning empty album and artists.");
        return {
            album: null,
            artists: []
        };
    }

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
        let regex = /^\d+([\.,]\d+)?[KMB]*\s+views$/i; 
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
async function getSongId(song, album, artists, connection) {
    if(!song){
        throw new Error("Song title is required to get song ID.");
    }

    console.log("Getting song ID for:", song, "Album:", album, "Artists:", artists);

    let sql = `
        SELECT s.song_id, s.album,
        GROUP_CONCAT(DISTINCT artist_name ORDER BY a.artist_name SEPARATOR ',') AS artists
        FROM song_artist AS sa
        JOIN song AS s
        ON sa.song_id = s.song_id 
        JOIN artist AS a
        ON sa.artist_id = a.artist_id
        WHERE s.song_name = ?
        GROUP BY s.song_id, s.album
        HAVING artists = ?;`
    ;

    const artistsString = [...artists].artists.sort().join(','); //[...artists] creates a copy of the array

    // Check if the song already exists in the database
    const results = await new Promise((resolve, reject) => {
        connection.query(sql, [song, artistsString], (err, results) => {
            if (err) {
                console.error('Error occurred while fetching song ID:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });

    if (results.length > 0) {
        /*Because mobile apps do not include album information, 
        the album needs to be updated if it's later retrieved when the song
        is played on desktop*/
        if(results[0].album === null && album !== null){
            let updateAlbumSql = `UPDATE song SET album = ? WHERE song_id = ?`;
            await new Promise((resolve, reject) => {
                connection.query(updateAlbumSql, [album, results[0].song_id], (err, updateResults) => {
                    if (err) {
                        console.error('Error occurred while updating album:', err);
                        reject(err);
                    } else {
                        resolve(updateResults);
                    }
                });
            });
        }

        return results[0].song_id;
    }else { 
        return await addSong(song, album, artists, connection); // return the song_id of the newly added song
    }
};

module.exports = { parseByline, getSongId};