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

router.get('/profiles', async (req, res) => {
    try {
        const { gender, country_id, age_group, min_age, max_age, min_gender_probability, min_country_probability, sort_by, order, page, limit } = req.query;
        let query = 'SELECT * FROM profiles';
        let countQuery = 'SELECT COUNT(*) as count FROM profiles';
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
        if (min_age) {
            conditions.push('age >= ?');
            params.push(parseInt(min_age, 10));
        }
        if (max_age) {
            conditions.push('age <= ?');
            params.push(parseInt(max_age, 10));
        }
        if (min_gender_probability) {
            conditions.push('gender_probability >= ?');
            params.push(parseFloat(min_gender_probability));
        }
        if (min_country_probability) {
            conditions.push('country_probability >= ?');
            params.push(parseFloat(min_country_probability));
        }

        let whereClause = '';
        if (conditions.length > 0) {
            whereClause = ' WHERE ' + conditions.join(' AND ');
        }
        query += whereClause;
        countQuery += whereClause;

        if (sort_by && ['age', 'created_at', 'gender_probability'].includes(sort_by.toLowerCase())) {
            const sortOrder = (order && order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
            query += ` ORDER BY ${sort_by.toLowerCase()} ${sortOrder}`;
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        let limitNum = Math.max(1, parseInt(limit, 10) || 10);
        if (limitNum > 50) limitNum = 50;

        query += ` LIMIT ? OFFSET ?`;
        params.push(limitNum, (pageNum - 1) * limitNum);

        const db = getDB();
        const [totalResult, profiles] = await Promise.all([
            db.get(countQuery, params.slice(0, conditions.length)),
            db.all(query, params)
        ]);

        res.status(200).json({
            status: "success",
            page: pageNum,
            limit: limitNum,
            total: totalResult.count,
            data: profiles
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: "Server failure" });
    }
});

router.get('/profiles/search', async (req, res) => {
    try {
        const { q, page, limit } = req.query;
        if (!q) {
            return res.status(400).json({ status: "error", message: "Invalid query parameters" });
        }
        
        const { parseNaturalLanguageQuery } = require('./services');
        const filters = parseNaturalLanguageQuery(q);
        
        if (!filters) {
            return res.status(400).json({ status: "error", message: "Unable to interpret query" });
        }

        let query = 'SELECT * FROM profiles';
        let countQuery = 'SELECT COUNT(*) as count FROM profiles';
        const params = [];
        const conditions = [];

        if (filters.gender) {
            conditions.push('LOWER(gender) = ?');
            params.push(filters.gender.toLowerCase());
        }
        if (filters.country_id) {
            conditions.push('LOWER(country_id) = ?');
            params.push(filters.country_id.toLowerCase());
        }
        if (filters.age_group) {
            conditions.push('LOWER(age_group) = ?');
            params.push(filters.age_group.toLowerCase());
        }
        if (filters.min_age !== undefined) {
            conditions.push('age >= ?');
            params.push(filters.min_age);
        }
        if (filters.max_age !== undefined) {
            conditions.push('age <= ?');
            params.push(filters.max_age);
        }

        let whereClause = '';
        if (conditions.length > 0) {
            whereClause = ' WHERE ' + conditions.join(' AND ');
        }
        query += whereClause;
        countQuery += whereClause;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        let limitNum = Math.max(1, parseInt(limit, 10) || 10);
        if (limitNum > 50) limitNum = 50;

        query += ` LIMIT ? OFFSET ?`;
        params.push(limitNum, (pageNum - 1) * limitNum);

        const db = getDB();
        const [totalResult, profiles] = await Promise.all([
            db.get(countQuery, params.slice(0, conditions.length)),
            db.all(query, params)
        ]);

        res.status(200).json({
            status: "success",
            page: pageNum,
            limit: limitNum,
            total: totalResult.count,
            data: profiles
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: "Server failure" });
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
