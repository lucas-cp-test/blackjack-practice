import { useState } from 'react'
import './RecipeTracker.css'

const EMPTY_RECIPE = { name: '', ingredients: [], steps: [] }

export default function RecipeTracker() {
  const [recipes, setRecipes] = useState([])
  const [view, setView] = useState('list') // 'list' | 'new' | 'detail'
  const [activeId, setActiveId] = useState(null)

  // Form state for creating a new recipe
  const [draft, setDraft] = useState(EMPTY_RECIPE)
  const [ingredientInput, setIngredientInput] = useState('')
  const [stepInput, setStepInput] = useState('')

  const activeRecipe = recipes.find((r) => r.id === activeId) ?? null

  // ── helpers ──────────────────────────────────────────────────────────────

  function startNew() {
    setDraft(EMPTY_RECIPE)
    setIngredientInput('')
    setStepInput('')
    setView('new')
  }

  function addIngredient() {
    const value = ingredientInput.trim()
    if (!value) return
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, value] }))
    setIngredientInput('')
  }

  function removeIngredient(index) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== index) }))
  }

  function addStep() {
    const value = stepInput.trim()
    if (!value) return
    setDraft((d) => ({ ...d, steps: [...d.steps, value] }))
    setStepInput('')
  }

  function removeStep(index) {
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== index) }))
  }

  function saveRecipe(e) {
    e.preventDefault()
    if (!draft.name.trim()) return
    const recipe = { ...draft, name: draft.name.trim(), id: Date.now() }
    setRecipes((prev) => [...prev, recipe])
    setView('list')
  }

  function deleteRecipe(id) {
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    if (activeId === id) setView('list')
  }

  function openDetail(id) {
    setActiveId(id)
    setView('detail')
  }

  function handleIngredientKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addIngredient()
    }
  }

  function handleStepKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addStep()
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (view === 'new') {
    return (
      <div className="rt-shell">
        <h1 className="rt-title">New Recipe</h1>

        <form className="rt-form" onSubmit={saveRecipe}>
          <label className="rt-label" htmlFor="rt-name">
            Recipe Name
          </label>
          <input
            id="rt-name"
            className="rt-input"
            type="text"
            placeholder="e.g. Classic Pancakes"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            autoFocus
            required
          />

          {/* Ingredients */}
          <fieldset className="rt-fieldset">
            <legend className="rt-legend">Ingredients</legend>
            <div className="rt-add-row">
              <input
                className="rt-input"
                type="text"
                placeholder="e.g. 2 cups flour"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={handleIngredientKey}
              />
              <button type="button" className="rt-add-btn" onClick={addIngredient}>
                Add
              </button>
            </div>
            {draft.ingredients.length > 0 && (
              <ul className="rt-item-list">
                {draft.ingredients.map((ing, i) => (
                  <li key={i} className="rt-item">
                    <span>{ing}</span>
                    <button
                      type="button"
                      className="rt-remove-btn"
                      onClick={() => removeIngredient(i)}
                      aria-label={`Remove ${ing}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          {/* Steps */}
          <fieldset className="rt-fieldset">
            <legend className="rt-legend">Instructions</legend>
            <div className="rt-add-row">
              <input
                className="rt-input"
                type="text"
                placeholder="Describe this step…"
                value={stepInput}
                onChange={(e) => setStepInput(e.target.value)}
                onKeyDown={handleStepKey}
              />
              <button type="button" className="rt-add-btn" onClick={addStep}>
                Add
              </button>
            </div>
            {draft.steps.length > 0 && (
              <ol className="rt-item-list rt-steps">
                {draft.steps.map((step, i) => (
                  <li key={i} className="rt-item">
                    <span>{step}</span>
                    <button
                      type="button"
                      className="rt-remove-btn"
                      onClick={() => removeStep(i)}
                      aria-label={`Remove step ${i + 1}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </fieldset>

          <div className="rt-form-actions">
            <button type="button" className="rt-secondary-btn" onClick={() => setView('list')}>
              Cancel
            </button>
            <button type="submit" className="rt-primary-btn">
              Save Recipe
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (view === 'detail' && activeRecipe) {
    return (
      <div className="rt-shell">
        <button className="rt-back-btn" onClick={() => setView('list')}>
          ← Back
        </button>
        <h1 className="rt-title">{activeRecipe.name}</h1>

        <section className="rt-section">
          <h2 className="rt-section-title">Ingredients</h2>
          {activeRecipe.ingredients.length === 0 ? (
            <p className="rt-empty">No ingredients added.</p>
          ) : (
            <ul className="rt-detail-list">
              {activeRecipe.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="rt-section">
          <h2 className="rt-section-title">Instructions</h2>
          {activeRecipe.steps.length === 0 ? (
            <p className="rt-empty">No steps added.</p>
          ) : (
            <ol className="rt-detail-list">
              {activeRecipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </section>

        <button
          className="rt-delete-btn"
          onClick={() => deleteRecipe(activeRecipe.id)}
        >
          Delete Recipe
        </button>
      </div>
    )
  }

  // List view (default)
  return (
    <div className="rt-shell">
      <h1 className="rt-title">Recipe Tracker</h1>

      {recipes.length === 0 ? (
        <p className="rt-empty">No recipes yet. Add your first one!</p>
      ) : (
        <ul className="rt-recipe-list">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="rt-recipe-card" onClick={() => openDetail(recipe.id)}>
              <strong className="rt-recipe-name">{recipe.name}</strong>
              <span className="rt-recipe-meta">
                {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''} ·{' '}
                {recipe.steps.length} step{recipe.steps.length !== 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button className="rt-primary-btn rt-new-btn" onClick={startNew}>
        + New Recipe
      </button>
    </div>
  )
}
