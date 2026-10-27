import { StrictMode, lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "./components/AuthContext"
import "./style.css"

const Login       = lazy(() => import("./pages/Login"))
const Walls       = lazy(() => import("./pages/Walls"))
const WallView    = lazy(() => import("./pages/WallView"))
const SetRoute    = lazy(() => import("./pages/SetRoute"))
const RouteDetail = lazy(() => import("./pages/RouteDetail"))
const Profile     = lazy(() => import("./pages/Profile"))
const Rankings    = lazy(() => import("./pages/Rankings"))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
})

const savedTheme = localStorage.getItem("spray-theme")
if (savedTheme && savedTheme !== "system") {
  document.documentElement.setAttribute("data-theme", savedTheme)
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page"><p>loading...</p></div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return children
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="page"><p>loading...</p></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/walls" element={<Walls />} />
          <Route path="/walls/:id" element={<WallView />} />
          <Route path="/walls/:id/set" element={
            <ProtectedRoute><SetRoute /></ProtectedRoute>
          } />
          <Route path="/routes/:id" element={<RouteDetail />} />
          <Route path="/routes/:id/edit" element={
            <ProtectedRoute><SetRoute /></ProtectedRoute>
          } />
          <Route path="/rankings" element={<Rankings />} />

          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/walls/3" />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
