import { atom } from 'jotai'

export const lastMessageAtom = atom<string>("")
export const currentChatIdAtom = atom<string>("")
export const isChatStreamingAtom = atom<boolean>(false)
export const chatIdAtom = atom<string | null>(null)

export const setChatIdAtom = atom(null, (get, set, chatId: string | null) => {
  return set(chatIdAtom, chatId)
})
