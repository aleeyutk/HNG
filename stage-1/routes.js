const express = require('express');

const { enrichProfile, APIError } = require('./services');
const { getDB } = require('./database');

const router = express.Router();

router.post('/profiles', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ status: "error", message: "Missing or empty name" });
        }
        if (typeof name !== 'string') {
            return res.status(422).json({ status: "error", message: "Invalid type" });
        }
        if (name.trim() === '') {
            return res.status(400).json({ status: "error", message: "Missing or empty name" });
        }
        const cleanName = name.trim().toLowerCase();

        const db = getDB();

        const existing = await db.get('SELECT * FROM profiles WHERE name = ?', cleanName);
        if (existing) {
            return res.status(200).json({
                status: "success",
                message: "Profile already exists",
                data: existing
            });
        }

        const enriched = await enrichProfile(cleanName);
        const { v7: uuidv7 } = await import('uuid');
        const id = uuidv7();
        const created_at = new Date().toISOString();

        await db.run(
            `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, cleanName, enriched.gender, enriched.gender_probability, enriched.sample_size, enriched.age, enriched.age_group, enriched.country_id, enriched.country_probability, created_at]
        );

        res.status(201).json({
            status: "success",
            data: {
                id,
                name: cleanName,
                gender: enriched.gender,
                gender_probability: enriched.gender_probability,
                sample_size: enriched.sample_size,
                age: enriched.age,
                age_group: enriched.age_group,
                country_id: enriched.country_id,
                country_probability: enriched.country_probability,
                created_at
            }
        });

    } catch (error) {
        if (error instanceof APIError) {
            return res.status(502).json({ status: "502", message: error.message });
        }
        return res.status(500).json({ status: "error", message: "Server failure" });
    }
});

router.get('/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const profile = await db.get('SELECT * FROM profiles WHERE id = ?', id);
        if (!profile) {
            return res.status(404).json({ status: "error", message: "Profile not found" });
        }

        res.status(200).json({
            status: "success",
            data: profile
        });
    } catch (error) {
         res.status(500).json({ status: "error", message: "Server failure" });
    }
});

router.get('/profiles', async (req, res) => {
    try {
        const { gender, country_id, age_group } = req.query;
        let query = 'SELECT id, name, gender, age, age_group, country_id FROM profiles';
        const params = [];
        const conditions = [];

        if (gender && typeof gender === 'string') {
            conditions.push('LOWER(gender) = ?');
            params.push(gender.toLowerCase());
        }
        if (country_id && typeof country_id === 'string') {
            conditions.push('LOWER(country_id) = ?');
            params.push(country_id.toLowerCase());
        }
        if (age_group && typeof age_group === 'string') {
            conditions.push('LOWER(age_group) = ?');
            params.push(age_group.toLowerCase());
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const db = getDB();
        const profiles = await db.all(query, params);

        res.status(200).json({
            status: "success",
            count: profiles.length,
            data: profiles
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: "Server failure" });
    }
});

router.delete('/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        await db.run('DELETE FROM profiles WHERE id = ?', id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ status: "error", message: "Server failure" });
    }
});

module.exports = router;
