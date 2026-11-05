export type Visibility = 'private' | 'shared'
export type IdeaStatus = 'idea' | 'discussion' | 'selected' | 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'archived'

export type Idea = {
  id: string
  workspace_id: string
  created_by: string
  created_by_name: string
  title: string
  short_description: string
  description: string
  problem_statement: string
  proposed_solution: string
  category: string
  technologies: string[]
  expected_features: string[]
  visibility: Visibility
  status: IdeaStatus
  created_at: string
  updated_at: string
  vote_count: number
  comment_count: number
  voted_by_me: boolean
}

export type Comment = {
  id: string
  idea_id: string
  user_id: string
  author: string
  parent_id: string | null
  content: string
  created_at: string
}

export type Resource = {
  id: string
  workspace_id: string
  created_by: string
  created_by_name: string
  title: string
  url: string
  description: string
  category: string
  tags: string[]
  visibility: Visibility
  related_idea_id: string | null
  created_at: string
  favorite: boolean
}

export type Activity = { id: string; action: string; user: string; entity: string; created_at: string }

export type Task = {
  id: string
  workspace_id: string
  title: string
  description: string
  created_by: string
  created_by_name: string
  assignee_id: string
  assignee_name: string
  status: 'open' | 'completed'
  read_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type WorkspaceData = {
  workspaceId: string
  workspaceName: string
  ideas: Idea[]
  comments: Comment[]
  resources: Resource[]
  tasks: Task[]
  tasksAvailable: boolean
  activity: Activity[]
  selectedIdeaId: string | null
  selectionNote: string
  currentUserId: string
  currentUserName: string
  currentUserRole: 'owner' | 'collaborator'
  collaboratorName: string | null
  collaboratorId: string | null
  activeInvitationId: string | null
  invitationExpiresAt: string | null
}

export const ideaCategories = ['Artificial Intelligence', 'Web Development', 'Mobile Applications', 'SaaS', 'Developer Tools', 'Automation', 'Education', 'Other']
export const resourceCategories = ['AI Tools', 'Documentation', 'APIs', 'UI/UX Inspiration', 'Tutorials', 'Programming', 'Design Resources', 'Useful Websites', 'Other']
export const statusLabels: Record<IdeaStatus, string> = {
  idea: 'Idea', discussion: 'Discussion', selected: 'Selected', planned: 'Planned', in_progress: 'In progress', completed: 'Completed', on_hold: 'On hold', archived: 'Archived',
}
