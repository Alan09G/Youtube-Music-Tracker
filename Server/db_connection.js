const mysql = require('mysql');

export function connectToDatabase() {
    const connection = mysql.createConnection({
        host: 'crossover.proxy.rlwy.net',
        user: 'root',
        password: process.env.DB_PASS,
        database: 'song_tracking',
        port: 19137
    });

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to MySQL:', err);
            return;
        }
        console.log('Connected to MySQL database');
    });
    
    return connection;
}