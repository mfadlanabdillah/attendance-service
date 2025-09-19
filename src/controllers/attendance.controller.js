const pool = require("../models/db");
require("dotenv").config();

exports.checkIn = async (req, res) => {
  const userId = req.user.id;
  const status = req.body.status || "masuk";
  const today = new Date().toISOString().split("T")[0]; // format YYYY-MM-DD
  const now = new Date();

  try {
    // Cek apakah sudah check-in hari ini
    const existing = await pool.query(
      "SELECT * FROM attendance WHERE user_id = $1 AND date = $2",
      [userId, today]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Sudah check-in hari ini" });
    }

    // Simpan data check-in
    const result = await pool.query(
      `INSERT INTO attendance (user_id, date, check_in, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, user_id, date, check_in, status`,
      [userId, today, now, status]
    );

    res.status(201).json({
      message: "Check-in berhasil",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
  // res.json({ message: "Check-in dummy OK" });
};

exports.checkOut = async (req, res) => {
  const userId = req.user.id;
  const status = req.body.status || "pulang";
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  try {
    // Cek apakah sudah check-in hari ini
    const result = await pool.query(
      "SELECT * FROM attendance WHERE user_id = $1 AND date = $2",
      [userId, today]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Belum check-in hari ini" });
    }

    const attendance = result.rows[0];

    // Cek apakah sudah check-out
    if (attendance.check_out) {
      return res.status(409).json({ message: "Sudah check-out hari ini" });
    }

    // Update check-out
    const update = await pool.query(
      `UPDATE attendance
         SET check_out = $1, status = $2, updated_at = NOW()
         WHERE user_id = $3 AND date = $4
         RETURNING id, user_id, date, check_in, check_out, status`,
      [now, status, userId, today]
    );

    res.status(200).json({
      message: "Check-out berhasil",
      data: update.rows[0],
    });
  } catch (err) {
    console.error("Check-out error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
  // res.json({ message: "Check-out dummy OK" });
};

exports.getSummary = async (req, res) => {
  const userId = req.user.id;
  const { start, end, status } = req.query;

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - 6);

  const startDate = start || defaultStart.toISOString().split("T")[0];
  const endDate = end || today.toISOString().split("T")[0];

  try {
    let query = `
        SELECT date, check_in, check_out, status
        FROM attendance
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
      `;
    const params = [userId, startDate, endDate];

    if (status) {
      query += ` AND status = $4`;
      params.push(status);
    }

    query += ` ORDER BY date DESC`;

    const result = await pool.query(query, params);

    res.json({
      range: { start: startDate, end: endDate },
      filter: status || "all",
      total: result.rows.length,
      records: result.rows,
    });
  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getToday = async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const result = await pool.query(
      `SELECT date, check_in, check_out, status
         FROM attendance
         WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Belum ada absensi hari ini" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Today error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllSummary = async (req, res) => {
  const { start, end, status, user_id, limit = 20, offset = 0 } = req.query;

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - 6);

  const startDate = start || defaultStart.toISOString().split("T")[0];
  const endDate = end || today.toISOString().split("T")[0];

  try {
    let query = `
      SELECT user_id, date, check_in, check_out, status
      FROM attendance
      WHERE date BETWEEN $1 AND $2
    `;
    const params = [startDate, endDate];
    let paramIndex = 3;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (user_id) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    query += ` ORDER BY date DESC
               LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      range: { start: startDate, end: endDate },
      filter: status || "all",
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      records: result.rows,
    });
  } catch (err) {
    console.error("All Summary error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
