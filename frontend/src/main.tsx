import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AppProvider } from './context/AppContext.tsx'
import 'leaflet/dist/leaflet.css'




export const authService = "http://localhost:5000"
export const restaurantService = "http://localhost:5001"
export const utilsService = "http://localhost:5002"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="807761873628-ctihpb326uph79out4husu788cnng9m4.apps.googleusercontent.com">
      <AppProvider>
        <App />
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
