"use client";

import * as React from "react";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

const DEFAULT_BODY = `{
  "type": "test",
  "message": "hello from Intradark server page"
}`;

export default function ServerPage() {
  const [bodyText, setBodyText] = React.useState(DEFAULT_BODY);
  const [bearer, setBearer] = React.useState("dev-secret");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    ok: boolean;
    status: number;
    text: string;
  } | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  async function sendTestPost() {
    setParseError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      setParseError("Body is not valid JSON.");
      setResult(null);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cs2/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(parsed),
      });
      const text = await res.text();
      setResult({
        ok: res.ok,
        status: res.status,
        text,
      });
    } catch (e) {
      setResult({
        ok: false,
        status: 0,
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainSectionShell
      title="Server"
      description="Send a test POST to the CS2 events ingestion API."
    >
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>POST /api/cs2/events</CardTitle>
            <CardDescription>
              Uses Authorization: Bearer {"<token>"}. Default matches the dev
              route handler (`dev-secret`).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bearer">Bearer token</Label>
              <Input
                id="bearer"
                type="password"
                autoComplete="off"
                value={bearer}
                onChange={(e) => setBearer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="json-body">JSON body</Label>
              <Textarea
                id="json-body"
                className="font-mono text-sm min-h-[180px]"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                spellCheck={false}
              />
              {parseError ? (
                <p className="text-sm text-destructive">{parseError}</p>
              ) : null}
            </div>
            <Button
              type="button"
              onClick={sendTestPost}
              disabled={loading}
            >
              {loading ? "Sending…" : "Send test POST"}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <Card
            className={
              result.ok
                ? "border-green-500/40 bg-green-500/5"
                : "border-destructive/40 bg-destructive/5"
            }
          >
            <CardHeader>
              <CardTitle className="text-base">
                Response{" "}
                <span className="text-muted-foreground font-mono text-sm">
                  {result.status || "—"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded-md bg-muted/50 p-3">
                {result.text}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </MainSectionShell>
  );
}
