// server/index.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./middleware/logger.js";

import authRouter from "./routers/auth.js";
import assignmentRouter from "./routers/assignments.js";
import userRouter from "./routers/users.js";
import announcementRoutes from "./routers/announcements.js";
import analyticsRouter from "./routers/analytics.js"; 
import courseRouter from "./routers/courses.js";
import courseMessageRouter from "./routers/courseMessages.js";


import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { connectDB } from "./db.js";

import { createServer } from "http";
import { Server } from "socket.io";
import { authenticateSocket, registerSocketHandlers } from "./socket.js";

dotenv.config();

const app = express();

// Create HTTP server for Socket.IO
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());
app.use(express.json());
app.use(logger);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Student Assignment Tracker API" });
});

// Existing routes
app.use("/api/auth", authRouter);
app.use("/api/assignments", assignmentRouter);
app.use("/api/users", userRouter);

// New announcements route
app.use("/api/announcements", announcementRoutes);
app.use("/api/analytics", analyticsRouter);
app.use("/api/courses", courseRouter);
app.use("/api/course-messages", courseMessageRouter);


// Error handlers
app.use(notFound);
app.use(errorHandler);

// Socket connection
io.use(authenticateSocket);
io.on("connection", (socket) => {
  console.log("User connected");
  registerSocketHandlers(io, socket);
});

const port = process.env.PORT || 8001;

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
