import React, { useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import Tooltip from "./Tooltip"
import useHotkeyEvent from "../hooks/useHotkeyEvent"
import Textarea from "./WrappedTextarea"
import { lastMessageAtom } from "../atoms/chatState"
import { useAtomValue, useSetAtom } from "jotai"
import { activeConfigAtom, activeProviderAtom, configAtom, configDictAtom, currentModelSupportToolsAtom, InterfaceModelConfigMap, isConfigActiveAtom, writeRawConfigAtom } from "../atoms/configState"
import { openOverlayAtom } from "../atoms/layerState"
import { enabledToolsAtom, loadToolsAtom } from "../atoms/toolState"
import { useNavigate } from "react-router-dom"
import "../styles/components/_ChatInput.scss"
import { InterfaceProvider } from "../atoms/interfaceState"
import { showToastAtom } from "../atoms/toastState"

interface Props {
  page: "welcome" | "chat"
  onSendMessage?: (message: string, files?: FileList) => void
  disabled?: boolean
  onAbort: () => void
}

interface FilePreview {
  type: "image" | "file"
  url?: string
  name: string
  size: string
}

const ACCEPTED_FILE_TYPES = [
  "*/*"
].join(",")

const ChatInput: React.FC<Props> = ({ page, onSendMessage, disabled, onAbort }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [previews, setPreviews] = useState<FilePreview[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevDisabled = useRef(disabled)
  const uploadedFiles = useRef<File[]>([])
  const isComposing = useRef(false)
  const [isAborting, setIsAborting] = useState(false)
  const lastMessage = useAtomValue(lastMessageAtom)
  const hasActiveConfig = useAtomValue(isConfigActiveAtom)
  const supportTools = useAtomValue(currentModelSupportToolsAtom)
  const activeConfig = useAtomValue(activeConfigAtom)
  const openOverlay = useSetAtom(openOverlayAtom)
  const tools = useAtomValue(enabledToolsAtom)
  const [isDragging, setIsDragging] = useState(false)
  const loadTools = useSetAtom(loadToolsAtom)
  const config = useAtomValue(configAtom)
  const activeProvider = useAtomValue(activeProviderAtom)
  const configList = useAtomValue(configDictAtom)
  const saveAllConfig = useSetAtom(writeRawConfigAtom)
  const showToast = useSetAtom(showToastAtom)

  useEffect(() => {
    loadTools()
  }, [])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) {
      return bytes + " B"
    }
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB"
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }, [])

  const handleFiles = (files: File[]) => {
    const existingFiles = uploadedFiles.current

    const newFiles = files.filter(newFile => {
      const isDuplicate = existingFiles.some(existingFile => {
        if (existingFile.name !== newFile.name)
          return false

        if (existingFile.size !== newFile.size)
          return false

        if (existingFile.lastModified !== newFile.lastModified)
          return false

        return true
      })

      return !isDuplicate
    })

    if (newFiles.length === 0)
      return

    const newPreviews = newFiles.map(file => {
      const preview: FilePreview = {
        type: file.type.startsWith("image/") ? "image" : "file",
        name: file.name,
        size: formatFileSize(file.size)
      }

      if (preview.type === "image") {
        preview.url = URL.createObjectURL(file)
      }

      return preview
    })

    setPreviews(prev => [...prev, ...newPreviews])
    uploadedFiles.current = [...existingFiles, ...newFiles]

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      uploadedFiles.current.forEach(file => {
        dataTransfer.items.add(file)
      })
      fileInputRef.current.files = dataTransfer.files
    }
  }

  const removeFile = (index: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    uploadedFiles.current = uploadedFiles.current.filter((_, i) => i !== index)

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      uploadedFiles.current.forEach(file => {
        dataTransfer.items.add(file)
      })

      if (uploadedFiles.current.length === 0) {
        fileInputRef.current.value = ""
      } else {
        fileInputRef.current.files = dataTransfer.files
      }
    }

    setPreviews(prev => {
      const newPreviews = [...prev]
      if (newPreviews[index].type === "image" && newPreviews[index].url) {
        URL.revokeObjectURL(newPreviews[index].url)
      }
      newPreviews.splice(index, 1)
      return newPreviews
    })
  }

  const handlePaste = (e: ClipboardEvent) => {
    if (document.activeElement !== textareaRef.current)
      return

    const items = e.clipboardData?.items
    if (!items)
      return

    const imageItems = Array.from(items).filter(item => item.type.startsWith("image/"))
    if (imageItems.length === 0)
      return

    if (imageItems.length > 0) {
      e.preventDefault()
      const files = imageItems.map(item => item.getAsFile()).filter((file): file is File => file !== null)
      handleFiles(files)
    }
  }

  useHotkeyEvent("chat-input:upload-file", () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  })

  useHotkeyEvent("chat-input:focus", () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  })

  useHotkeyEvent("chat-input:paste-last-message", () => {
    if (lastMessage) {
      setMessage(m => m + lastMessage)
    }
  })

  useEffect(() => {
    document.addEventListener("paste", handlePaste)
    return () => {
      document.removeEventListener("paste", handlePaste)
      previews.forEach(preview => {
        if (preview.type === "image" && preview.url) {
          URL.revokeObjectURL(preview.url)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (prevDisabled.current && !disabled) {
      textareaRef.current?.focus()
    }
    prevDisabled.current = disabled
    setIsAborting(false)
  }, [disabled])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && disabled) {
        e.stopPropagation()
        e.preventDefault()
        setIsAborting(true)
        onAbort()
      }
    }

    window.addEventListener("keydown", handleKeydown)
    return () => {
      window.removeEventListener("keydown", handleKeydown)
    }
  }, [disabled])

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      window.ipcRenderer.showInputContextMenu()
    }

    if (textareaRef.current) {
      textareaRef.current.addEventListener("contextmenu", handleContextMenu)
    }

    return () => {
      if (textareaRef.current) {
        textareaRef.current.removeEventListener("contextmenu", handleContextMenu)
      }
    }
  }, [])

  const ifEnableTools = () => {
    const configs = config?.configs
    return !hasActiveConfig || !configs[activeProvider] || !("enableTools" in configs[activeProvider]) || configs[activeProvider]?.enableTools
  }

  const toggleEnableTools = () => {
    if(!hasActiveConfig){
      return
    }
    const enableTools = "enableTools" in configList[config.activeProvider] ? configList[config.activeProvider]?.enableTools : true
    const newConfigList = { ...configList, [config.activeProvider]: { ...configList[config.activeProvider], enableTools: !enableTools } }
    saveAllConfig({ providerConfigs: newConfigList as InterfaceModelConfigMap, activeProvider: config.activeProvider as InterfaceProvider })
    if(enableTools){
      showToast({
        message: t("chat.tools-btn.disable.toast"),
        type: "success"
      })
    } else {
      showToast({
        message: t("chat.tools-btn.enable.toast"),
        type: "success"
      })
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    if (page === "chat") {
      e.preventDefault()
      if ((!message.trim() && !uploadedFiles.current.length) || !onSendMessage || disabled || !hasActiveConfig)
        return

      onSendMessage(message, fileInputRef.current?.files || undefined)
      setMessage("")

      uploadedFiles.current = []
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      setPreviews(prev => {
        prev.forEach(preview => {
          if (preview.type === "image" && preview.url) {
            URL.revokeObjectURL(preview.url)
          }
        })
        return []
      })
    } else {
      e.preventDefault()
      if (!hasActiveConfig)
        return

      if (message.trim() || uploadedFiles.current.length > 0) {
        navigate("/chat", {
          state: {
            initialMessage: message,
            files: uploadedFiles.current
          }
        })
      }
    }
  }

  const onKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || isComposing.current) {
      return
    }

    if (e.key === "Enter" && disabled) {
      return
    }

    e.preventDefault()
    handleSubmit(e)
  }

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false
  }, [])

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  return (
    <div className="chat-input-wrapper">
      {activeConfig?.model && activeConfig?.model !== "none" && !supportTools && (
        <div className="chat-input-banner">
          <div>
            {t("chat.unsupportTools", { model: activeConfig?.model })}
          </div>
          <button
            className="enable-tools-btn"
            onClick={toggleEnableTools}
          >
            {ifEnableTools() ?
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M3 9L3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 9L8 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {t("chat.tools-btn.disable")}
              </> : <>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="11" viewBox="0 0 10 11" fill="none">
                  <path d="M2.40367 1.92843C2.58324 1.92843 2.73887 1.98399 2.94238 2.10304L7.69497 4.84113C8.05012 5.04748 8.21373 5.22208 8.21373 5.49986C8.21373 5.77764 8.05012 5.95224 7.69497 6.15859L2.94238 8.89669C2.73887 9.01177 2.58324 9.07129 2.40367 9.07129C2.05251 9.07129 1.78516 8.80542 1.78516 8.36891V2.62685C1.78516 2.19431 2.05251 1.92843 2.40367 1.92843Z" fill="currentColor"/>
                </svg>
                {t("chat.tools-btn.enable")}
              </>}
          </button>
        </div>
      )}
      {(!activeConfig?.model || activeConfig?.model == "none") && (
        <div className="chat-input-banner">
          {t("chat.noModelBanner")}
        </div>
      )}
      <footer
        className="chat-input"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={`drag-overlay ${isDragging ? "show" : ""}`}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drag-overlay-bg"
          onDrop={handleDrop}></div>
          <div className="drag-overlay-text">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" width="22" height="22">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path>
              <path fill="currentColor" d="M6.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3 16l4-4 2 2 6-4.5 4 4.5v1.999L3 16Z"></path>
            </svg>
            {t("chat.dragFiles")}
          </div>
        </div>
        <div className="input-wrapper">
          <Textarea
            autoheight={true}
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={onKeydown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={t("chat.placeholder")}
            rows={1}
          />
        </div>
        {previews.length > 0 && (
          <div className="file-previews">
            {previews.map((preview, index) => (
              <div key={index} className={`preview-item ${preview.type}`}>
                {preview.type === "image" ? (
                  <img src={preview.url} alt={preview.name} />
                ) : (
                  <div className="file-info">
                    <div className="file-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    </div>
                    <div className="file-details">
                      <div className="file-name">{preview.name}</div>
                      <div className="file-size">{preview.size}</div>
                    </div>
                  </div>
                )}
                <button
                  className="remove-preview"
                  onClick={(e) => removeFile(index, e)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="input-actions">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept={ACCEPTED_FILE_TYPES}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="upload-btn"
            onClick={handleFileClick}
            disabled={disabled}
            title={t("chat.uploadFile")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>
          <div className="tools-container">
            <button
              className="tools-btn"
              onClick={(e) => {
                e.preventDefault()
                openOverlay("Tools")
              }}
            >
              {ifEnableTools() ?
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                </svg>
              </> : <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                  <line x1="22" y1="4" x2="2" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </>}
              {`${tools.length} ${t("chat.tools")}`}
            </button>
            {(disabled && !isAborting) ? (
              <Tooltip type="controls" content={<>{t("chat.abort")}<span className="key">Esc</span></>}>
                <button
                  className="abort-btn"
                  onClick={() => {
                    setIsAborting(true)
                    onAbort()
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none">
                    <path fill="currentColor" d="M7 8.89A1.89 1.89 0 0 1 8.89 7h4.22A1.89 1.89 0 0 1 15 8.89v4.22A1.89 1.89 0 0 1 13.11 15H8.89A1.89 1.89 0 0 1 7 13.11V8.89Z"></path>
                    <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="2"></circle>
                  </svg>
                </button>
              </Tooltip>
            ) : (
              <Tooltip type="controls" content={!hasActiveConfig ? t("chat.noModelAlert") : t("chat.send")}>
                <button
                  className="send-btn"
                  onClick={handleSubmit}
                  disabled={disabled || !hasActiveConfig}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default React.memo(ChatInput)
