import React, { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import HistorySidebar from "../components/HistorySidebar"
import Header from "../components/Header"
import { useAtom } from "jotai"
import { hasConfigAtom } from "../atoms/configState"
import ConfigSidebar from "../components/ConfigSidebar"
import SchedulerSidebar from "../components/SchedulerSidebar"
import GlobalToast from "../components/GlobalToast"
import { chatIdAtom } from "../atoms/chatState"
import { themeAtom, systemThemeAtom } from "../atoms/themeState"
import Overlay from "./Overlay"

const Layout = () => {
  const [hasConfig] = useAtom(hasConfigAtom)
  const [theme] = useAtom(themeAtom)
  const [chatId] = useAtom(chatIdAtom)
  const [systemTheme] = useAtom(systemThemeAtom)

  return (
    <div className="app-container" data-theme={theme === "system" ? systemTheme : theme}>
      <Header />
      {hasConfig &&
        <>
          <HistorySidebar />
          <ConfigSidebar />
          <SchedulerSidebar />
        </>
      }
      <Outlet />
      <Overlay />
      <GlobalToast />
    </div>
  )
}

export default React.memo(Layout)
