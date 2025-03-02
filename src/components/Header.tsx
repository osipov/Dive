import React from "react"
import { useSetAtom } from "jotai"
import { toggleSidebarAtom, toggleSchedulerSidebarAtom } from "../atoms/sidebarState"
import { useTranslation } from "react-i18next"
import { keymapModalVisibleAtom } from "../atoms/modalState"

type Props = {
  showHelpButton?: boolean
}

const Header = ({ showHelpButton = false }: Props) => {
  const toggleSidebar = useSetAtom(toggleSidebarAtom)
  const toggleSchedulerSidebar = useSetAtom(toggleSchedulerSidebarAtom)
  const { t } = useTranslation()
  const setKeymapModalVisible = useSetAtom(keymapModalVisibleAtom)

  const onClose = () => {
    toggleSidebar()
  }

  return (
    <div className="app-header">
      <div className="header-content">
        <div className="left-side">
          <button 
            className="menu-btn"
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
          <h1>{t("header.title")}</h1>
        </div>
        {showHelpButton && (
          <div className="right-side">
            <button 
            className="menu-btn"
            onClick={toggleSchedulerSidebar}
            style={{ marginLeft: 'auto' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
          </button>
            
            <button 
              className="help-btn"
              onMouseEnter={() => setKeymapModalVisible(true)}
              onMouseLeave={() => setKeymapModalVisible(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(Header)