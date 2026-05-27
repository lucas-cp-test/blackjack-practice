import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RecipeTracker from './RecipeTracker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RecipeTracker />
  </StrictMode>,
)
