import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAtom } from "jotai"
import { eventConfigSidebarVisibleAtom } from "../atoms/sidebarState"
import { showToastAtom } from "../atoms/toastState"
import { chatIdAtom } from "../atoms/chatState"

interface Props {
  onEventCreated?: () => void;
}

interface EventConfig {
  chatId: string
  createTime: string
  description: string
  prompt: string
  frequency: number
  startDelay: number
}

const MIN_START_DELAY = 10 // 10 seconds minimum
const MIN_FREQUENCY = 1 // 1 second minimum
const MAX_FREQUENCY = 86400 // 24 hours maximum
const MAX_START_DELAY = 3600 // 1 hour maximum

const EventConfigSidebar = ({ onEventCreated }: Props) => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useAtom(eventConfigSidebarVisibleAtom)
  const [, showToast] = useAtom(showToastAtom)
  const [chatId] = useAtom(chatIdAtom)
  const [config, setConfig] = useState<EventConfig>({
    chatId: "",
    createTime: new Date().toISOString(),
    description: "",
    prompt: "",
    frequency: 60, // Default 1 minute
    startDelay: MIN_START_DELAY
  })

  useEffect(() => {
    return () => {
      setIsVisible(false)
    }
  }, [])

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape" && isVisible) {
        setIsVisible(false)
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => {
      window.removeEventListener("keydown", handleKeydown)
    }
  }, [isVisible])

  useEffect(() => {
    if (chatId && chatId !== "init") {
      setConfig(prev => ({
        ...prev,
        chatId
      }))
    }
  }, [chatId])

  if (!chatId || chatId === "init") {
    return null
  }

  const handleSubmit = async () => {
    try {
      // Validate inputs
      if (config.startDelay < MIN_START_DELAY) {
        throw new Error(`Start delay must be at least ${MIN_START_DELAY} seconds`)
      }
      if (config.startDelay > MAX_START_DELAY) {
        throw new Error(`Start delay cannot exceed ${MAX_START_DELAY} seconds`)
      }
      if (config.frequency < MIN_FREQUENCY) {
        throw new Error(`Frequency must be at least ${MIN_FREQUENCY} second`)
      }
      if (config.frequency > MAX_FREQUENCY) {
        throw new Error(`Frequency cannot exceed ${MAX_FREQUENCY} seconds`)
      }
      if (!config.description.trim()) {
        throw new Error("Description is required")
      }
      if (!config.prompt.trim()) {
        throw new Error("Prompt is required")
      }

      // Make API call to create event
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: config.chatId,
          description: config.description.trim(),
          prompt: config.prompt.trim(),
          frequency: config.frequency,
          startDelay: config.startDelay,
          isActive: true
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || t("scheduler.event.createFailed"));
      }

      showToast({
        message: t("scheduler.event.createSuccess"),
        type: "success"
      });
      setIsVisible(false);
      onEventCreated?.();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : t("scheduler.event.createFailed"),
        type: "error"
      })
    }
  }

  const handleInputChange = (field: keyof EventConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  return (
    <>
      {isVisible && (
        <div className="modal-overlay" onClick={() => setIsVisible(false)} />
      )}
      <div className={`config-sidebar ${isVisible ? "visible" : ""}`}>
        <div className="config-header">
          <h2>{t("scheduler.event.configTitle")}</h2>
          <button 
            className="close-btn"
            onClick={() => setIsVisible(false)}
            title={t("common.close")}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>
        {isVisible && (
          <div className="config-content">
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
              <div className="form-group">
                <label>{t("scheduler.event.chatId")}</label>
                <input
                  type="text"
                  value={config.chatId}
                  disabled
                  className="disabled"
                />
              </div>

              <div className="form-group">
                <label>{t("scheduler.event.createTime")}</label>
                <input
                  type="text"
                  value={new Date(config.createTime).toLocaleString()}
                  onChange={e => handleInputChange("createTime", e.target.value)}
                  className="disabled"
                />
              </div>

              <div className="form-group">
                <label>{t("scheduler.event.description")}</label>
                <input
                  type="text"
                  value={config.description}
                  onChange={e => handleInputChange("description", e.target.value)}
                  placeholder={t("scheduler.event.descriptionPlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("scheduler.event.prompt")}</label>
                <textarea
                  value={config.prompt}
                  onChange={e => handleInputChange("prompt", e.target.value)}
                  placeholder={t("scheduler.event.promptPlaceholder")}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.5em',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text)',
                    fontSize: '1em',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.25s, box-shadow 0.25s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--border-input-hover)';
                    e.target.style.boxShadow = '0 0 0 2px var(--shadow-input)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="form-group">
                <label>{t("scheduler.event.frequency")} (seconds)</label>
                <input
                  type="number"
                  value={config.frequency}
                  onChange={e => handleInputChange("frequency", parseInt(e.target.value))}
                  min={MIN_FREQUENCY}
                  max={MAX_FREQUENCY}
                />
                <span className="help-text">
                  {t("scheduler.event.frequencyHelp", { min: MIN_FREQUENCY, max: MAX_FREQUENCY })}
                </span>
              </div>

              <div className="form-group">
                <label>{t("scheduler.event.startDelay")} (seconds)</label>
                <input
                  type="number"
                  value={config.startDelay}
                  onChange={e => handleInputChange("startDelay", parseInt(e.target.value))}
                  min={MIN_START_DELAY}
                  max={MAX_START_DELAY}
                />
                <span className="help-text">
                  {t("scheduler.event.startDelayHelp", { min: MIN_START_DELAY, max: MAX_START_DELAY })}
                </span>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsVisible(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                >
                  {t("scheduler.event.create")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

export default React.memo(EventConfigSidebar)
