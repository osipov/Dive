import React, { useEffect, useMemo, useState } from "react"
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow, darcula } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useAtomValue } from "jotai"
import { themeAtom } from "../../atoms/themeState"
import { safeBase64Decode } from "../../util"
import { useTranslation } from "react-i18next"

interface ToolPanelProps {
  content: string
  name: string
  isOpen: boolean
  onToggle: (open: boolean) => void
}

const callStr = "##Tool Calls:"
const resultStr = "##Tool Result:"

function getToolResult(content: string) {
  let calls: string[] = []
  let results: string[] = []

  try {
    const resultIndex = content.indexOf(resultStr)
    calls = (resultIndex === -1 ? content.slice(callStr.length) : content.slice(callStr.length, resultIndex)).split(callStr)

    if (resultIndex !== -1) {
      results = content
        .slice(resultIndex + resultStr.length)
        .split(resultStr)
        .filter(result => result.trim() !== "")
    }
  } catch (e) {
    console.error("Error parsing tool results:", e)
  }

  return {
    calls,
    results
  }
}

function formatJSON(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString.trim())
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return jsonString
  }
}

const Code = ({ content }: { content: string }) => {
  const [theme] = useAtomValue(themeAtom)

  return (
    <SyntaxHighlighter
      language={"json"}
      style={theme === "dark" ? tomorrow : darcula}
      showLineNumbers={true}
      customStyle={{
        margin: 0,
        height: "100%",
        background: "transparent",
        backgroundColor: "var(--bg-modal)"
      }}
      codeTagProps={{
        style: {
          fontSize: "14px",
          lineHeight: "1.5"
        }
      }}
    >
      {content}
    </SyntaxHighlighter>
  )
}

const ToolPanel: React.FC<ToolPanelProps> = ({ content, name, isOpen, onToggle }) => {
  const { t } = useTranslation()
  const { calls, results } = useMemo(() => getToolResult(content), [content])
  const formattedCalls = useMemo(() => calls.map(call => formatJSON(safeBase64Decode(call))), [calls])
  const formattedResults = useMemo(() => results.map(result => formatJSON(safeBase64Decode(result))), [results])

  if (!content || !content.startsWith(callStr)) {
    return <></>
  }

  return (
    <div className="tool-panel" >
      <div className={`tool-summary ${isOpen ? "open" : ""}`} onClick={() => onToggle(!isOpen)} >
        <div className="tool-summary-icon">▼</div> {t("chat.toolCalls", { name })}
      </div>
      {isOpen && <div className="tool-content">
        {formattedCalls.map((call, index) => (
          <>
            <span>Call{formattedCalls.length > 1 ? ` ${index + 1}` : ""}:</span>
            <Code key={index} content={call} />
          </>
        ))}

        {results.length > 0 && (
          <>
            {formattedResults.map((result, index) => (
              <>
                <span>Results{formattedResults.length > 1 ? ` ${index + 1}` : ""}:</span>
                <Code key={index} content={result} />
              </>
            ))}
          </>
        )}
      </div>}
    </div>
  )
}

export default React.memo(ToolPanel)