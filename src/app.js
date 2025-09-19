const express = require("express");
const cors = require("cors");
const attendanceRoutes = require("./routes/attendance.routes");
const authMiddleware = require("./middlewares/auth.middleware");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/attendance", authMiddleware, attendanceRoutes);

module.exports = app;
