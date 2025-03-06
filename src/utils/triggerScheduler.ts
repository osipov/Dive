/**
 * triggerScheduler.ts
 *
 * This module implements a central trigger scheduler that manages client-side event triggers
 * for a chat session. Triggers are registered per chat id so that different chats can have
 * unique trigger sets. When a chat is loaded (either from history or as a new chat), the scheduler
 * automatically loads trigger instances .
 *
 * When a trigger fires, it logs to the console the number of seconds since the chat was loaded.
 * Each trigger is a one-shot timer.
 */

// Using REST APIs instead of direct database access
/**
 * Fetches all events for a specific chat from the REST API.
 * @param chatId - The unique chat identifier.
 * @returns A promise that resolves to an array of events.
 */
async function getChatEvents(chatId: string): Promise<Event[]> {
  try {
    const response = await fetch(`/api/events/chat/${chatId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || "Failed to fetch events");
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching events for chat ${chatId}:`, error);
    return [];
  }
}

/**
 * Fetches a specific event by its ID from the REST API.
 * @param eventId - The unique event identifier.
 * @returns A promise that resolves to the event data.
 */
async function getEvent(eventId: number): Promise<Event> {
  try {
    const response = await fetch(`/api/events/${eventId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || "Failed to fetch event");
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Interface representing an event from the API
 */
interface Event {
  id: number;
  chatId: string;
  description: string;
  prompt: string;
  frequency: number;  // in seconds
  startDelay: number; // in seconds
  isActive: boolean;
  createdAt: string;
  lastRunTime?: string;
  nextRunTime?: string;
}

type TriggerCallback = () => void;

interface Trigger {
  id: string;
  chatId: string;
  callback: TriggerCallback;
  fireTime: number; // Absolute time in ms when this trigger should fire
  fired: boolean;
}

/**
 * Loads trigger instances for a chat based on events retrieved from the REST API.
 * This function retrieves all events for the given chat ID and registers
 * active events as triggers with the scheduler.
 * 
 * Each event is registered with a name based on its description and frequency.
 * The trigger takes into account:
 * - The event's active status (only active events are triggered)
 * - The event's creation time and start delay
 * - The event's frequency for scheduling
 * 
 * @param chatId - The unique chat identifier.
 */
export async function loadTriggersForChat(chatId: string) {
  try {
    // Get all events for this chat from the REST API
    const events = await getChatEvents(chatId);
    
    if (!events || events.length === 0) {
      console.log(`No events found for chat ${chatId}`);
      return;
    }
    
    console.log(`Loading ${events.length} events for chat ${chatId}`);
    
    // Register each active event as a trigger
    events.forEach(event => {
      if (!event.isActive) {
        console.log(`Skipping inactive event: ${event.description} (ID: ${event.id})`);
        return;
      }
      
      registerEventTrigger(chatId, event);
    });
  } catch (error) {
    console.error(`Error loading triggers for chat ${chatId}:`, error);
  }
}

// Map of chatId to an array of triggers.
const chatTriggers: Map<string, Trigger[]> = new Map();
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Registers a trigger for a specific event.
 * This is separated into its own function to avoid recursive closures.
 * 
 * @param chatId - The unique chat identifier.
 * @param event - The event to register a trigger for.
 */
export function registerEventTrigger(chatId: string, event: Event) {
  // Create a unique trigger ID based on event ID
  const triggerId = `event-${event.id}-${event.frequency}`;
  
  // Calculate the initial delay based on creation time and start delay
  const creationTime = new Date(event.createdAt).getTime();
  const now = Date.now();
  const elapsedSinceCreation = now - creationTime;
  
  // If the elapsed time is less than the start delay, we need to wait
  // Otherwise, we can schedule based on frequency
  // Convert from seconds to milliseconds
  let delay = (event.startDelay * 1000) - elapsedSinceCreation;
  if (delay < 0) {
    // Start delay has passed, use frequency for next trigger
    // If frequency is 0, this is a one-time event that should fire immediately
    delay = event.frequency > 0 ? (event.frequency * 1000) : 0;
  }
  
  // Register the trigger with the calculated delay
  registerTrigger(chatId, triggerId, () => {
    // When the trigger fires, get the latest state of the event
    getEvent(event.id).then((latestEvent: Event) => {
      // Only proceed if the event is active
      if (latestEvent.isActive) {
        const msg = `Event triggered: ${latestEvent.description} (ID: ${latestEvent.id})`;
        console.log(msg);
        
        // Dispatch event message similar to the test implementation
        window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { 
          detail: { chatId, message: latestEvent.prompt } 
        }));
        
        // If this is a recurring event (frequency > 0), register it again
        // We create a fresh registration rather than a recursive callback
        if (latestEvent.frequency > 0) {
          // Use setTimeout to avoid stack buildup
          setTimeout(() => {
            registerEventTrigger(chatId, latestEvent);
          }, 0);
        }
      } else {
        console.log(`Event ${event.id} is no longer active`);
      }
    }).catch((error: Error) => {
      console.error(`Error retrieving latest event state for ${event.id}:`, error);
    });
  }, delay);
  
  console.log(`Registered trigger for event: ${event.description} (ID: ${event.id}) with delay: ${delay}ms (${delay/1000}s)`);
}

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
 *                Note: While the Event interface uses seconds, this function expects milliseconds.
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
 * Loads test trigger instances for a chat based on its id.
 * This function should be called when a chat is loaded or started.
 * The triggers are determined by the parity of the numeric hash of the chat id:
 * 
 * - If even: load a 30-second trigger and a 60-second trigger.
 * - If odd: load a 15-second trigger and a 45-second trigger.
 * 
 * Each trigger logs the number of seconds since the chat was loaded when fired.
 * @param chatId - The unique chat identifier.
 */
export function testLoadTriggersForChat(chatId: string) {
  const hash = computeHash(chatId);
  
  if (hash % 2 === 0) {
    // Even hash: triggers at 30 and 60 seconds.
    const seconds30 = 30;
    registerTrigger(chatId, "trigger-30", () => {
      const msg = "30 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, seconds30 * 1000);
    
    const seconds60 = 60;
    registerTrigger(chatId, "trigger-60", () => {
      const msg = "60 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, seconds60 * 1000);
  } else {
    // Odd hash: triggers at 15 and 45 seconds.
    const seconds15 = 15;
    registerTrigger(chatId, "trigger-15", () => {
      const msg = "15 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, seconds15 * 1000);
    
    const seconds45 = 45;
    registerTrigger(chatId, "trigger-45", () => {
      const msg = "45 seconds since chat loaded (chat id: " + chatId + ")";
      console.log(msg);
      window.dispatchEvent(new CustomEvent(`triggerMessage(${chatId})`, { detail: { chatId, message: msg } }));
    }, seconds45 * 1000);
  }
}
