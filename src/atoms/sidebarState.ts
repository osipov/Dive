import { atom } from "jotai"

export const sidebarVisibleAtom = atom(false)

export const configSidebarVisibleAtom = atom(false)
export const toolsVisibleAtom = atom(false)
export const schedulerSidebarVisibleAtom = atom(false)
export const eventConfigSidebarVisibleAtom = atom(false)

export const getPopupVisibleAtom = atom((get) => {  // is there any sidebar popup visible
  return get(configSidebarVisibleAtom) || get(toolsVisibleAtom)
})

export const toggleSidebarAtom = atom(
  null,
  (get, set) => {
    set(sidebarVisibleAtom, !get(sidebarVisibleAtom))
  }
)

export const toggleConfigSidebarAtom = atom(
  null,
  (get, set) => {
    set(configSidebarVisibleAtom, !get(configSidebarVisibleAtom))
  }
)

export const toggleSchedulerSidebarAtom = atom(
  null,
  (get, set) => {
    set(schedulerSidebarVisibleAtom, !get(schedulerSidebarVisibleAtom))
  }
)

export const toggleEventConfigSidebarAtom = atom(
  null,
  (get, set) => {
    set(eventConfigSidebarVisibleAtom, !get(eventConfigSidebarVisibleAtom))
  }
)
export const closeAllSidebarsAtom = atom(
  null,
  (get, set) => {
    set(sidebarVisibleAtom, false)
    set(configSidebarVisibleAtom, false)
  }
)
