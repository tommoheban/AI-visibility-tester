import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ResultsDisplayProps {
  results: {
    [prompt: string]: {
      scores: {
        [domain: string]: number
      }
      rawInitialResponse: string
      analysis: {
        companyAliases: Array<{
          mainName: string
          aliases: string[]
        }>
        mentionOrder: string[]
        leadershipStatements: Array<{
          company: string
          statement: string
        }>
      }
      error?: string
    }
  }
  domain: string
  competitors: string[]
  prompts: string[]
}

export default function ResultsDisplay({ results, domain, competitors, prompts }: ResultsDisplayProps) {
  if (!results) {
    return <div>No results to display</div>
  }

  const allDomains = [domain, ...competitors]

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Visibility Results</h2>
      {prompts.map((prompt, index) => (
        <Accordion type="single" collapsible className="mb-6" key={prompt}>
          <AccordionItem value={`item-${index}`}>
            <AccordionTrigger>Prompt: {prompt}</AccordionTrigger>
            <AccordionContent>
              {results[prompt] ? (
                results[prompt].error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{results[prompt].error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Visibility Scores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Domain</TableHead>
                              <TableHead>Visibility Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allDomains.map((d) => (
                              <TableRow key={d}>
                                <TableCell>{d}</TableCell>
                                <TableCell>
                                  {results[prompt].scores && results[prompt].scores[d] !== undefined
                                    ? `${(results[prompt].scores[d] * 100).toFixed(2)}%`
                                    : "N/A"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Raw Initial Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded">
                          {results[prompt].rawInitialResponse || "No raw response available"}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Company Aliases</h4>
                            <ul className="list-disc pl-5">
                              {results[prompt].analysis && results[prompt].analysis.companyAliases ? (
                                results[prompt].analysis.companyAliases.map((company, i) => (
                                  <li key={i}>
                                    {company.mainName} ({company.aliases.join(", ")})
                                  </li>
                                ))
                              ) : (
                                <li>No company aliases found</li>
                              )}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Mention Order</h4>
                            <ol className="list-decimal pl-5">
                              {results[prompt].analysis && results[prompt].analysis.mentionOrder ? (
                                results[prompt].analysis.mentionOrder.map((company, i) => <li key={i}>{company}</li>)
                              ) : (
                                <li>No mention order found</li>
                              )}
                            </ol>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Leadership Statements</h4>
                            <ul className="list-disc pl-5">
                              {results[prompt].analysis && results[prompt].analysis.leadershipStatements ? (
                                results[prompt].analysis.leadershipStatements.map((stmt, i) => (
                                  <li key={i}>
                                    <strong>{stmt.company}:</strong> {stmt.statement}
                                  </li>
                                ))
                              ) : (
                                <li>No leadership statements found</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>No data available for this prompt</AlertDescription>
                </Alert>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  )
}

