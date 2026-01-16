import { env } from "./config/env"; // Validates env vars on import
import app from "./app";
import mongoose from "mongoose";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log("✅ Closed out remaining HTTP connections");

    try {
      // Close MongoDB connection
      // false = don't force close (wait for operations to complete)
      await mongoose.connection.close(false);
      console.log("✅ MongoDB connection closed gracefully");

      console.log("👋 Server shutdown complete");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error during graceful shutdown:", err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error("⚠️  Graceful shutdown timeout, forcing shutdown...");
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Docker/Kubernetes
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
