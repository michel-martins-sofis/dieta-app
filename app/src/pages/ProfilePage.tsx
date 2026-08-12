import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { calculateNutritionGoals, type ActivityLevel, type Goal, type Sex } from '../lib/nutritionGoals'

export function ProfilePage() {
  const { profile, saveProfile } = useProfile()
  const navigate = useNavigate()
  const isEditing = profile !== null
  const [age, setAge] = useState(profile ? String(profile.age) : '')
  const [weightKg, setWeightKg] = useState(profile ? String(profile.weightKg) : '')
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : '')
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'female')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel ?? 'sedentary')
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain')
  const [calories, setCalories] = useState(profile ? String(profile.dailyCaloriesTarget) : '')
  const [proteinG, setProteinG] = useState(profile ? String(profile.dailyProteinG) : '')
  const [carbG, setCarbG] = useState(profile ? String(profile.dailyCarbG) : '')
  const [fatG, setFatG] = useState(profile ? String(profile.dailyFatG) : '')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <div>
      <h1>Seu perfil</h1>
      <form onSubmit={handleSubmit}>
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

        <button type="button" onClick={handleCalculate}>
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

        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </div>
  )
}
