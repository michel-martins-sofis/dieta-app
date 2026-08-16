import { useEffect, useState, type FormEvent } from 'react'
import { Dumbbell, Trophy } from 'lucide-react'
import { useWorkouts, type PersonalRecord, type Workout, type WorkoutSet } from '../contexts/WorkoutsContext'
import { todayDateString } from '../contexts/FoodEntriesContext'

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatSet(set: WorkoutSet): string {
  const parts: string[] = []

  if (set.reps !== null) {
    parts.push(`${set.reps} reps`)
  } else if (set.repsMin !== null || set.repsMax !== null) {
    parts.push(`${set.repsMin ?? '?'}-${set.repsMax ?? '?'} reps`)
  }

  if (set.loadKg !== null) {
    parts.push(`${set.loadKg} kg`)
  }

  if (set.setCount !== null) {
    parts.push(`x${set.setCount} séries`)
  }

  if (set.isPr) {
    parts.push('recorde pessoal')
  }

  const label = parts.length > 0 ? parts.join(' · ') : 'sem detalhes registrados'
  return set.notes ? `${label} (${set.notes})` : label
}

export function WorkoutsPage() {
  const { fetchWorkouts, addWorkout, fetchPersonalRecords } = useWorkouts()

  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [workoutDate, setWorkoutDate] = useState(todayDateString())
  const [type, setType] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [workoutsResult, recordsResult] = await Promise.all([fetchWorkouts(), fetchPersonalRecords()])
    if (workoutsResult.error) {
      setError(workoutsResult.error)
    } else if (recordsResult.error) {
      setError(recordsResult.error)
    } else {
      setError(null)
    }
    setWorkouts(workoutsResult.workouts)
    setRecords(recordsResult.records)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAddWorkout(event: FormEvent) {
    event.preventDefault()
    if (!type.trim()) {
      setError('Informe o tipo de treino.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: addError } = await addWorkout({
      workoutDate,
      type: type.trim(),
      durationMinutes: durationMinutes === '' ? null : Number(durationMinutes),
      notes: notes.trim() === '' ? null : notes.trim(),
    })
    setSubmitting(false)
    if (addError) {
      setError(addError)
      return
    }
    setType('')
    setDurationMinutes('')
    setNotes('')
    await loadAll()
  }

  return (
    <div className="page-container">
      <div className="top-bar">
        <h1>Treinos</h1>
      </div>

      <div className="section-card">
        <h2>Registrar treino</h2>
        <form onSubmit={handleAddWorkout}>
          <label htmlFor="workout-date">Data</label>
          <input
            id="workout-date"
            type="date"
            className="date-input"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            required
          />

          <label htmlFor="workout-type">Tipo</label>
          <input
            id="workout-type"
            type="text"
            placeholder="ex: pernas, costas, corrida"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          />

          <label htmlFor="workout-duration">Duração (minutos, opcional)</label>
          <input
            id="workout-duration"
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />

          <label htmlFor="workout-notes">Observações (opcional)</label>
          <input id="workout-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Registrar treino'}
          </button>
        </form>
        <p className="footnote">
          Registro básico por enquanto — exercícios e séries detalhados (como os importados do histórico) só
          aparecem para treinos que já tiverem essa informação.
        </p>
      </div>

      {records.length > 0 && (
        <div className="section-card">
          <h2>Recordes pessoais</h2>
          <ul className="entry-list">
            {records.map((record) => (
              <li key={record.id} className="entry-item">
                <div>
                  <strong>
                    <Trophy size={14} /> {record.exercise}
                  </strong>
                  <span className="entry-meta">
                    {record.loadKg} kg{record.reps ? ` · ${record.reps} rep(s)` : ''}
                    {record.recordDate ? ` · ${formatDateLabel(record.recordDate)}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="section-card">
        <h2>Histórico de treinos</h2>
        {loading ? (
          <p className="footnote">Carregando...</p>
        ) : workouts.length === 0 ? (
          <p className="footnote">Nenhum treino registrado ainda.</p>
        ) : (
          <ul className="entry-list">
            {workouts.map((workout) => (
              <li key={workout.id} className="entry-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="top-bar">
                  <strong>
                    <Dumbbell size={14} /> {workout.type}
                  </strong>
                  <span className="entry-meta">{formatDateLabel(workout.workoutDate)}</span>
                </div>
                {workout.durationMinutes !== null && (
                  <span className="entry-meta">{workout.durationMinutes} min</span>
                )}
                {workout.notes && <p className="footnote">{workout.notes}</p>}
                {workout.exercises.length > 0 && (
                  <details className="chart-table-toggle">
                    <summary>Ver exercícios ({workout.exercises.length})</summary>
                    <ul>
                      {workout.exercises.map((exercise) => (
                        <li key={exercise.id}>
                          <strong>{exercise.name}</strong>
                          <ul>
                            {exercise.sets.map((set) => (
                              <li key={set.id}>{formatSet(set)}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
