# Roadmap

- [ ] Redesign UI: warm "Daybreak" design system, guided 5-step flow, filled icons, cinematic motion
- [ ] Home: hero, how-it-works, searchable role catalog, report teaser
- [ ] Role setup page (level, duration, interviewer character picker) creating the interview via API (mock fallback)
- [ ] VrmCharacter component (three + @pixiv/three-vrm, lipsync from audio track, idle life, states, fallback thumb)
- [ ] /character-test dev page (5 characters, test voice lipsync, state buttons)
- [ ] /interviews/:id/check — mic permission, level meter, say-something test, consent, Start → POST /interviews/{id}/start
- [ ] /interviews/:id/live — character + status chip, captions, timer, mute, End w/ confirm, connection banner, mobile stacking
- [ ] useInterviewSession hook (LiveKit inside only) + mock implementation (VITE_MOCK=true or no backend)
- [ ] /interviews/:id/report — poll every 3s, score, readiness, 5 dimension bars, strengths, gaps, study plan, collapsible transcript, mock fallback
- [ ] /interviews history list
- [ ] Tests for report polling/mock rules, AGENTS.md, memory
