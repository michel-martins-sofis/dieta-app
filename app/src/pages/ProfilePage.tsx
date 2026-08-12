import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { calculateNutritionGoals, type ActivityLevel, type Goal, type Sex } from '../lib/nutritionGoals'

export function ProfilePage() {
  const { profile, loading, saveProfile } = useProfile()
  const navigate = useNavigate()
  const isEditing = profile !== null
  const [initialized, setInitialized] = useState(false)
  const [age, setAge] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [sex, setSex] = useState<Sex>('female')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary')
  const [goal, setGoal] = useState<Goal>('maintain')
  const [calories, setCalories] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbG, setCarbG] = useState('')
  const [fatG, setFatG] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading || initialized) return
    if (profile) {
      setAge(String(profile.age))
      setWeightKg(String(profile.weightKg))
      setHeightCm(String(profile.heightCm))
      setSex(profile.sex)
      setActivityLevel(profile.activityLevel)
      setGoal(profile.goal)
      setCalories(String(profile.dailyCaloriesTarget))
      setProteinG(String(profile.dailyProteinG))
      setCarbG(String(profile.dailyCarbG))
      setFatG(String(profile.dailyFatG))
    }
    setInitialized(true)
  }, [loading, profile, initialized])

  function handleCalculate() {
    const parsedAge = Number(age)
    const parsedWeight = Number(weightKg)
    const parsedHeight = Number(heightCm)
    if (!parsedAge || !parsedWeight || !parsedHeight) {
      setError('Preencha idade, peso e altura antes de calcular.')
      return
    }
    setError(null)
    const goals = calculateNutritionGoals({
      age: parsedAge,
      weightKg: parsedWeight,
      heightCm: parsedHeight,
      sex,
      activityLevel,
      goal,
    })
    setCalories(String(goals.calories))
    setProteinG(String(goals.proteinG))
    setCarbG(String(goals.carbG))
    setFatG(String(goals.fatG))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    const { error: saveError } = await saveProfile({
      age: Number(age),
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      sex,
      activityLevel,
      goal,
      dailyCaloriesTarget: Number(calories),
      dailyProteinG: Number(proteinG),
      dailyCarbG: Number(carbG),
      dailyFatG: Number(fatG),
    })
    setSubmitting(false)
    if (saveError) {
      setError(saveError)
      return
    }
    if (isEditing) {
      setNotice('Perfil atualizado.')
    } else {
      navigate('/dashboard')
    }
  }

  if (loading || !initialized) {
    return <p className="loading">Carregando...</p>
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Seu perfil</h1>
        <form onSubmit={handleSubmit}>
          <section className="form-section">
            <h2>Dados pessoais</h2>

            <label htmlFor="profile-age">Idade</label>
            <input id="profile-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} required min={1} />

            <label htmlFor="profile-weight">Peso (kg)</label>
            <input id="profile-weight" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} required min={1} step="0.1" />

            <label htmlFor="profile-height">Altura (cm)</label>
            <input id="profile-height" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} required min={1} />

            <label htmlFor="profile-sex">Sexo biológico</label>
            <select id="profile-sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="female">Feminino</option>
              <option value="male">Masculino</option>
            </select>

            <label htmlFor="profile-activity">Nível de atividade física</label>
            <select id="profile-activity" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
              <option value="sedentary">Sedentário</option>
              <option value="light">Leve (1-3x/semana)</option>
              <option value="moderate">Moderado (3-5x/semana)</option>
              <option value="active">Ativo (6-7x/semana)</option>
              <option value="very_active">Muito ativo</option>
            </select>

            <label htmlFor="profile-goal">Objetivo</label>
            <select id="profile-goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
              <option value="lose_weight">Perda de peso</option>
              <option value="gain_muscle">Ganho de massa muscular</option>
              <option value="maintain">Manutenção/saúde geral</option>
            </select>
          </section>

          <section className="form-section">
            <h2>Metas nutricionais</h2>

            <button type="button" className="button button-secondary" onClick={handleCalculate}>
              Calcular meta sugerida
            </button>

            <label htmlFor="profile-calories">Calorias (kcal/dia)</label>
            <input id="profile-calories" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required min={1} />

            <label htmlFor="profile-protein">Proteína (g/dia)</label>
            <input id="profile-protein" type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} required min={0} />

            <label htmlFor="profile-carb">Carboidrato (g/dia)</label>
            <input id="profile-carb" type="number" value={carbG} onChange={(e) => setCarbG(e.target.value)} required min={0} />

            <label htmlFor="profile-fat">Gordura (g/dia)</label>
            <input id="profile-fat" type="number" value={fatG} onChange={(e) => setFatG(e.target.value)} required min={0} />
          </section>

          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}

          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      </div>
    </div>
  )
}
