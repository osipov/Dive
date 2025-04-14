import React from "react"
import { Outlet } from "react-router-dom"
import HistorySidebar from "../components/HistorySidebar"
import Header from "../components/Header"
import { useAtom, useAtomValue } from "jotai"
import { isConfigNotInitializedAtom } from "../atoms/configState"
import SchedulerSidebar from "../components/SchedulerSidebar"
import GlobalToast from "../components/GlobalToast"
import { chatIdAtom } from "../atoms/chatState"
import { themeAtom, systemThemeAtom } from "../atoms/themeState"
import Overlay from "./Overlay"
import KeymapModal from "../components/Modal/KeymapModal"
import CodeModal from "./Chat/CodeModal"

const Layout = () => {
  const isConfigNotInitialized = useAtomValue(isConfigNotInitializedAtom)
  const [theme] = useAtom(themeAtom)
  const [chatId] = useAtom(chatIdAtom)
  const [systemTheme] = useAtom(systemThemeAtom)

  return (
    <div className="app-container" data-theme={theme === "system" ? systemTheme : theme}>
      <div className="app-content">
        {!isConfigNotInitialized &&
          <>
            <HistorySidebar />
            <SchedulerSidebar />
          </>
        }
        <div className="outlet-container">
          {!isConfigNotInitialized && <Header showHelpButton showModelSelect />}
          <Outlet />
        </div>
        <CodeModal />
      </div>
      <Overlay />
      <GlobalToast />
      <KeymapModal />
    </div>
  )
}

export default React.memo(Layout)
