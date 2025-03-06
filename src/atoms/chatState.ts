import { atom } from 'jotai'

export const lastMessageAtom = atom<string>("")
export const isChatStreamingAtom = atom<boolean>(false)

// Use a single source of truth for the chat ID
export const chatIdAtom = atom<string>("init")

// Create a derived atom for backward compatibility
export const currentChatIdAtom = atom(
  (get) => get(chatIdAtom),
  (get, set, newChatId: string) => {
    set(chatIdAtom, newChatId)
  }
)

// Keep setChatIdAtom for backward compatibility
export const setChatIdAtom = atom(null, (get, set, chatId: string) => {
  return set(chatIdAtom, chatId)
})
