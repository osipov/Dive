import React from "react"
import { useAtom, useSetAtom } from "jotai"
import { schedulerSidebarVisibleAtom, toggleEventConfigSidebarAtom, toggleSchedulerSidebarAtom } from "../atoms/sidebarState"
import { useTranslation } from "react-i18next"
import EventConfigSidebar from "./EventConfigSidebar"

interface Props {
}

const SchedulerSidebar = () => {
  const [isVisible] = useAtom(schedulerSidebarVisibleAtom)
  const [, toggleEventConfig] = useAtom(toggleEventConfigSidebarAtom)
  const toggleSchedulerSidebar = useSetAtom(toggleSchedulerSidebarAtom)
  const { t } = useTranslation()

  const handleNewEvent = () => {
    toggleEventConfig()
  }

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
            {/* Event list will go here */}
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
      <EventConfigSidebar />
    </>
  )
}

export default React.memo(SchedulerSidebar)
