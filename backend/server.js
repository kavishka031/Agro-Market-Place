const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aswanna_direct',
    waitForConnections: true,
    connectionLimit: 10
};

const db = mysql.createPool({
    ...dbConfig
});

// 1. සියලුම දිස්ත්‍රික්ක ලබා ගැනීම (GET /api/districts)
app.get('/api/districts', (req, res) => {
    db.query('SELECT * FROM districts', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. බෝග තොග ලබා ගැනීම (GET /api/listings)
app.get('/api/listings', (req, res) => {
    const sql = `
        SELECT c.*, d.name_si AS district_name, d.province, u.full_name AS farmer_name, u.phone AS farmer_phone
        FROM crop_listings c
        JOIN districts d ON c.district_id = d.id
        JOIN users u ON c.farmer_id = u.id
        ORDER BY c.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. ගොවියා විසින් නව බෝග තොගයක් ඇතුළත් කිරීම (POST /api/listings)
app.post('/api/listings', (req, res) => {
    const { farmer_id, district_id, category, crop_name, farm_price, market_price, available_qty_kg, harvest_date } = req.body;
    const sql = `
        INSERT INTO crop_listings (farmer_id, district_id, category, crop_name, farm_price, market_price, available_qty_kg, harvest_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [farmer_id || 1, district_id, category, crop_name, farm_price, market_price, available_qty_kg, harvest_date], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'නව අස්වැන්න සාර්ථකව ඇතුළත් කරන ලදී!', id: result.insertId });
    });
});

// 4. UML Statechart: Surplus Bulk Offer (-20% Discount) ක්‍රියාත්මක කිරීම
app.put('/api/listings/:id/surplus', (req, res) => {
    const { id } = req.params;
    const sql = `
        UPDATE crop_listings 
        SET status = 'SURPLUS_BULK', farm_price = ROUND(farm_price * 0.80, 2) 
        WHERE id = ? AND status = 'PRE_HARVEST'
    `;
    db.query(sql, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Surplus Bulk Offer (20% වට්ටම්) සක්‍රීය කරන ලදී!' });
    });
});

// 5. UML Sequence & State: පෙර-ඇණවුමක් (Pre-Order) සිදු කිරීම
app.post('/api/orders', (req, res) => {
    const { listing_id, buyer_id, quantity_kg } = req.body;

    db.query('SELECT farm_price, available_qty_kg FROM crop_listings WHERE id = ?', [listing_id], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).json({ error: 'බෝග තොගය හමු නොවීය.' });

        const item = rows[0];
        if (quantity_kg > item.available_qty_kg) {
            return res.status(400).json({ error: 'ප්‍රමාණවත් තොග නොමැත.' });
        }

        const total_price = item.farm_price * quantity_kg;
        const new_qty = item.available_qty_kg - quantity_kg;
        const new_status = new_qty === 0 ? 'SOLD_OUT' : null;

        // ඇණවුම CONFIRMED ලෙස සටහන් කිරීම
        const orderSql = `INSERT INTO pre_orders (listing_id, buyer_id, quantity_kg, total_price, order_status) VALUES (?, ?, ?, ?, 'CONFIRMED')`;
        db.query(orderSql, [listing_id, buyer_id || 2, quantity_kg, total_price], (err, orderRes) => {
            if (err) return res.status(500).json({ error: err.message });

            // තොග ප්‍රමාණය යාවත්කාලීන කිරීම
            const updateSql = new_status 
                ? `UPDATE crop_listings SET available_qty_kg = ?, status = 'SOLD_OUT' WHERE id = ?`
                : `UPDATE crop_listings SET available_qty_kg = ? WHERE id = ?`;

            db.query(updateSql, [new_qty, listing_id], () => {
                res.json({ message: 'ඇණවුම තහවුරු විය (CONFIRMED)!', order_id: orderRes.insertId, total_price });
            });
        });
    });
});

// 6. ඇණවුම් ලැයිස්තුව ලබා ගැනීම (GET /api/orders)
app.get('/api/orders', (req, res) => {
    const sql = `
        SELECT o.*, c.crop_name, d.name_si AS district_name 
        FROM pre_orders o
        JOIN crop_listings c ON o.listing_id = c.id
        JOIN districts d ON c.district_id = d.id
        ORDER BY o.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/health', (req, res) => {
    db.query('SELECT 1 AS ok', (err) => {
        if (err) return res.status(503).json({ status: 'error', error: err.message });
        res.json({ status: 'ok', database: dbConfig.database });
    });
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

const port = Number(process.env.PORT || 5001);
db.getConnection((err, connection) => {
    if (err) {
        console.error(`Database connection failed: ${err.message}`);
        console.error('Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME environment variables if needed.');
        process.exitCode = 1;
        return;
    }

    connection.ping((pingError) => {
        connection.release();
        if (pingError) {
            console.error(`Database ping failed: ${pingError.message}`);
            process.exitCode = 1;
            return;
        }

        const server = app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });

        server.on('error', (listenError) => {
            if (listenError.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use. The backend may already be running.`);
                console.error(`Stop the process using port ${port}, or start on another port with PORT=5001 npm start.`);
            } else {
                console.error(`Could not start server on port ${port}: ${listenError.message}`);
            }

            db.end((closeError) => {
                if (closeError) console.error(`Could not close database pool: ${closeError.message}`);
                process.exitCode = 1;
            });
        });
    });
});