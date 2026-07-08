const express = require('express');
const app = express();
const port = 3000;  
const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'your_database'
});

app.use(express.static('Extension'));

app.post('/api/data', (req, res) => {
    res.send('Data received');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});