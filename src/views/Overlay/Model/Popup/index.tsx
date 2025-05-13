
import { useAtom } from "jotai"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { InterfaceModelConfig, modelVerifyListAtom, MultiModelConfig } from "../../../../atoms/configState"
import { defaultInterface } from "../../../../atoms/interfaceState"
import { showToastAtom } from "../../../../atoms/toastState"
import CheckBox from "../../../../components/CheckBox"
import Dropdown from "../../../../components/DropDown"
import PopupConfirm from "../../../../components/PopupConfirm"
import Tooltip from "../../../../components/Tooltip"
import WrappedInput from "../../../../components/WrappedInput"
import { ListOption, useModelsProvider } from "../ModelsProvider"
import { ModelVerifyDetail, ModelVerifyStatus, useModelVerify } from "../ModelVerify"
import AdvancedSettingPopup from "./AdvancedSetting"
import CustomIdPopup from "./CustomId"

const ModelPopup = ({
  defaultModel,
  onClose,
  onSuccess,
}: {
  defaultModel: string
  onClose: () => void
  onSuccess: () => void
}) => {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, showToast] = useAtom(showToastAtom)
  const [checkboxState, setCheckboxState] = useState<"" | "all" | "-">("")
  const [searchText, setSearchText] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const isVerifying = useRef(false)
  const [verifyingCnt, setVerifyingCnt] = useState(0)
  const [verifiedCnt, setVerifiedCnt] = useState(0)
  const [showUnSupportInfo, setShowUnSupportInfo] = useState(false)
  const [unSupportInfo, setUnSupportInfo] = useState("")
  const [showConfirmVerify, setShowConfirmVerify] = useState(false)
  const [allVerifiedList, setAllVerifiedList] = useAtom(modelVerifyListAtom)
  const { verify, abort } = useModelVerify()

  const [showAdvancedSetting, setShowAdvancedSetting] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");

  const { fetchListOptions, listOptions, setListOptions,
          multiModelConfigList, setMultiModelConfigList,
          currentIndex, saveConfig
        } = useModelsProvider()

  const multiModelConfig = (multiModelConfigList?.[currentIndex] ?? {}) as MultiModelConfig
  const currentVerifyList = multiModelConfig ? (allVerifiedList ?? {})[multiModelConfig?.apiKey || multiModelConfig?.baseURL] ?? {} : {}

  const searchListOptions = useMemo(() => {
    let result = listOptions
    if(searchText.length > 0) {
      result = result?.filter(option => option.name.includes(searchText))
    }
    let state = "-"
    if(listOptions?.filter(option => option.checked).length === 0)
      state = ""
    else if(result?.length > 0 && result?.every(option => option.checked))
      state = "all"
    setCheckboxState(state as "" | "all" | "-")
    return result
  }, [listOptions, searchText])

  useEffect(() => {
    ;(async () => {
      await reloadModelList(defaultModel)
    })()

    return () => {
      setIsFetching(false)
      setShowConfirmVerify(false)
      setVerifiedCnt(0)
      isVerifying.current = false
    }
  }, [multiModelConfig])

  const reloadModelList = async (_defaultModel?: string) => {
    try {
      if(!multiModelConfig)
        return
      setListOptions([])
      setIsFetching(true)
      let options = await fetchListOptions(multiModelConfig, defaultInterface[multiModelConfig.name])
      options = options.map(option => ({
        ...option,
        checked: _defaultModel ? option.name === _defaultModel : multiModelConfig.models.includes(option.name),
        verifyStatus: option.verifyStatus ?? "unVerified"
      })).sort((a, b) => {
        if (a.checked === b.checked) {
          return (a as any).originalIndex - (b as any).originalIndex
        }
        return a.checked ? -1 : 1
      })
      setListOptions(options)
      setCheckboxState(options.every(option => option.checked) ? "all" : options.some(option => option.checked) ? "-" : "")
      setIsFetching(false)
    } catch (error) {
      showToast({
        message: (error as Error).message,
        type: "error"
      })
      setListOptions([])
      setIsFetching(false)
    }
  }

  const handleGroupClick = () => {
    let State: "" | "all" | "-" = ""
    if (checkboxState == "") {
      State = "all"
    } else {
      State = ""
    }
    setCheckboxState(State)

    const _newModelList = listOptions?.map((model: ListOption) => {
      if(searchText.length > 0 && !model.name.includes(searchText))
        return { ...model, "checked": false }
      return { ...model, "checked": !!State }
    })
    setListOptions(_newModelList)
  }

  const handleModelChange = (name: string, key: string, value: any) => {
    const newModelList = listOptions?.map((model: ListOption) => {
      if (model.name === name) {
        return { ...model, [key]: value }
      }
      return model
    })
    if (newModelList.every((model: ListOption) => model.checked)) {
      setCheckboxState("all");
    } else if (newModelList.some((model: ListOption) => model.checked)) {
      setCheckboxState("-");
    } else {
      setCheckboxState("");
    }
    setListOptions(newModelList)
  }

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      if (data.success) {
        showToast({
          message: t("models.modelSaved"),
          type: "success"
        })
        onSuccess()
      }
    } catch (error) {
      console.error("Failed to save config:", error)
      showToast({
        message: t("models.modelSaveFailed"),
        type: "error"
      })
    }
  }

  const saveModel = async () => {
    const _multiModelConfigList = JSON.parse(JSON.stringify(multiModelConfigList))
    if(!multiModelConfigList){
      handleSubmit({ success: true })
      return
    }

    try {
      setIsSubmitting(true)
      const newModelConfigList = multiModelConfigList
      newModelConfigList[currentIndex].models = listOptions.filter(option => option.checked).map(option => option.name)
      setMultiModelConfigList([...newModelConfigList])
      const data = await saveConfig()

      // save custom model list to local storage
      const key = `${multiModelConfig.apiKey || multiModelConfig.baseURL || multiModelConfig.accessKeyId}`
      const customModelList = localStorage.getItem("customModelList")
      const allCustomModelList = customModelList ? JSON.parse(customModelList) : {}
      const newCustomModelList = listOptions.filter(option => option.isCustom).map(option => option.name)
      if(newCustomModelList.length > 0){
        localStorage.setItem("customModelList", JSON.stringify({
          ...allCustomModelList,
          [key as string]: newCustomModelList
        }))
      } else {
        delete allCustomModelList[key]
        localStorage.setItem("customModelList", JSON.stringify(allCustomModelList))
      }

      // if model is not in current listOptions, remove it from verifiedList
      const verifiedList = allVerifiedList[key] ?? {}
      const cleanedVerifiedList = {} as Record<string, ModelVerifyStatus>
      Object.keys(verifiedList).forEach(modelName => {
        if (listOptions.some(option => option.name === modelName)) {
          cleanedVerifiedList[modelName] = verifiedList[modelName]
        }
      })
      setAllVerifiedList({
        ...allVerifiedList,
        [key as string]: cleanedVerifiedList
      })

      await handleSubmit(data)
    } catch (error) {
      setMultiModelConfigList(_multiModelConfigList)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onConfirm = async () => {
    // If there are unverified models, show the verification confirmation popup
    if(listOptions?.filter(option => option.checked).some(option => option.verifyStatus == "unVerified")){
      setShowConfirmVerify(true)
    } else {
      await saveModel()
    }
  }

  const handleDeleteCustomModelID = (name: string) => {
    setListOptions((prev: ListOption[]) => {
      return prev.filter(option => option.name !== name)
    })
  }

  const onVerifyConfirm = (needVerifyList?: Record<string, InterfaceModelConfig>, ifSave: boolean = true) => {
    setShowConfirmVerify(false)
    setVerifiedCnt(0)
    isVerifying.current = true
    const _listOptions = JSON.parse(JSON.stringify(listOptions))
    const _needVerifyList = needVerifyList ? needVerifyList : _listOptions.filter((option: ListOption) => {
      return multiModelConfig && option.checked && option.verifyStatus === "unVerified"
    }).reduce((acc: Record<string, InterfaceModelConfig>, value: ListOption) => {
      acc[value.name] = {
        apiKey: multiModelConfig?.apiKey,
        baseURL: multiModelConfig?.baseURL,
        model: value.name,
        modelProvider: multiModelConfig?.name
      } as InterfaceModelConfig
      return acc
    }, {} as Record<string, InterfaceModelConfig>)
    setVerifyingCnt(needVerifyList ? Object.keys(needVerifyList).length : _listOptions.filter((option: ListOption) => option.checked).length)

    const onComplete = async () => {
      if(ifSave){
        await saveModel()
      }
      isVerifying.current = false
    }

    const onUpdate = (detail: ModelVerifyDetail[]) => {
      listOptions.forEach((option: ListOption) => {
        const _detail = detail.find(item => item.name == option.name)
        if(_detail){
          option.verifyStatus = _detail.status
        }
      })
      setListOptions(listOptions)
      setVerifiedCnt(detail.filter(item => item.status !== "verifying").length)
    }

    const onAbort = () => {
      setListOptions((prev: ListOption[]) => {
        const _prev = JSON.parse(JSON.stringify(prev))
        return _prev.map((option: ListOption) => {
          if (option.verifyStatus === "verifying") {
            return _listOptions.find((item: ListOption) => item.name == option.name)
          }
          return {
            ...option
          }
        })
      })
      isVerifying.current = false
    }
    verify(_needVerifyList, onComplete, onUpdate, onAbort)
  }

  const onVerifyIgnore = async (ignoreVerifyList?: ListOption[], ifSave: boolean = true) => {
    const _listOptions = JSON.parse(JSON.stringify(listOptions))
    const _ignoreVerifyList = ignoreVerifyList ? ignoreVerifyList : _listOptions.filter((option: ListOption) => option.checked && option.verifyStatus == "unVerified")
    _ignoreVerifyList.forEach((option: ListOption) => {
      currentVerifyList[option.name] = "ignore"
      if (_listOptions.find((item: ListOption) => item.name == option.name)) {
        _listOptions.find((item: ListOption) => item.name == option.name).verifyStatus = "ignore"
      }
    })
    setListOptions(_listOptions)
    allVerifiedList[multiModelConfig?.apiKey || multiModelConfig?.baseURL] = currentVerifyList
    setAllVerifiedList({...allVerifiedList})
    setShowConfirmVerify(false)
    if(ifSave){
      await saveModel()
    }
  }

  const onVerifyNextTime = () => {
    setShowConfirmVerify(false)
    saveModel()
  }

  const verifyStatusNode = (option: ListOption) => {
    switch(option.verifyStatus) {
      case "unSupportModel":
      case "unSupportTool":
        return (
          <div className="verify-status">
            <div className="verify-status-text verify-status-error">
              <div
                className="verify-status-error-btn"
                onClick={(e) => {
                  e.preventDefault()
                  setShowUnSupportInfo(true)
                  const current = currentVerifyList[option.name]
                  let error_msg = ""
                  if(current.success) {
                    const key = !current?.connecting?.success ? "connecting" : "supportToolsInPrompt"
                    error_msg = current?.[key]?.error_msg ?? t("models.verifyErrorMsg")
                  } else {
                    error_msg = t("models.verifyUnexpectedFailed")
                  }
                  setUnSupportInfo(error_msg)
                }}
              >
                {t("models.verifyErrorInfo")}
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"></circle>
                <line x1="12" y1="6" x2="12" y2="14" stroke="currentColor" strokeWidth="2"></line>
                <circle cx="12" cy="17" r="1.5" fill="currentColor"></circle>
              </svg>
            </div>
          </div>
        )
      case "unVerified":
        return
      case "verifying":
        return (
          <div className="verify-status">
            <div className="loading-spinner"></div>
          </div>
        )
      case "success":
        return (
          <Tooltip
            content={t("models.verifyStatusSuccess")}
          >
            <div className="verify-status-icon-wrapper">
              <svg className="correct-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" width="20" height="20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="m4.67 10.424 4.374 4.748 8.478-7.678"></path>
              </svg>
            </div>
          </Tooltip>
        )
      case "successInPrompt":
        return (
          <Tooltip
            content={t("models.verifyStatusSuccessInPrompt")}
          >
            <div className="verify-status-icon-wrapper success-in-prompt">
              <svg className="correct-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" width="20" height="20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="m4.67 10.424 4.374 4.748 8.478-7.678"></path>
              </svg>
            </div>
          </Tooltip>
        )
      case "ignore":
        return (
          <div className="verify-status">
            <div className="verify-status-text">
              {t("models.ignored")}
            </div>
          </div>
        )
    }
  }

  const verifyMenu = (option: ListOption) => {
    const status = option.verifyStatus ?? "unVerified"
    const menu = []

    menu.push({
      label: (
        <div className="model-option-verify-menu-item">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 6H2C1.44772 6 1 6.44772 1 7C1 7.55228 1.44772 8 2 8H12V6ZM16 8H20C20.5523 8 21 7.55228 21 7C21 6.44772 20.5523 6 20 6H16V8Z"
              fill="currentColor"
            />
            <circle cx="14" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10 14H20C20.5523 14 21 14.4477 21 15C21 15.5523 20.5523 16 20 16H10V14ZM6 16H2C1.44772 16 1 15.5523 1 15C1 14.4477 1.44772 14 2 14H6V16Z"
              fill="currentColor"
            />
            <circle cx="8" cy="15" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
          {t("models.verifyMenu0")}
        </div>
      ),
      onClick: () => {
        setSelectedModel(option.name)
        setShowAdvancedSetting(true)
      },
    })

    // verify model
    const _option: Record<string, InterfaceModelConfig> = {}
    _option[option.name] = {
      apiKey: multiModelConfig?.apiKey,
      baseURL: multiModelConfig?.baseURL,
      model: option.name,
      modelProvider: multiModelConfig?.name
    } as InterfaceModelConfig
    menu.push({
      label:
        <div className="model-option-verify-menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M7 2.5L1.06389 4.79879C1.02538 4.8137 1 4.85075 1 4.89204V11.9315C1 11.9728 1.02538 12.0098 1.06389 12.0247L7 14.3235" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M7.5 10.5V7.5L12.8521 4.58066C12.9188 4.54432 13 4.59255 13 4.66845V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M1 5L7.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M7 2.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="15.5" cy="15.5" r="5.5" stroke="currentColor" strokeWidth="2"/>
            <path d="M13 15.1448L14.7014 17L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t("models.verifyMenu1")}
        </div>,
      onClick: () => {
        onVerifyConfirm(_option, false)
      }
    })

    // ignore verify model
    if(status !== "ignore" && status !== "success"){
      menu.push({
        label:
          <div className="model-option-verify-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="15.5" cy="15.5" r="5.5" stroke="currentColor" strokeWidth="2"/>
              <path d="M17.5 15.5H13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 2.5L1.06389 4.79879C1.02538 4.8137 1 4.85075 1 4.89204V11.9315C1 11.9728 1.02538 12.0098 1.06389 12.0247L7 14.3235" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7.5 10.5V7.5L12.8521 4.58066C12.9188 4.54432 13 4.59255 13 4.66845V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M1 5L7.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 2.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {t("models.verifyMenu2")}
          </div>,
        onClick: () => {
          onVerifyIgnore([{
            ...option,
            apiKey: multiModelConfig?.apiKey,
            baseURL: multiModelConfig?.baseURL,
            model: option.name
          } as ListOption], false)
        }
      })
    }

    // delete custom model id
    if(option.isCustom){
      menu.push({
        label:
          <div className="model-option-verify-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 5H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 7V18.2373C16.9764 18.7259 16.7527 19.1855 16.3778 19.5156C16.0029 19.8457 15.5075 20.0192 15 19.9983H7C6.49249 20.0192 5.99707 19.8457 5.62221 19.5156C5.24735 19.1855 5.02361 18.7259 5 18.2373V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M8 10.04L14 16.04" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M14 10.04L8 16.04" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M13.5 2H8.5C8.22386 2 8 2.22386 8 2.5V4.5C8 4.77614 8.22386 5 8.5 5H13.5C13.7761 5 14 4.77614 14 4.5V2.5C14 2.22386 13.7761 2 13.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            {t("models.verifyMenu3")}
          </div>,
        onClick: () => handleDeleteCustomModelID(option.name)
      })
    }

    return menu
  }

  const copyInfo = () => {
    navigator.clipboard.writeText(unSupportInfo)
    showToast({
      message: t("common.copySuccess"),
      type: "success"
    })
  }

  const handleClose = () => {
    if(isVerifying.current){
      abort()
    }
    onClose()
  }

  return (
    <PopupConfirm
      zIndex={900}
      className="model-popup"
      disabled={isFetching || isVerifying.current || isSubmitting}
      confirmText={(isVerifying.current || isSubmitting) ? (
        <div className="loading-spinner"></div>
      ) : t("tools.save")}
      onConfirm={onConfirm}
      onCancel={handleClose}
      onClickOutside={handleClose}
      footerHint={
        isVerifying.current && (
          <div className="models-progress-wrapper">
            <div className="models-progress-text">
              {t("models.progressVerifying")}
              <div className="models-progress-text-right">
                <div className="abort-button" onClick={abort}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M8 6h2v12H8zm6 0h2v12h-2z" fill="currentColor"/>
                  </svg>
                </div>
                <span>{`${verifiedCnt} / ${verifyingCnt}`}</span>
              </div>
            </div>
            <div className="models-progress-container">
              <div
                className="models-progress"
                style={{
                  width: `${(verifiedCnt / verifyingCnt) * 100}%`
                }}
              >
              </div>
            </div>
          </div>
        )
      }
    >
      {showAdvancedSetting && (
        <AdvancedSettingPopup
          modelName={selectedModel}
          onClose={() => {
            setShowAdvancedSetting(false)
            setSelectedModel("")
          }}
          onSave={() => {
            setShowAdvancedSetting(false)
            setSelectedModel("")
          }}
        />
      )}
      <div className="model-popup-content">
        <div className="model-list-header">
          <div className="model-list-title">
            <CheckBox
              checked={!!checkboxState}
              indeterminate={checkboxState == "-"}
              onChange={handleGroupClick}
            />
            {t("models.popupTitle")}
          </div>
          <div className="model-list-tools">
            <div className="model-list-search-wrapper">
              <WrappedInput
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t("models.searchPlaceholder")}
                className="model-list-search"
              />
              {searchText.length > 0 &&
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 18 18"
                  width="22"
                  height="22"
                  className="model-list-search-clear"
                  onClick={() => setSearchText("")}
                >
                  <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m13.91 4.09-9.82 9.82M13.91 13.91 4.09 4.09"></path>
                </svg>
              }
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" width="22" height="22">
                <path stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="2" d="m15 15 5 5"></path>
                <path stroke="currentColor" strokeMiterlimit="10" strokeWidth="2" d="M9.5 17a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z">
                </path>
              </svg>
            </div>
            <div
              className="models-reload-btn"
              onClick={() => reloadModelList()}
            >
              {t("models.reloadModelList")}
            </div>
            <CustomIdPopup
              listOptions={listOptions}
              setListOptions={setListOptions}
            />
          </div>
        </div>
        <div className="model-list">
          {isFetching ? (
              <div className="loading-spinner-wrapper">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              searchListOptions?.length == 0 ?
                <div className="model-list-empty">
                  {t("models.noResult")}
                </div> :
                <>
                  {searchListOptions?.map((option: ListOption) => (
                    <label
                      key={option.name}
                      onClick={(e) => {
                        e.stopPropagation()
                        if(isVerifying.current){
                          e.preventDefault()
                        }
                      }}
                    >
                      <div className={`model-option ${option.verifyStatus}`}>
                        <CheckBox
                          checked={option.checked}
                          onChange={() => handleModelChange(option.name, "checked", !option.checked)}
                        />
                        <div className="model-option-name">
                          {option.name}
                        </div>
                        <div className="model-option-hint">
                          {verifyStatusNode(option)}
                          {verifyMenu(option)?.length > 0 && option.verifyStatus !== "verifying" &&
                            <div className="model-option-verify-menu-wrapper">
                              {!isVerifying.current &&
                                <Dropdown
                                  options={verifyMenu(option)}
                                >
                                  <div className="model-option-verify-menu">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" width="18" height="18">
                                      <path fill="currentColor" d="M19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
                                    </svg>
                                  </div>
                                </Dropdown>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    </label>
                  ))}
                </>
            )
          }
          {showConfirmVerify &&
            <PopupConfirm
              zIndex={900}
              className="model-list-verify-popup"
              onConfirm={() => onVerifyConfirm()}
              confirmText={t("models.verify")}
              onCancel={() => onVerifyIgnore()}
              cancelText={t("models.verifyIgnore")}
              cancelTooltip={t("models.verifyIgnoreAlt")}
              footerHint={
                <Tooltip
                  content={t("models.verifyNextTimeAlt")}
                >
                  <div
                    className="verify-next-time-button"
                    onClick={onVerifyNextTime}
                  >
                    {t("models.verifyNextTime")}
                  </div>
                </Tooltip>
              }
            >
              <h4 className="model-list-verify-title">
                {t("models.verifyTitle", { count: listOptions?.filter(option => option.checked && option.verifyStatus == "unVerified").length })}
              </h4>
              <div className="model-list-verify-desc">
                <div className="model-list-unverify-list">
                  <span>{t("models.verifyDesc")}</span>
                  <div className="model-list-unverify-ul-wrapper">
                    <ul>
                      {listOptions?.filter(option => option.checked && option.verifyStatus == "unVerified").map(option => (
                        <li key={option.name}>{option.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </PopupConfirm>
          }
          {showUnSupportInfo &&
            <PopupConfirm
              zIndex={900}
              footerType="center"
              className="model-list-unsupport-info"
              onCancel={() => setShowUnSupportInfo(false)}
              cancelText={t("common.close")}
              onClickOutside={() => setShowUnSupportInfo(false)}
            >
              <div className="model-list-unsupport-info-wrapper">
                <div className="model-list-unsupport-info-title">
                  <svg width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"></circle>
                    <line x1="12" y1="6" x2="12" y2="14" stroke="currentColor" strokeWidth="2"></line>
                    <circle cx="12" cy="17" r="1.5" fill="currentColor"></circle>
                  </svg>
                  {t("models.verifyErrorInfo")}
                </div>
                <div className="model-list-unsupport-info-content">
                  {unSupportInfo}
                </div>
                <Tooltip
                  content={t("common.copy")}
                  side="bottom"
                >
                  <div className="model-list-unsupport-info-copy" onClick={copyInfo}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 22 22" fill="transparent">
                      <path d="M13 20H2V6H10.2498L13 8.80032V20Z" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round"/>
                      <path d="M13 9H10V6L13 9Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 3.5V2H17.2498L20 4.80032V16H16" fill="transparent" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinejoin="round"/>
                      <path d="M20 5H17V2L20 5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </Tooltip>
              </div>
            </PopupConfirm>
          }
        </div>
      </div>
    </PopupConfirm>
  )
}

export default React.memo(ModelPopup)