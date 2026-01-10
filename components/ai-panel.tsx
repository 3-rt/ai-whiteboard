"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Lightbulb, AlertTriangle, GitBranch, HelpCircle, Sparkles } from "lucide-react"

export function AIPanel() {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Query submitted:", query)
    setQuery("")
  }

  return (
    <div className="flex w-[400px] flex-col bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze your architecture, identify risks, and explore what-if scenarios. Select a tab or ask a question
          below.
        </p>
      </div>

      <Tabs defaultValue="explanation" className="flex flex-1 flex-col">
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-4 bg-muted">
          <TabsTrigger value="explanation" className="text-xs data-[state=active]:text-foreground">
            <Lightbulb className="mr-1 h-3 w-3" />
            Explain
          </TabsTrigger>
          <TabsTrigger value="risks" className="text-xs data-[state=active]:text-foreground">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Risks
          </TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs data-[state=active]:text-foreground">
            <GitBranch className="mr-1 h-3 w-3" />
            Decisions
          </TabsTrigger>
          <TabsTrigger value="whatif" className="text-xs data-[state=active]:text-foreground">
            <HelpCircle className="mr-1 h-3 w-3" />
            What-if
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="explanation" className="mt-0">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Architecture Explanation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Your current architecture shows a typical microservices pattern with an API Gateway handling incoming
                  requests, routing them to the Auth Service for authentication, and connecting to a central Database
                  for data persistence.
                </p>
                <p className="mt-3">
                  This setup provides good separation of concerns and allows for independent scaling of services.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks" className="mt-0">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Potential Risks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md bg-red-500/10 p-3">
                  <p className="text-sm font-medium text-red-400">Single Point of Failure</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The API Gateway is a single point of failure. Consider adding redundancy.
                  </p>
                </div>
                <div className="rounded-md bg-yellow-500/10 p-3">
                  <p className="text-sm font-medium text-yellow-400">Database Bottleneck</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    All services connect to one database. Consider read replicas for scaling.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="decisions" className="mt-0">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Design Decisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Key architectural choices detected in your design. Add more components to see additional decisions.
                </p>
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-medium text-foreground">Centralized Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Auth is handled by a dedicated service, enabling SSO across services.
                  </p>
                </div>
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-medium text-foreground">API Gateway Pattern</p>
                  <p className="text-xs text-muted-foreground">
                    Single entry point simplifies client integration and enables rate limiting.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatif" className="mt-0">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm text-foreground">What-if Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="text-xs">
                  Explore how your architecture would respond to changes. Type a scenario in the input below to get
                  started.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Example questions:</p>
                  <div className="rounded-md bg-muted p-2">
                    <p className="text-xs text-muted-foreground">&quot;What if we need to handle 10x traffic?&quot;</p>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <p className="text-xs text-muted-foreground">&quot;What if the auth service goes down?&quot;</p>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <p className="text-xs text-muted-foreground">&quot;What if we add a caching layer?&quot;</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about this architecture..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  )
}
