const express = require('express');
const app = express();
const port = 3000;  
const { connectToDatabase } = require('./db_connection');

const connection = connectToDatabase();

app.use(express.static('Extension'));

app.post('/api/data', (req, res) => {
    res.send('Data received');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});