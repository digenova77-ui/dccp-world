import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { correlation, courseCard, COURSES_SURVEYED, JOBS, METHODS } from '@/dccp/truth/courses'

export const Route = createFileRoute('/pyramid')({ component: Pyramid })

function Pyramid() {
  const [course, setCourse] = useState(1)
  const row = correlation()
  return (
    <main className="story">
      <p className="story-kicker">One at the top</p>
      <h1>Giza, as cards</h1>
      <p className="lede">{row.words}</p>
      <p><a className="story-enter" href="/">Back to the world</a></p>
      <ol className="story-list">
        <li>
          <h2>Apex</h2>
          <p>One stone seeded at the top. The pyramidion is not on the pyramid now. The card is the condition that a source name it. Unfilled.</p>
        </li>
        {JOBS.map(job => (
          <li key={job}>
            <h2>{job}</h2>
            <p>A separate job. Solving it does not solve the next. No source in this record names how this job was done.</p>
          </li>
        ))}
        {METHODS.map(method => (
          <li key={method}>
            <h2>Method</h2>
            <p>{method}</p>
          </li>
        ))}
        <li>
          <h2>Course {course}</h2>
          <p>{courseCard(course)}</p>
          <label className="story-source" htmlFor="course">
            Surveyed courses, 1 to {COURSES_SURVEYED}
          </label>
          <input
            id="course"
            type="range"
            min={1}
            max={COURSES_SURVEYED}
            value={course}
            onChange={event => setCourse(Number(event.target.value))}
          />
        </li>
      </ol>
    </main>
  )
}
