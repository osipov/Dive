import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  checkChatExists,
  createChat,
  createMessage,
  deleteChat,
  getAllChats,
  getChatWithMessages,
  getAllEvents,
  getChatEvents,
  getActiveChatEvents,
  initDatabase,
  setDatabase,
  createEvent,
  deleteEvent,
  setEventActive,
  getEvent,
} from "../../database";
import * as schema from "../../database/schema";

type MockDB = {
  query: {
    chats: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    messages: {
      findMany: jest.Mock;
    };
    events: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  insert: jest.Mock;
  delete: jest.Mock;
  update: jest.Mock;
  transaction: jest.Mock;
};

type MockTransaction = {
  query: {
    chats: {
      findFirst: jest.Mock;
    };
  };
  insert: jest.Mock;
};

// Mock better-sqlite3
jest.mock("better-sqlite3", () => {
  return jest.fn().mockImplementation(() => ({
    exec: jest.fn(),
  }));
});

// Mock drizzle-orm
jest.mock("drizzle-orm/better-sqlite3", () => ({
  drizzle: jest.fn().mockReturnValue({
    query: {
      chats: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      messages: {
        findMany: jest.fn(),
      },
      events: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  }),
}));

describe("Database Operations", () => {
  let mockDb: MockDB;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize mock database
    mockDb = {
      query: {
        chats: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        messages: {
          findMany: jest.fn(),
        },
        events: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      transaction: jest.fn(),
    };

    setDatabase(mockDb as unknown as BetterSQLite3Database<typeof schema>);
  });

  describe("initDatabase", () => {
    test("should successfully initialize database", () => {
      const result = initDatabase(":memory:");
      expect(result).toBeDefined();
    });

    async function setupMock() {
      const mockError = new Error("Database initialization failed");
      jest.unstable_mockModule("better-sqlite3", () => ({
        default: jest.fn(() => {
          throw mockError;
        }),
      }));
      const { default: betterSqlite3 } = await import("better-sqlite3");
      // ... continue using betterSqlite3 here
    }

    test("should throw error when initialization fails", async () => {
      const mockError = new Error("Database initialization failed");
      jest.spyOn(console, "error").mockImplementation(() => {});
      setupMock().catch((error) => {
        console.error("Error setting up mock:", error);
      });
      // (require("better-sqlite3") as jest.Mock).mockImplementation(() => {
      //   throw mockError;
      // });
      const mockedSqlite = jest.mocked(jest.requireActual("better-sqlite3") as jest.Mock);
      mockedSqlite.mockImplementation(() => {
        throw mockError;
      });
      // jest.unstable_mockModule("better-sqlite3", () => ({
      //   default: jest.fn(() => {
      //     throw mockError;
      //   }),
      // }));      
      // Import the module dynamically after mocking it
      // const { default: betterSqlite3 } = await import("better-sqlite3");
      expect(() => initDatabase(":memory:")).toThrow(mockError);
    });
  });

  describe("getAllChats", () => {
    test("should return chats in reverse order", async () => {
      const mockChats = [
        { id: "1", title: "Chat 1", createdAt: "2024-01-01T00:00:00.000Z" },
        { id: "2", title: "Chat 2", createdAt: "2024-01-02T00:00:00.000Z" },
      ];

      const mockChatsReverse = [...mockChats].reverse();

      mockDb.query.chats.findMany.mockResolvedValue(mockChats as never);

      const result = await getAllChats();
      expect(result).toEqual(mockChatsReverse);
      expect(mockDb.query.chats.findMany).toHaveBeenCalled();
    });
  });

  describe("getChatWithMessages", () => {
    test("should return chat and its messages", async () => {
      const mockChat = {
        id: "1",
        title: "Test Chat",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const mockMessages = [
        {
          id: 1,
          content: "Message 1",
          chatId: "1",
          createdAt: "2024-01-01T00:00:00.000Z",
          role: "user",
          messageId: "msg1",
          files: null,
        },
        {
          id: 2,
          content: "Message 2",
          chatId: "1",
          createdAt: "2024-01-01T00:00:00.000Z",
          role: "assistant",
          messageId: "msg2",
          files: null,
        },
      ];

      mockDb.query.chats.findFirst.mockResolvedValue(mockChat as never);
      mockDb.query.messages.findMany.mockResolvedValue(mockMessages as never);

      const result = await getChatWithMessages("1");
      expect(result).toEqual({ chat: mockChat, messages: mockMessages });
    });

    test("should return null when chat does not exist", async () => {
      mockDb.query.chats.findFirst.mockResolvedValue(undefined as never);

      const result = await getChatWithMessages("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("createChat", () => {
    test("should successfully create new chat", async () => {
      const mockChat = {
        id: "1",
        title: "New Chat",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockChat] as never),
        }),
      });

      const result = await createChat("1", "New Chat");
      expect(result).toEqual({
        ...mockChat,
        createdAt: expect.any(String),
      });
    });
  });

  describe("createMessage", () => {
    test("should successfully create new message", async () => {
      const mockMessage = {
        id: 1,
        chatId: "1",
        content: "Test message",
        role: "user",
        createdAt: "2024-01-01T00:00:00.000Z",
        messageId: "msg1",
        files: null,
      };

      const mockTx: MockTransaction = {
        query: {
          chats: {
            findFirst: jest.fn().mockResolvedValue({
              id: "1",
              title: "Test Chat",
              createdAt: "2024-01-01T00:00:00.000Z",
            } as never),
          },
        },
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockMessage] as never),
          }),
        }),
      };

      // @ts-ignore
      mockDb.transaction.mockImplementation((fn: (tx: MockTransaction) => any) => fn(mockTx));

      const result = await createMessage({
        chatId: "1",
        content: "Test message",
        role: "user",
        createdAt: "2024-01-01T00:00:00.000Z",
        messageId: "msg1",
        files: null,
      });
      expect(result).toEqual(mockMessage);
    });

    test("should throw error when chat does not exist", async () => {
      const mockTx: MockTransaction = {
        query: {
          chats: {
            findFirst: jest.fn().mockResolvedValue(undefined as never),
          },
        },
        insert: jest.fn(),
      };

      // @ts-ignore
      mockDb.transaction.mockImplementation((fn: (tx: MockTransaction) => any) => fn(mockTx));

      await expect(
        createMessage({
          chatId: "nonexistent",
          content: "Test",
          role: "user",
          createdAt: "2024-01-01T00:00:00.000Z",
          messageId: "msg1",
          files: null,
        })
      ).rejects.toThrow("Chat nonexistent does not exist");
    });
  });

  describe("checkChatExists", () => {
    test("should return true when chat exists", async () => {
      const mockChat = {
        id: "1",
        title: "Test Chat",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      mockDb.query.chats.findFirst.mockResolvedValue(mockChat as never);

      const result = await checkChatExists("1");
      expect(result).toBe(true);
    });

    test("should return false when chat does not exist", async () => {
      mockDb.query.chats.findFirst.mockResolvedValue(undefined as never);

      const result = await checkChatExists("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("deleteChat", () => {
    test("should successfully delete chat and its messages", async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue(Promise.resolve()),
      });

      await deleteChat("1");
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe("Events Operations", () => {
    const mockEvents = [
      {
        id: 1,
        chatId: "chat1",
        createdAt: "2025-02-19T14:57:07-05:00",
        description: "Test event 1",
        prompt: "Test prompt 1",
        frequency: 60,
        startDelay: 0,
        isActive: true,
        lastRunTime: null,
        nextRunTime: null,
      },
      {
        id: 2,
        chatId: "chat1",
        createdAt: "2025-02-19T14:57:07-05:00",
        description: "Test event 2",
        prompt: "Test prompt 2",
        frequency: 120,
        startDelay: 0,
        isActive: false,
        lastRunTime: null,
        nextRunTime: null,
      },
    ];

    test("should get all events", async () => {
      mockDb.query.events.findMany.mockResolvedValue(mockEvents as never);

      const events = await getAllEvents();
      expect(events).toEqual(mockEvents);
      expect(mockDb.query.events.findMany).toHaveBeenCalled();
    });

    test("should return events in descending order of created_at", async () => {
      const eventsInDescendingOrder = [
        {
          id: 2,
          chatId: "chat1",
          createdAt: "2025-02-20T14:57:07-05:00",
          description: "Newer event",
          prompt: "Test prompt 2",
          frequency: 120,
          startDelay: 0,
          isActive: true,
          lastRunTime: null,
          nextRunTime: null,
        },
        {
          id: 1,
          chatId: "chat1",
          createdAt: "2025-02-19T14:57:07-05:00",
          description: "Older event",
          prompt: "Test prompt 1",
          frequency: 60,
          startDelay: 0,
          isActive: true,
          lastRunTime: null,
          nextRunTime: null,
        },
      ];

      mockDb.query.events.findMany.mockResolvedValue(eventsInDescendingOrder as never);

      const events = await getAllEvents();
      expect(events).toEqual(eventsInDescendingOrder);
      expect(events[0].description).toBe("Newer event");
      expect(events[1].description).toBe("Older event");
    });

    test("should get all events for a chatId in descending order of created_at", async () => {
      const chatId = "chat1";
      const eventsInDescendingOrder = [
        {
          id: 2,
          chatId: "chat1",
          createdAt: "2025-02-20T14:57:07-05:00",
          description: "Newer event",
          prompt: "Test prompt 2",
          frequency: 120,
          startDelay: 0,
          isActive: true,
          lastRunTime: null,
          nextRunTime: null,
        },
        {
          id: 1,
          chatId: "chat1",
          createdAt: "2025-02-19T14:57:07-05:00",
          description: "Older event",
          prompt: "Test prompt 1",
          frequency: 60,
          startDelay: 0,
          isActive: true,
          lastRunTime: null,
          nextRunTime: null,
        },
      ];

      mockDb.query.events.findMany.mockResolvedValue(eventsInDescendingOrder as never);

      const events = await getChatEvents(chatId);
      expect(events).toEqual(eventsInDescendingOrder);
      expect(events[0].description).toBe("Newer event");
      expect(events[1].description).toBe("Older event");
    });

    test("should get all active events for a chatId in descending order of created_at", async () => {
      const chatId = "chat1";
      const eventsInDescendingOrder = [
        {
          id: 2,
          chatId: "chat1",
          createdAt: "2025-02-20T14:57:07-05:00",
          description: "Newer event",
          prompt: "Test prompt 2",
          frequency: 120,
          startDelay: 0,
          isActive: true,
          lastRunTime: null,
          nextRunTime: null,
        },
        {
          id: 1,
          chatId: "chat1",
          createdAt: "2025-02-19T14:57:07-05:00",
          description: "Older event",
          prompt: "Test prompt 1",
          frequency: 60,
          startDelay: 0,
          isActive: true,
          lastRunTime: null,
          nextRunTime: null,
        },
      ];

      mockDb.query.events.findMany.mockResolvedValue(eventsInDescendingOrder as never);

      const events = await getActiveChatEvents(chatId);
      expect(events).toEqual(eventsInDescendingOrder);
      expect(events[0].description).toBe("Newer event");
      expect(events[1].description).toBe("Older event");
    });

    test("should create a new event", async () => {
      const mockEvent = {
        id: 1,
        chatId: "chat1",
        createdAt: "2025-02-19T14:57:07-05:00",
        description: "Test event",
        prompt: "Test prompt",
        frequency: 60,
        startDelay: 0,
        isActive: true,
        lastRunTime: null,
        nextRunTime: null,
      };

      mockDb.query.chats.findFirst.mockResolvedValue({ id: "chat1" } as never);
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEvent] as never),
        }),
      });

      const result = await createEvent({
        chatId: "chat1",
        description: "Test event",
        prompt: "Test prompt",
        frequency: 60,
        startDelay: 0,
        isActive: true,
        createdAt: "2025-02-19T14:57:07-05:00",
      });

      expect(result).toEqual(mockEvent);
    });

    test("should throw error when creating event for non-existent chat", async () => {
      mockDb.query.chats.findFirst.mockResolvedValue(undefined as never);

      await expect(createEvent({
        chatId: "nonexistent",
        description: "Test event",
        prompt: "Test prompt",
        frequency: 60,
        startDelay: 0,
        isActive: true,
        createdAt: "2025-02-19T14:57:07-05:00",
      })).rejects.toThrow("Chat nonexistent does not exist");
    });

    test("should delete an event", async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue(Promise.resolve()),
      });

      await deleteEvent(1);
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    test("should activate/deactivate an event", async () => {
      const mockEvent = {
        id: 1,
        chatId: "chat1",
        isActive: true,
      };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockEvent] as never),
          }),
        }),
      });

      const result = await setEventActive(1, true);
      expect(result.isActive).toBe(true);
    });

    test("should throw error when activating non-existent event", async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([] as never),
          }),
        }),
      });

      await expect(setEventActive(999, true)).rejects.toThrow("Event 999 does not exist");
    });

    test("should get a specific event by ID", async () => {
      const mockEvent = {
        id: 1,
        chatId: "chat1",
        createdAt: "2025-02-19T14:57:07-05:00",
        description: "Test event",
        prompt: "Test prompt",
        frequency: 60,
        startDelay: 0,
        isActive: true,
        lastRunTime: null,
        nextRunTime: null,
      };

      mockDb.query.events.findFirst.mockResolvedValue(mockEvent as never);

      const result = await getEvent(1);
      expect(result).toEqual(mockEvent);
      expect(mockDb.query.events.findFirst).toHaveBeenCalled();
    });

    test("should throw error when getting non-existent event", async () => {
      mockDb.query.events.findFirst.mockResolvedValue(undefined as never);

      await expect(getEvent(999)).rejects.toThrow("Event 999 does not exist");
    });
  });
});
