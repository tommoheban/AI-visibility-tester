import { Checkbox } from "@/components/ui/checkbox"
import type React from "react" // Import React

interface AIToolSelectorProps {
  selectedTools: string[]
  setSelectedTools: React.Dispatch<React.SetStateAction<string[]>>
}

const aiTools = ["ChatGPT", "Gemini"]

export default function AIToolSelector({ selectedTools, setSelectedTools }: AIToolSelectorProps) {
  const handleToolSelection = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter((t) => t !== tool))
    } else {
      setSelectedTools([...selectedTools, tool])
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Select AI Tools</label>
      <div className="space-y-2">
        {aiTools.map((tool) => (
          <div key={tool} className="flex items-center">
            <Checkbox
              id={tool}
              checked={selectedTools.includes(tool)}
              onCheckedChange={() => handleToolSelection(tool)}
            />
            <label htmlFor={tool} className="ml-2 text-sm text-gray-700">
              {tool}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

