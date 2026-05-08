import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./components/AuthContext"
import Login from "./pages/Login"
import Walls from "./pages/Walls"
import WallView from "./pages/WallView"
import SetRoute from "./pages/SetRoute"
import RouteDetail from "./pages/RouteDetail"
import Profile from "./pages/Profile"
import Rankings from "./pages/Rankings"
import "./style.css"

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
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/walls" element={<Walls />} />
          <Route path="/walls/:id" element={<WallView />} />
          <Route path="/walls/:id/set" element={
            <ProtectedRoute><SetRoute /></ProtectedRoute>
          } />
          <Route path="/routes/:id" element={<RouteDetail />} />
          <Route path="/rankings" element={<Rankings />} />

          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/walls" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
