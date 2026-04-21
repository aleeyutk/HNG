const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');
const routes = require('./routes');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api', routes);

const PORT = process.env.PORT || 3000;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}).catch(console.error);
