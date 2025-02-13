"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ResultsDisplay from "./ResultsDisplay"

interface APIResponse {
  success: boolean
  visibility?: {
    [prompt: string]: {
      scores: {
        [domain: string]: number
      }
      rawInitialResponse: string
      analysis: any
      error?: string
    }
  }
  error?: string
  errorDetails?: any
}

export default function AIVisibilityChecker() {
  const [domain, setDomain] = useState("brightdata.com")
  const [competitors, setCompetitors] = useState("https://oxylabs.io/")
  const [prompts, setPrompts] = useState("proxy")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<APIResponse["visibility"] | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)
  const [fullError, setFullError] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResults(null)
    setFullError(null)
    setRawResponse(null)

    try {
      const competitorList = competitors.split(",").map((c) => c.trim())
      const promptList = prompts.split("\n").map((p) => p.trim())

      console.log("Sending request with:", { domain, competitors: competitorList, prompts: promptList })

      const response = await fetch("/api/check-visibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain,
          competitors: competitorList,
          prompts: promptList,
        }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log("Raw response text:", responseText)
      setRawResponse(responseText)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`)
      }

      let data: APIResponse

      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError)
        throw new Error(`Failed to parse response: ${responseText}`)
      }

      console.log("API Response data:", data)
      console.log("Visibility results:", data.visibility)

      if (!data.success) {
        throw new Error(data.error || "Failed to check visibility")
      }

      if (!data.visibility || Object.keys(data.visibility).length === 0) {
        throw new Error("No visibility data returned from the API")
      }

      setResults(data.visibility)
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      if (error instanceof Error) {
        setError(`Error: ${error.message}`)
        setFullError({
          name: error.name,
          message: error.message,
          stack: error.stack,
        })
      } else if (typeof error === "object" && error !== null) {
        setError(`Error: ${JSON.stringify(error)}`)
        setFullError(error)
      } else {
        setError(`An unexpected error occurred: ${String(error)}`)
        setFullError({ unknownError: String(error) })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {fullError && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Full Error Details:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">{JSON.stringify(fullError, null, 2)}</pre>
          </div>
        )}
        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
            Your Domain
          </label>
          <Input
            id="domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="competitors" className="block text-sm font-medium text-gray-700">
            Competitor Domains
          </label>
          <Input
            id="competitors"
            type="text"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            placeholder="competitor1.com, competitor2.com"
          />
        </div>
        <div>
          <label htmlFor="prompts" className="block text-sm font-medium text-gray-700">
            Prompts
          </label>
          <Textarea
            id="prompts"
            value={prompts}
            onChange={(e) => setPrompts(e.target.value)}
            placeholder="Enter each prompt on a new line"
            rows={4}
            required
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Checking Visibility..." : "Check Visibility"}
        </Button>
        {results && (
          <ResultsDisplay
            results={results}
            domain={domain}
            competitors={competitors.split(",")}
            prompts={prompts.split("\n")}
          />
        )}
        {rawResponse && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Raw API Response:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">{rawResponse}</pre>
          </div>
        )}
      </form>
    </Card>
  )
}

