import { BrowserRouter } from "react-router";
import { AppProviders } from "@/components/providers/app-providers";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { AppRoutes } from "@/routes";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProviders>
          <AppRoutes />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
