import React from "react"
import { Outlet } from "react-router-dom"
import HistorySidebar from "../components/HistorySidebar"
import Header from "../components/Header"
import { useAtom } from "jotai"
import { hasConfigAtom } from "../atoms/configState"
import ConfigSidebar from "../components/ConfigSidebar"
import SchedulerSidebar from "../components/SchedulerSidebar"
import GlobalToast from "../components/GlobalToast"
import { themeAtom } from "../atoms/themeState"

const Layout = () => {
  const [hasConfig] = useAtom(hasConfigAtom)
  const [theme] = useAtom(themeAtom)

  return (
    <div className="app-container" data-theme={theme}>
      <Header />
      {hasConfig &&
        <>
          <HistorySidebar />
          <ConfigSidebar />
          <SchedulerSidebar />
        </>
      }
      <Outlet />
      <GlobalToast />
    </div>
  )
}

export default React.memo(Layout)
