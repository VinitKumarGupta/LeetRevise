import React from "react";
import { RefreshCw } from "lucide-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Components & Layout
import { Layout } from "./components/Layout.js";

// Pages
import { Login } from "./pages/Login.js";
import { Signup } from "./pages/Signup.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Queue } from "./pages/Queue.js";
import { ProblemDetail } from "./pages/ProblemDetail.js";
import { Analytics } from "./pages/Analytics.js";
import { Settings } from "./pages/Settings.js";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// Guard component for private routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="grid min-h-dvh place-content-center justify-items-center gap-3 text-sm text-muted" role="status">
                <RefreshCw className="size-5 animate-spin text-accent" aria-hidden="true" />
                Restoring session…
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Layout>{children}</Layout>;
};

// Guard component for public routes (auth routes)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/signup"
                    element={
                        <PublicRoute>
                            <Signup />
                        </PublicRoute>
                    }
                />

                {/* Protected Routes */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/queue"
                    element={
                        <ProtectedRoute>
                            <Queue />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/problem/:id"
                    element={
                        <ProtectedRoute>
                            <ProblemDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sync"
                    element={<Navigate to="/settings" replace />}
                />
                <Route
                    path="/analytics"
                    element={
                        <ProtectedRoute>
                            <Analytics />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    }
                />

                {/* Fallbacks */}
                <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                />
                <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
