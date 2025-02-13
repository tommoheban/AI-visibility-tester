import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

async function analyzeResponse(response: string) {
  console.log(`Analyzing response:`, response)
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    const analysisPrompt = `Analyze this text about proxy providers and extract:
    1. All company names and their aliases/variations (e.g., "Luminati Networks" and "Bright Data" are the same company)
    2. The order in which companies are first mentioned
    3. Any statements about market leadership, industry position, or being the best/top provider
    
    IMPORTANT: Your response must be in valid JSON format. Do not include any additional text, only the JSON object.
    
    Format your response exactly like this:
    {
      "companyAliases": [{"mainName": "string", "aliases": ["string"]}],
      "mentionOrder": ["string"],
      "leadershipStatements": [{"company": "string", "statement": "string"}]
    }

    Text to analyze:
    ${response}`

    let analysisText
    try {
      const result = await model.generateContent(analysisPrompt)
      analysisText = result.response.text()
    } catch (apiError) {
      console.error(`Error calling Gemini API:`, apiError)
      throw new Error(`Failed to get analysis from Gemini: ${apiError.message}`)
    }

    console.log(`Raw Gemini analysis response:`, analysisText)

    const cleanedText = analysisText.replace(/```json\n|```/g, "").trim()

    try {
      const parsedAnalysis = JSON.parse(cleanedText)

      if (!parsedAnalysis.companyAliases) parsedAnalysis.companyAliases = []
      if (!parsedAnalysis.mentionOrder) parsedAnalysis.mentionOrder = []
      if (!parsedAnalysis.leadershipStatements) parsedAnalysis.leadershipStatements = []

      let brightDataEntry = parsedAnalysis.companyAliases.find(
        (company) =>
          company.mainName.toLowerCase().includes("bright data") ||
          company.aliases.some((alias) => alias.toLowerCase().includes("bright data")),
      )

      if (!brightDataEntry) {
        brightDataEntry = {
          mainName: "Bright Data",
          aliases: ["Luminati Networks", "brightdata.com"],
        }
        parsedAnalysis.companyAliases.push(brightDataEntry)
      } else {
        const aliases = new Set([...brightDataEntry.aliases, "Luminati Networks", "brightdata.com"])
        brightDataEntry.aliases = Array.from(aliases)
      }

      if (
        !parsedAnalysis.companyAliases.some(
          (company) =>
            company.mainName.toLowerCase().includes("oxylabs") ||
            company.aliases.some((alias) => alias.toLowerCase().includes("oxylabs")),
        )
      ) {
        parsedAnalysis.companyAliases.push({
          mainName: "Oxylabs",
          aliases: ["oxylabs.io"],
        })
      }

      if (parsedAnalysis.mentionOrder.length === 0 && parsedAnalysis.companyAliases.length > 0) {
        parsedAnalysis.mentionOrder = parsedAnalysis.companyAliases.map((company) => company.mainName)
      }

      console.log(`Parsed analysis:`, parsedAnalysis)
      return parsedAnalysis
    } catch (parseError) {
      console.error(`Error parsing cleaned Gemini analysis response:`, parseError)
      throw new Error(`Failed to parse Gemini analysis: ${parseError.message}`)
    }
  } catch (error) {
    console.error(`Error in analyzeResponse:`, error)
    throw error
  }
}

async function calculateVisibilityScore(response: string, domain: string, analysis: any): Promise<number> {
  try {
    if (!analysis || !analysis.companyAliases) {
      console.log(`No valid analysis available for domain: ${domain}`)
      return 0
    }

    const lowercaseResponse = response.toLowerCase()
    const lowercaseDomain = domain.toLowerCase()

    const companyInfo = analysis.companyAliases.find((company) => {
      const domainBase = lowercaseDomain
        .replace(/https?:\/\//i, "")
        .replace(/\/$/, "")
        .trim()

      const mainNameMatch =
        company.mainName.toLowerCase().includes(domainBase) ||
        domainBase.includes(company.mainName.toLowerCase().replace(/\s+/g, ""))

      const aliasMatch = company.aliases.some(
        (alias) =>
          alias.toLowerCase().includes(domainBase) || domainBase.includes(alias.toLowerCase().replace(/\s+/g, "")),
      )

      return mainNameMatch || aliasMatch
    })

    if (!companyInfo) {
      console.log(`No company info found for domain: ${domain}`)
      return 0
    }

    const allNames = [companyInfo.mainName, ...companyInfo.aliases]
    let totalMentions = 0
    const mentions = allNames.map((name) => {
      const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
      const count = (lowercaseResponse.match(regex) || []).length
      totalMentions += count
      return { name, count }
    })

    console.log("Mentions for", domain, ":", mentions)
    const mentionScore = Math.min(totalMentions / 3, 1)

    const positionIndex = analysis.mentionOrder.findIndex((name) =>
      allNames.some((alias) => name.toLowerCase().includes(alias.toLowerCase())),
    )
    const positionScore = positionIndex === -1 ? 0 : 1 - positionIndex / Math.max(analysis.mentionOrder.length, 1)

    const leadershipStatements = analysis.leadershipStatements.filter((stmt) =>
      allNames.some((name) => stmt.company.toLowerCase().includes(name.toLowerCase())),
    )
    const leadershipScore = Math.min(leadershipStatements.length * 0.2, 0.5)

    const proxyKeywords = [
      "proxy",
      "proxies",
      "web scraping",
      "data collection",
      "residential ip",
      "datacenter proxy",
      "rotating proxy",
      "ip address",
      "geolocation",
      "anonymity",
      "data extraction",
    ]

    const relevanceScore = proxyKeywords.reduce((score, keyword) => {
      const keywordCount = (lowercaseResponse.match(new RegExp(keyword, "gi")) || []).length
      return score + Math.min(keywordCount * 0.05, 0.25)
    }, 0)

    const positiveKeywords = [
      "leader",
      "best",
      "top",
      "reliable",
      "advanced",
      "innovative",
      "comprehensive",
      "excellent",
      "premier",
      "trusted",
    ]

    const sentimentScore = positiveKeywords.reduce((score, keyword) => {
      const regex = new RegExp(`${keyword}.*?(${allNames.join("|")})|(${allNames.join("|")}).*?${keyword}`, "gi")
      const matches = response.match(regex) || []
      return score + Math.min(matches.length * 0.1, 0.2)
    }, 0)

    const finalScore =
      mentionScore * 0.3 + positionScore * 0.2 + leadershipScore * 0.2 + relevanceScore * 0.2 + sentimentScore * 0.1

    console.log("Scores for", domain, ":", {
      mentionScore,
      positionScore,
      leadershipScore,
      relevanceScore,
      sentimentScore,
      finalScore: Math.max(0, Math.min(finalScore, 1)),
    })

    return Math.max(0, Math.min(finalScore, 1))
  } catch (error) {
    console.error("Error calculating visibility score:", error)
    throw error
  }
}

const checkVisibility = async (prompt: string, domains: string[]) => {
  try {
    console.log(`Checking visibility for prompt: "${prompt}"`)

    let rawInitialResponse: string

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" })
      const systemPrompt = `You are an expert in proxy services and web data collection. 
          Analyze and compare different proxy service providers objectively.`
      const fullPrompt = `${systemPrompt}

          Given the query "${prompt}", provide a detailed analysis of proxy service providers.
          Consider features, reliability, infrastructure, and market presence of major players in the industry.
          Focus on technical capabilities and service offerings. Discuss strengths and weaknesses of different providers.`

      console.log(`Sending initial request to Gemini API`)
      const result = await model.generateContent(fullPrompt)
      rawInitialResponse = result.response.text()
    } catch (apiError) {
      console.error(`Error calling Gemini API:`, apiError)
      throw new Error(`Failed to get initial response from Gemini: ${apiError.message}`)
    }

    console.log(`Received initial response from Gemini API`)
    console.log(`Raw Gemini API Response:`, rawInitialResponse)

    console.log("Parsing analysis response")
    const analysis = await analyzeResponse(rawInitialResponse)
    console.log("Parsed analysis:", analysis)

    console.log("Calculating visibility scores")
    const visibilityScores: { [key: string]: number } = {}
    for (const d of domains) {
      try {
        visibilityScores[d] = await calculateVisibilityScore(rawInitialResponse, d, analysis)
      } catch (scoreError) {
        console.error(`Error calculating visibility score for ${d}:`, scoreError)
        visibilityScores[d] = 0
      }
    }
    console.log("Visibility scores:", visibilityScores)

    return {
      scores: visibilityScores,
      rawInitialResponse: rawInitialResponse,
      analysis: analysis,
    }
  } catch (error: any) {
    console.error(`Error checking visibility:`, error)
    return {
      error: error.message || `An error occurred while checking visibility`,
      rawInitialResponse: "",
      analysis: null,
      scores: {},
      stack: error.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    }
  }
}

export async function POST(req: Request) {
  console.log("API route called")
  try {
    const body = await req.json()
    console.log("Received request body:", body)

    const { domain, competitors, prompts } = body

    if (!domain || !competitors || !prompts || prompts.length === 0) {
      console.error("Missing required parameters")
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 },
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set")
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not set",
        },
        { status: 500 },
      )
    }

    const results: {
      [key: string]: {
        scores: { [key: string]: number }
        rawInitialResponse: string
        analysis: any
        error?: string
      }
    } = {}

    for (const prompt of prompts) {
      console.log(`Processing prompt: "${prompt}"`)
      try {
        const result = await checkVisibility(prompt, [domain, ...competitors])
        results[prompt] = result
      } catch (promptError) {
        console.error(`Error processing prompt "${prompt}":`, promptError)
        results[prompt] = {
          error: `Failed to process: ${promptError.message}`,
          scores: {},
          rawInitialResponse: "",
          analysis: null,
        }
      }
    }

    console.log("Finished processing all prompts")
    console.log("Final results:", JSON.stringify(results, null, 2))

    if (Object.keys(results).length === 0) {
      console.error("No results generated")
      return NextResponse.json(
        {
          success: false,
          error: "No results generated",
        },
        { status: 500 },
      )
    }

    console.log("Sending successful response")
    return NextResponse.json({
      success: true,
      visibility: results,
    })
  } catch (error: any) {
    console.error("API route error:", error)
    let errorMessage = "An unexpected error occurred"
    let errorDetails = null

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = {
        name: error.name,
        stack: error.stack,
        cause: error.cause,
      }
    }

    if (error.name === "GoogleGenerativeAIError") {
      errorMessage = "Error communicating with Google Generative AI API"
      errorDetails = {
        reason: error.reason,
        domain: error.domain,
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorDetails: errorDetails,
      },
      { status: 500 },
    )
  }
}

