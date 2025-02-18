import React from "react"
import { useAtom, useSetAtom } from "jotai"
import { toggleSidebarAtom, toggleSchedulerSidebarAtom } from "../atoms/sidebarState"
import { useTranslation } from "react-i18next"
import { chatIdAtom } from "../atoms/chatState"
import { useNavigate } from "react-router-dom"

const Header = () => {
  const toggleSidebar = useSetAtom(toggleSidebarAtom)
  const toggleSchedulerSidebar = useSetAtom(toggleSchedulerSidebarAtom)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [chatId] = useAtom(chatIdAtom)

  const onClose = () => {
    toggleSidebar()
    switch(chatId) {
      case "init": // when chatId is init, it means the chat is not initialized yet
        break
      case null:
        navigate("/")
        break
      default:
        navigate(`/chat/${chatId}`)
        break
    }
  }

  return (
    <div className="app-header">
      <div className="header-content">
        <button 
          className="menu-btn"
          onClick={onClose}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
        <h1>{t("header.title")}</h1>
        <button 
          className="menu-btn"
          onClick={toggleSchedulerSidebar}
          style={{ marginLeft: 'auto' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default React.memo(Header)