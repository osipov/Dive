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

const Layout = () => {
  const isConfigNotInitialized = useAtomValue(isConfigNotInitializedAtom)
  const [theme] = useAtom(themeAtom)
  const [chatId] = useAtom(chatIdAtom)
  const [systemTheme] = useAtom(systemThemeAtom)

  return (
    <div className="app-container" data-theme={theme === "system" ? systemTheme : theme}>
      <Header showHelpButton showModelSelect />
      {!isConfigNotInitialized &&
        <>
          <HistorySidebar />
          <SchedulerSidebar />
        </>
      }
      <Outlet />
      <Overlay />
      <GlobalToast />
      <KeymapModal />
    </div>
  )
}

export default React.memo(Layout)
