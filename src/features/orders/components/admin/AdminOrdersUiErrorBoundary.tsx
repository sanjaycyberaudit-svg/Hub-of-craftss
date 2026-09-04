"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  errorMessage: string | null;
};

/**
 * Keeps a client-side Orders UI crash inside the page (Alert + retry)
 * instead of bubbling to admin/orders/error.tsx.
 */
export class AdminOrdersUiErrorBoundary extends React.Component<Props, State> {
  state: State = { errorMessage: null };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Orders UI failed to render.";
    return { errorMessage: message };
  }

  componentDidCatch(error: unknown) {
    console.error("[admin/orders] client UI error:", error);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Orders UI error</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{this.state.errorMessage}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                this.setState({ errorMessage: null });
                window.location.assign("/admin/orders");
              }}
            >
              Reload orders
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}
