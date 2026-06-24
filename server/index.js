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


import { notFound, errorHandler } from "./middleware/errorHandler.js";

import { createServer } from "http";
import { Server } from "socket.io";

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


// Error handlers
app.use(notFound);
app.use(errorHandler);

// Socket connection
io.on("connection", (socket) => {
  console.log("User connected");

  // join course room
  socket.on("joinCourse", (course) => {
    socket.join(course);
  });

  // receive message and broadcast
  socket.on("courseMessage", (data) => {
    io.to(data.course).emit("courseMessage", data.message);
  });

  // example notification
  setTimeout(() => {
    socket.emit("notification", "New assignment announcement posted!");
  }, 5000);

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const port = process.env.PORT || 8001;

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
