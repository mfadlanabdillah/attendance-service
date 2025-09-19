const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");

router.post("/check-in", attendanceController.checkIn);
router.post("/check-out", attendanceController.checkOut);
router.get("/summary", attendanceController.getSummary);
router.get("/today", attendanceController.getToday);
router.get("/all-summary", attendanceController.getAllSummary);

module.exports = router;
