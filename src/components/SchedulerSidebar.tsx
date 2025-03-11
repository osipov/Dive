import React, { useEffect, useState, useCallback } from "react"
import { useAtom, useSetAtom } from "jotai"
import { useTranslation } from "react-i18next"
import { schedulerSidebarVisibleAtom, toggleEventConfigSidebarAtom, toggleSchedulerSidebarAtom, eventConfigSidebarVisibleAtom } from "../atoms/sidebarState"
import { chatIdAtom } from "../atoms/chatState"
import { showToastAtom } from "../atoms/toastState"
import EventConfigSidebar from "./EventConfigSidebar"
import { registerEventTrigger, unregisterTrigger } from "../utils/triggerScheduler"

interface DeleteConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmModal: React.FC<DeleteConfirmProps> = ({ onConfirm, onCancel }) => {
  const { t } = useTranslation()
  
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <h3>{t("scheduler.confirmDelete")}</h3>
        <div className="confirm-actions">
          <button className="cancel-btn" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button className="confirm-btn" onClick={onConfirm}>
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  )
}

interface Event {
  id: number
  chatId: string
  description: string
  prompt: string
  frequency: number
  startDelay: number
  isActive: boolean
  createdAt: string
}

const SchedulerSidebar = () => {
  const [isVisible] = useAtom(schedulerSidebarVisibleAtom)
  const [eventConfigVisible, toggleEventConfig] = useAtom(toggleEventConfigSidebarAtom)
  const [chatId] = useAtom(chatIdAtom)
  const [, showToast] = useAtom(showToastAtom)
  const toggleSchedulerSidebar = useSetAtom(toggleSchedulerSidebarAtom)
  const { t } = useTranslation()
  const [events, setEvents] = useState<Event[]>([])
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!chatId || chatId === "init") return;
    
    try {
      const response = await fetch(`/api/events/chat/${chatId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch events");
      }
      
      setEvents(data.data);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Failed to fetch events",
        type: "error"
      });
    }
  }, [chatId, showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const confirmDelete = (e: React.MouseEvent, eventId: number) => {
    e.stopPropagation();
    setDeletingEventId(eventId);
  };

  const handleDelete = async () => {
    if (!deletingEventId) return;

    try {
      // Find the event to get its details before deleting
      const eventToDelete = events.find(event => event.id === deletingEventId);
      
      const response = await fetch(`/api/events/${deletingEventId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to delete event');
      }

      // If the event was active, unregister its trigger
      if (eventToDelete) {
        const triggerId = `event-${eventToDelete.id}-${eventToDelete.frequency}`;
        console.log(`Unregistering trigger for deleted event: ${eventToDelete.description} (ID: ${eventToDelete.id}, triggerId: ${triggerId})`);
        unregisterTrigger(eventToDelete.chatId, triggerId);
      }

      showToast({
        message: t("scheduler.deleteSuccess"),
        type: "success"
      });

      await fetchEvents(); // Refresh the list
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to delete event',
        type: "error"
      });
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleToggleActive = async (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isActivating = !event.isActive;
    
    try {
      const response = await fetch(`/api/events/${event.id}/active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: isActivating
        })
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || `Failed to ${isActivating ? 'activate' : 'deactivate'} event`);
      }
      
      // If we're activating the event, register the trigger
      if (isActivating) {
        console.log(`Registering trigger for activated event: ${event.description} (ID: ${event.id})`);
        registerEventTrigger(event.chatId, {
          ...event,
          isActive: true // Update the isActive property
        });
      } 
      // If we're deactivating the event, unregister the trigger
      else {
        // The trigger ID format is "event-${event.id}-${event.frequency}" as used in registerEventTrigger
        const triggerId = `event-${event.id}-${event.frequency}`;
        console.log(`Unregistering trigger for deactivated event: ${event.description} (ID: ${event.id}, triggerId: ${triggerId})`);
        unregisterTrigger(event.chatId, triggerId);
      }
      
      await fetchEvents(); // Refresh the events list
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : `Failed to ${isActivating ? 'activate' : 'deactivate'} event`,
        type: "error"
      });
    }
  };

  const handleNewEvent = () => {
    console.log("SchedulerSidebar - handleNewEvent - chatId:", chatId);
    if (!chatId || chatId === "init") {
      showToast({
        message: t("scheduler.selectChatFirst"),
        type: "warning"
      })
      return
    }
    toggleEventConfig()
  }

  // Add debug logging for chatId changes
  useEffect(() => {
    console.log("SchedulerSidebar - chatId changed:", chatId);
  }, [chatId]);

  return (
    <>
      <div className={`scheduler-sidebar ${isVisible ? "visible" : ""}`}>
        <div className="sidebar-content">
          <div className="scheduler-header">
            <button 
              className="calendar-btn"
              onClick={toggleSchedulerSidebar}
              title={t("scheduler.toggleSidebar")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </button>
            <button onClick={handleNewEvent} className="new-chat-btn">
              + {t("scheduler.newEvent")}
            </button>
          </div>
          <div className="scheduler-list">
            {events.map((event: Event) => (
              <div 
                key={event.id} 
                className="event-item"
                onClick={() => {}}  // Placeholder click handler to ensure proper event handling
              >
                <div className="event-header">
                  <h3>{event.description}</h3>
                  <div className="event-actions">
                    <button 
                      className="delete-btn"
                      title={t("scheduler.deleteEvent")}
                      onClick={(e) => confirmDelete(e, event.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                    <button 
                      className={`active-btn ${event.isActive ? 'active' : ''}`}
                      title={event.isActive ? t("scheduler.pause") : t("scheduler.play")}
                      onClick={(e) => handleToggleActive(event, e)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        {event.isActive ? (
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>  // Pause icon
                        ) : (
                          <path d="M8 5v14l11-7z"/>  // Play icon
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="event-details">
                  <p className="prompt">{event.prompt}</p>
                  <div className="event-timing">
                    <span>{t("scheduler.event.frequency")}: {event.frequency}s</span>
                    <span>{t("scheduler.event.startDelay")}: {event.startDelay}s</span>
                  </div>
                  <div className="event-created">
                    {t("scheduler.event.created")}: {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && chatId && chatId !== "init" && (
              <div className="no-events">
                {t("scheduler.noEvents")}
              </div>
            )}
          </div>
          <div className="scheduler-footer">
            <button 
              className="setup-btn"
              onClick={() => {}}  // Will be implemented later
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              {t("scheduler.settings")}
            </button>
          </div>
        </div>
      </div>
      <EventConfigSidebar onEventCreated={fetchEvents} />
      {deletingEventId && (
        <DeleteConfirmModal
          onConfirm={handleDelete}
          onCancel={() => setDeletingEventId(null)}
        />
      )}
    </>
  )
}

export default SchedulerSidebar
