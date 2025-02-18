/**
 * triggerScheduler.ts
 *
 * This module implements a central trigger scheduler that manages client-side event triggers
 * for a chat session. Triggers are registered per chat id so that different chats can have
 * unique trigger sets. When a chat is loaded (either from history or as a new chat), the scheduler
 * automatically loads two trigger instances based on the numeric hash of the chat id.
 *
 * If the numeric hash is even, two triggers are loaded:
 *   - One that fires 30 seconds after the chat is loaded.
 *   - One that fires 60 seconds after the chat is loaded.
 *
 * If the numeric hash is odd, two triggers are loaded:
 *   - One that fires 15 seconds after the chat is loaded.
 *   - One that fires 45 seconds after the chat is loaded.
 *
 * When a trigger fires, it logs to the console the number of seconds since the chat was loaded.
 * Each trigger is a one-shot timer.
 */

type TriggerCallback = () => void;

interface Trigger {
  id: string;
  chatId: string;
  callback: TriggerCallback;
  fireTime: number; // Absolute time in ms when this trigger should fire
  fired: boolean;
}

// Map of chatId to an array of triggers.
const chatTriggers: Map<string, Trigger[]> = new Map();
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

// Starts the scheduler that checks for triggers to fire.
function startScheduler() {
  if (!schedulerInterval) {
    schedulerInterval = setInterval(() => {
      const now = Date.now();
      chatTriggers.forEach((triggers, chatId) => {
        triggers.forEach(trigger => {
          if (!trigger.fired && now >= trigger.fireTime) {
            try {
              trigger.callback();
            } catch (error) {
              console.error(`Error executing trigger ${trigger.id} for chat ${chatId}:`, error);
            }
            trigger.fired = true;
          }
        });
      });
      // Optionally, clean up fired triggers if all are fired.
      chatTriggers.forEach((triggers, chatId) => {
        const pending = triggers.filter(trigger => !trigger.fired);
        if (pending.length === 0) {
          chatTriggers.delete(chatId);
        } else {
          chatTriggers.set(chatId, pending);
        }
      });
      // Stop scheduler if no triggers remain.
      if (chatTriggers.size === 0) {
        stopScheduler();
      }
    }, 500); // Check every 500ms.
  }
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

/**
 * Registers a new trigger for a given chat.
 * @param chatId - The unique chat identifier.
 * @param triggerId - A unique identifier for the trigger.
 * @param callback - The function to execute when the trigger fires.
 * @param delay - Delay in milliseconds from now when the trigger should fire.
 */
export function registerTrigger(chatId: string, triggerId: string, callback: TriggerCallback, delay: number) {
  const now = Date.now();
  // Get existing triggers for the chat, if any.
  const triggers = chatTriggers.get(chatId) || [];
  
  // Check if a trigger with the same triggerId already exists.
  const existingTrigger = triggers.find(trigger => trigger.id === triggerId);
  if (existingTrigger) {
    // Optionally, update the trigger's parameters. Here we choose to do nothing if already registered.
    console.log(`Trigger with id "${triggerId}" already registered for chat "${chatId}".`);
    return;
  }

  const trigger: Trigger = {
    id: triggerId,
    chatId,
    callback,
    fireTime: now + delay,
    fired: false,
  };

  triggers.push(trigger);
  chatTriggers.set(chatId, triggers);
  startScheduler();
}

/**
 * Unregisters a trigger for a given chat.
 * @param chatId - The unique chat identifier.
 * @param triggerId - The identifier for the trigger to remove.
 */
export function unregisterTrigger(chatId: string, triggerId: string) {
  const triggers = chatTriggers.get(chatId);
  if (triggers) {
    chatTriggers.set(chatId, triggers.filter(trigger => trigger.id !== triggerId));
    if (chatTriggers.get(chatId)?.length === 0) {
      chatTriggers.delete(chatId);
    }
  }
}

/**
 * Clears all triggers for the given chat.
 * @param chatId - The unique chat identifier.
 */
export function clearTriggers(chatId: string) {
  chatTriggers.delete(chatId);
  if (chatTriggers.size === 0) {
    stopScheduler();
  }
}

/**
 * Computes a simple numeric hash for a string.
 * @param s - The input string.
 * @returns A numeric hash.
 */
function computeHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash += s.charCodeAt(i);
  }
  return hash;
}

/**
 * Loads trigger instances for a chat based on its id.
 * This function should be called when a chat is loaded or started.
 * The triggers are determined by the parity of the numeric hash of the chat id:
 * 
 * - If even: load a 30-second trigger and a 60-second trigger.
 * - If odd: load a 15-second trigger and a 45-second trigger.
 * 
 * Each trigger logs the number of seconds since the chat was loaded when fired.
 * @param chatId - The unique chat identifier.
 */
export function loadTriggersForChat(chatId: string) {
  const hash = computeHash(chatId);
  
  if (hash % 2 === 0) {
    // Even hash: triggers at 30 and 60 seconds.
    registerTrigger(chatId, "trigger-30", () => {
      const msg = "30 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, 30000);
    registerTrigger(chatId, "trigger-60", () => {
      const msg = "60 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, 60000);
  } else {
    // Odd hash: triggers at 15 and 45 seconds.
    registerTrigger(chatId, "trigger-15", () => {
      const msg = "15 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, 15000);
    registerTrigger(chatId, "trigger-45", () => {
      const msg = "45 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, 45000);
  }
}
