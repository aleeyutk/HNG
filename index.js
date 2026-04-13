const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes (requirement)
app.use(cors({
    origin: '*',
}));
app.use(express.json());

// Main GET Endpoint
app.get('/api/classify', async (req, res) => {
    try {
        const { name } = req.query;

        // Validation: Missing or empty name
        if (name === undefined || name === '') {
            return res.status(400).json({
                status: 'error',
                message: 'Name parameter is required'
            });
        }

        // Validation: Non-string name (e.g. array from ?name[]=foo)
        if (typeof name !== 'string') {
            return res.status(422).json({
                status: 'error',
                message: 'Name must be a string'
            });
        }

        // Fetch from Genderize API
        const genderizeUrl = `https://api.genderize.io/?name=${encodeURIComponent(name)}`;
        const response = await axios.get(genderizeUrl);
        const data = response.data;

        // Edge Case: gender null or count 0
        if (data.gender === null || data.count === 0) {
            return res.status(404).json({ // Using 404 for Not Found results
                status: 'error',
                message: 'No prediction available for the provided name'
            });
        }

        // Data Processing
        const sample_size = data.count;
        const probability = data.probability;
        const is_confident = Boolean(probability >= 0.7 && sample_size >= 100);
        const processed_at = new Date().toISOString();

        // Success Response
        return res.status(200).json({
            status: 'success',
            data: {
                name: data.name,
                gender: data.gender,
                probability: probability,
                sample_size: sample_size,
                is_confident: is_confident,
                processed_at: processed_at
            }
        });

    } catch (error) {
        console.error('Error processing request:', error.message);
        
        // Handle axios/network errors gracefully
        if (error.response) {
            return res.status(502).json({
                status: 'error',
                message: 'Error communicating with external API'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error occurring while classifying name'
        });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
