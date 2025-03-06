import express from "express";
import {
  createEvent,
  deleteEvent,
  getChatEvents,
  setEventActive,
  getEvent,
} from "../database/index.js";
import logger from "../utils/logger.js";

export function eventsRouter() {
  const router = express.Router();

  // Get all events for a chat
  router.get("/chat/:chatId", async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const events = await getChatEvents(chatId);
      res.json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      logger.error(`Error getting events for chat ${req.params.chatId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Create a new event
  router.post("/", async (req, res) => {
    try {
      const { chatId, description, prompt, frequency, startDelay, isActive } = req.body;
      
      // Validate required fields
      if (!chatId || typeof chatId !== 'string') {
        res.status(400).json({
          success: false,
          message: "chatId is required and must be a string",
        });
        return;
      }

      // Validate and set defaults for optional fields
      const eventData = {
        chatId,
        description: description || '',
        prompt: prompt || '',
        frequency: typeof frequency === 'number' ? frequency : 0,
        startDelay: typeof startDelay === 'number' ? startDelay : 0,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        createdAt: new Date().toISOString(),
      };

      const event = await createEvent(eventData);
      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      logger.error("Error creating event:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Get a specific event by ID
  router.get("/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        res.status(400).json({
          success: false,
          message: "Invalid event ID format",
        });
        return;
      }
      
      const event = await getEvent(eventId);
      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      logger.error(`Error getting event ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Delete an event
  router.delete("/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        res.status(400).json({
          success: false,
          message: "Invalid event ID format",
        });
        return;
      }
      await deleteEvent(eventId);
      res.json({
        success: true,
      });
    } catch (error: any) {
      logger.error(`Error deleting event ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Activate/deactivate an event
  router.put("/:id/active", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        res.status(400).json({
          success: false,
          message: "Invalid event ID format",
        });
        return;
      }
      const { active } = req.body;
      
      if (typeof active !== "boolean") {
        res.status(400).json({
          success: false,
          message: "active parameter must be a boolean",
        });
        return;
      }

      const event = await setEventActive(eventId, active);
      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      logger.error(`Error updating event ${req.params.id} active status:`, error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}
