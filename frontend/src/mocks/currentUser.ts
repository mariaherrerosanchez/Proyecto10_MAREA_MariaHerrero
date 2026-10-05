export type UserMenuUser = {
  initials: string
  name: string
}

// Presentation-only layout data. Authentication will replace this mock in a future story.
export const currentUserMock: UserMenuUser = {
  name: 'María',
  initials: 'M',
}
