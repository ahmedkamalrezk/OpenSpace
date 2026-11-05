import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon, ArrowDownUp, ArrowRight, ArrowUpRight, Bookmark, Check, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Command, Copy, FileText, Filter, FolderKanban, Globe2, Heart, Home, Lightbulb, Link2, LockKeyhole, LogOut,
  Menu, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings2, Sparkles, Sun, Moon, ThumbsUp, Trash2, Users,
  X, type LucideIcon,
} from 'lucide-react'
import { Glass } from 'glisse'
import { isSupabaseConfigured, supabase } from './supabase'
import { Activity, Comment, Idea, IdeaStatus, Resource, Task, WorkspaceData, ideaCategories, resourceCategories, statusLabels } from './types'

type PageKey = 'dashboard' | 'ideas' | 'myideas' | 'shared' | 'discussions' | 'tasks' | 'next' | 'selected' | 'progress' | 'completed' | 'resources' | 'sharedlinks' | 'favorites' | 'activity' | 'settings'
type SessionUser = { id: string; email?: string; user_metadata?: { display_name?: string } }
type ProjectInfo = { start_date?: string | null; target_date?: string | null; notes?: string | null; github_url?: string | null; demo_url?: string | null }
type StoredData = WorkspaceData & { projectInfo: Record<string, ProjectInfo> }

const now = new Date()
const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString()
const newId = () => window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
const brandIconSrc = `${import.meta.env.BASE_URL}idea-symbol.png`

function makeEmptyData(user?: SessionUser): StoredData {
  return { workspaceId: '', workspaceName: '', ideas: [], comments: [], resources: [], tasks: [], tasksAvailable: true, activity: [], selectedIdeaId: null, selectionNote: '', currentUserId: user?.id ?? '', currentUserName: user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'Workspace member', currentUserRole: 'collaborator', collaboratorName: null, collaboratorId: null, activeInvitationId: null, invitationExpiresAt: null, projectInfo: {} }
}

function makeDemoData(): StoredData {
  const user = 'local-builder'
  const ideas: Idea[] = [
    { id: 'idea-1', workspace_id: 'local-space', created_by: user, created_by_name: 'Alex Morgan', title: 'Prism', short_description: 'A tiny workspace that turns messy research into a clear project brief.', description: 'A focused research companion that gathers links, notes, and decisions into a living brief. Keep the useful context close to the idea while it is still taking shape.', problem_statement: 'Great early ideas lose momentum when their references and decisions get scattered across tabs and chat threads.', proposed_solution: 'Bring the idea, source links, discussion, and next actions into one calm, shared space.', category: 'Developer Tools', technologies: ['React', 'Supabase', 'TypeScript'], expected_features: ['Source capture', 'Decision log', 'Shareable brief'], visibility: 'shared', status: 'in_progress', created_at: ago(6), updated_at: ago(1), vote_count: 8, comment_count: 6, voted_by_me: true },
    { id: 'idea-2', workspace_id: 'local-space', created_by: 'sam-local', created_by_name: 'Sam Rivera', title: 'Good Morning', short_description: 'A gentle, adaptive daily planner for people who build things.', description: 'A daily planning space shaped around energy and focus rather than a long list of tasks.', problem_statement: 'Traditional planners assume every day has the same capacity.', proposed_solution: 'A short daily check-in that creates a kind, realistic plan.', category: 'Productivity', technologies: ['React Native', 'SQLite'], expected_features: ['Energy check-in', 'Flexible focus blocks'], visibility: 'shared', status: 'discussion', created_at: ago(2), updated_at: ago(2), vote_count: 5, comment_count: 3, voted_by_me: false },
    { id: 'idea-3', workspace_id: 'local-space', created_by: user, created_by_name: 'Alex Morgan', title: 'Local First Kit', short_description: 'Practical patterns for apps that feel instant and work offline.', description: 'A starter library and guide for building small collaborative apps with reliable offline behavior.', problem_statement: 'Offline support is hard to get right and easy to postpone.', proposed_solution: 'Reusable sync patterns, clear conflict UX, and a useful starter template.', category: 'Developer Tools', technologies: ['TypeScript', 'IndexedDB'], expected_features: ['Sync queue', 'Conflict examples'], visibility: 'shared', status: 'idea', created_at: ago(4), updated_at: ago(3), vote_count: 3, comment_count: 2, voted_by_me: true },
    { id: 'idea-4', workspace_id: 'local-space', created_by: 'sam-local', created_by_name: 'Sam Rivera', title: 'Little Atlas', short_description: 'A visual library for collecting the places that make you curious.', description: 'A private map and scrapbook for places, trails, cafes, and the stories behind them.', problem_statement: 'Saved places become a noisy list without the context that made them special.', proposed_solution: 'A visual collection with notes, photos, and lightweight sharing.', category: 'Web Development', technologies: ['Next.js', 'Mapbox'], expected_features: ['Collections', 'Notes', 'Shared maps'], visibility: 'shared', status: 'idea', created_at: ago(9), updated_at: ago(8), vote_count: 2, comment_count: 1, voted_by_me: false },
  ]
  const comments: Comment[] = [
    { id: 'c-1', idea_id: 'idea-1', user_id: 'sam-local', author: 'Sam Rivera', parent_id: null, content: 'The brief could start from a single question and grow as we collect sources.', created_at: ago(1) },
    { id: 'c-2', idea_id: 'idea-1', user_id: user, author: 'Alex Morgan', parent_id: null, content: 'Yes — let’s keep the first version focused on links and decisions.', created_at: ago(.8) },
    { id: 'c-3', idea_id: 'idea-2', user_id: user, author: 'Alex Morgan', parent_id: null, content: 'Could the weekly view show patterns without turning into another dashboard?', created_at: ago(1.5) },
    { id: 'c-4', idea_id: 'idea-3', user_id: 'sam-local', author: 'Sam Rivera', parent_id: null, content: 'I would love to see a clean conflict-resolution example.', created_at: ago(3) },
  ]
  const resources: Resource[] = [
    { id: 'r-1', workspace_id: 'local-space', created_by: user, created_by_name: 'Alex Morgan', title: 'Supabase Docs', url: 'https://supabase.com/docs', description: 'Auth, database, realtime, and edge functions.', category: 'Documentation', tags: ['backend', 'docs'], visibility: 'shared', related_idea_id: 'idea-1', created_at: ago(3), favorite: true },
    { id: 'r-2', workspace_id: 'local-space', created_by: 'sam-local', created_by_name: 'Sam Rivera', title: 'Mobbin', url: 'https://mobbin.com', description: 'Real-world mobile and web product patterns.', category: 'UI/UX Inspiration', tags: ['design'], visibility: 'shared', related_idea_id: null, created_at: ago(5), favorite: false },
    { id: 'r-3', workspace_id: 'local-space', created_by: user, created_by_name: 'Alex Morgan', title: 'The Offline Cookbook', url: 'https://offlinefirst.org', description: 'Ideas for resilient, local-first software.', category: 'Useful Websites', tags: ['offline', 'engineering'], visibility: 'private', related_idea_id: 'idea-3', created_at: ago(7), favorite: true },
  ]
  const tasks: Task[] = [
    { id: 'task-1', workspace_id: 'local-space', title: 'Review the first project brief', description: 'Check the outline and leave any notes before our next conversation.', created_by: 'sam-local', created_by_name: 'Sam Rivera', assignee_id: user, assignee_name: 'Alex Morgan', status: 'open', read_at: ago(1), completed_at: null, created_at: ago(1), updated_at: ago(1) },
  ]
  const activity: Activity[] = [
    { id: 'a-1', action: 'commented on', user: 'Sam Rivera', entity: 'Prism', created_at: ago(1) },
    { id: 'a-2', action: 'voted for', user: 'Alex Morgan', entity: 'Local First Kit', created_at: ago(2) },
    { id: 'a-3', action: 'added a new idea', user: 'Sam Rivera', entity: 'Good Morning', created_at: ago(2) },
    { id: 'a-4', action: 'saved a resource', user: 'Alex Morgan', entity: 'Supabase Docs', created_at: ago(3) },
  ]
  return { workspaceId: 'local-space', workspaceName: 'Studio No. 01', ideas, comments, resources, tasks, tasksAvailable: true, activity, selectedIdeaId: 'idea-1', selectionNote: 'Start with a small source library and one clear brief.', currentUserId: user, currentUserName: 'Alex Morgan', currentUserRole: 'owner', collaboratorName: 'Sam Rivera', collaboratorId: 'sam-local', activeInvitationId: null, invitationExpiresAt: null, projectInfo: { 'idea-1': { start_date: ago(6).slice(0, 10), target_date: new Date(now.getTime() + 28 * 86400000).toISOString().slice(0, 10), notes: 'Keep the first release narrow: capture, organize, and turn sources into a brief.', github_url: '', demo_url: '' } } }
}

const demoKey = 'idea-space-demo-v1'
function readDemoData(): StoredData {
  try { const saved = localStorage.getItem(demoKey); if (saved) { const parsed = JSON.parse(saved) as Partial<StoredData>; const defaults = makeDemoData(); return { ...defaults, ...parsed, tasks: parsed.tasks ?? defaults.tasks, collaboratorId: parsed.collaboratorId ?? defaults.collaboratorId } } } catch { /* reset invalid local state */ }
  return makeDemoData()
}

async function loadRemoteData(user: SessionUser): Promise<StoredData> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: workspaceId, error: workspaceError } = await supabase.rpc('ensure_workspace')
  if (workspaceError) throw workspaceError
  if (!workspaceId) throw new Error('No workspace is available for this account yet.')
  const [workspaceRes, ideasRes, commentsRes, votesRes, resourcesRes, favoritesRes, projectRes, activityRes, membersRes, inviteRes, tasksRes] = await Promise.all([
    supabase.from('workspaces').select('name, selected_idea_id, selection_note').eq('id', workspaceId).single(),
    supabase.from('ideas').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('comments').select('*').order('created_at', { ascending: true }),
    supabase.from('votes').select('idea_id, user_id'),
    supabase.from('resources').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('resource_favorites').select('resource_id').eq('user_id', user.id),
    supabase.from('project_details').select('*'),
    supabase.from('activity_logs').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(15),
    supabase.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId),
    supabase.from('invitations').select('id, expires_at').eq('workspace_id', workspaceId).is('used_at', null).is('revoked_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('tasks').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
  ])
  for (const result of [workspaceRes, ideasRes, commentsRes, votesRes, resourcesRes, favoritesRes, projectRes, activityRes, membersRes, inviteRes]) if (result.error) throw result.error
  const tasksAvailable = !tasksRes.error
  if (tasksRes.error && !['42P01', 'PGRST205'].includes(tasksRes.error.code ?? '')) throw tasksRes.error
  const memberRows = membersRes.data ?? []
  const taskRows = tasksAvailable ? tasksRes.data ?? [] : []
  const ownerIds = [...new Set([...(ideasRes.data ?? []).map((x: any) => x.created_by), ...(resourcesRes.data ?? []).map((x: any) => x.created_by), ...(commentsRes.data ?? []).map((x: any) => x.user_id), ...taskRows.flatMap((x: any) => [x.created_by, x.assignee_id]), ...memberRows.map((x: any) => x.user_id), user.id])]
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, display_name').in('id', ownerIds)
  if (profilesError) throw profilesError
  const names = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name || 'Workspace member']))
  const collaborator = memberRows.find((m: any) => m.user_id !== user.id)
  const tasks: Task[] = taskRows.map((row: any) => ({ ...row, created_by_name: names.get(row.created_by) ?? 'Workspace member', assignee_name: names.get(row.assignee_id) ?? 'Workspace member' }))
  const commentRows = commentsRes.data ?? []
  const voteRows = votesRes.data ?? []
  const ideas: Idea[] = (ideasRes.data ?? []).map((row: any) => {
    const ideaComments = commentRows.filter((c: any) => c.idea_id === row.id)
    const votes = voteRows.filter((v: any) => v.idea_id === row.id)
    return { ...row, technologies: row.technologies ?? [], expected_features: row.expected_features ?? [], created_by_name: names.get(row.created_by) ?? 'Workspace member', vote_count: votes.length, comment_count: ideaComments.length, voted_by_me: votes.some((v: any) => v.user_id === user.id) }
  })
  const comments: Comment[] = commentRows.map((c: any) => ({ id: c.id, idea_id: c.idea_id, user_id: c.user_id, author: names.get(c.user_id) ?? 'Workspace member', parent_id: c.parent_id, content: c.content, created_at: c.created_at }))
  const favoriteIds = new Set((favoritesRes.data ?? []).map((f: any) => f.resource_id))
  const resources: Resource[] = (resourcesRes.data ?? []).map((r: any) => ({ ...r, tags: r.tags ?? [], created_by_name: names.get(r.created_by) ?? 'Workspace member', favorite: favoriteIds.has(r.id) }))
  const projectInfo = Object.fromEntries((projectRes.data ?? []).map((p: any) => [p.idea_id, { start_date: p.start_date, target_date: p.target_date, notes: p.notes, github_url: p.github_url, demo_url: p.demo_url }]))
  const activity: Activity[] = (activityRes.data ?? []).map((a: any) => ({ id: a.id, user: names.get(a.user_id) ?? 'Workspace member', action: a.action.replaceAll('_', ' '), entity: a.entity_title ?? 'a shared item', created_at: a.created_at }))
  return { workspaceId, workspaceName: workspaceRes.data?.name ?? 'Studio No. 01', ideas, comments, resources, tasks, tasksAvailable, activity, selectedIdeaId: workspaceRes.data?.selected_idea_id ?? null, selectionNote: workspaceRes.data?.selection_note ?? '', currentUserId: user.id, currentUserName: names.get(user.id) ?? user.email?.split('@')[0] ?? 'You', currentUserRole: memberRows.find((m: any) => m.user_id === user.id)?.role ?? 'collaborator', collaboratorName: collaborator ? names.get(collaborator.user_id) ?? 'Collaborator' : null, collaboratorId: collaborator?.user_id ?? null, activeInvitationId: inviteRes.data?.id ?? null, invitationExpiresAt: inviteRes.data?.expires_at ?? null, projectInfo }
}

function relativeDate(value: string) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}

function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [showLoginIntro, setShowLoginIntro] = useState(false)
  const [introMinimumElapsed, setIntroMinimumElapsed] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery')
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [data, setData] = useState<StoredData>(() => isSupabaseConfigured ? makeEmptyData() : readDemoData())
  const [dataReady, setDataReady] = useState(!isSupabaseConfigured)
  const [page, setPage] = useState<PageKey>('dashboard')
  const [expandedNavGroup, setExpandedNavGroup] = useState('Workspace')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('idea-space-theme-v2') as 'dark' | 'light') || 'light')
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState<'idea' | 'resource' | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [detailIdea, setDetailIdea] = useState<Idea | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [creatorFilter, setCreatorFilter] = useState('Anyone')
  const [visibilityFilter, setVisibilityFilter] = useState('Any visibility')
  const [dateFilter, setDateFilter] = useState('Any time')
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('All categories')
  const [resourceCreatorFilter, setResourceCreatorFilter] = useState('Anyone')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'votes'>('newest')
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteId, setInviteId] = useState<string | null>(null)
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [selectionNote, setSelectionNote] = useState('')

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200) }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('idea-space-theme-v2', theme)
  }, [theme])

  useEffect(() => {
    const group = ['dashboard', 'ideas', 'myideas', 'shared', 'next'].includes(page) ? 'Workspace'
      : ['selected', 'progress', 'completed'].includes(page) ? 'Projects'
      : ['resources', 'sharedlinks', 'favorites'].includes(page) ? 'Resources'
      : page === 'discussions' || page === 'tasks' || page === 'activity' ? 'Collaboration' : null
    if (group) setExpandedNavGroup(group)
    setMobileOpen(false)
  }, [page])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('.search-box input')?.focus()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: sessionData }) => { setUser(sessionData.session?.user ?? null); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_IN') { setShowLoginIntro(true); setIntroMinimumElapsed(false); setLoadError('') }
      if (event === 'SIGNED_OUT') { setShowLoginIntro(false); setIntroMinimumElapsed(false); setLoadError('') }
      setUser(session?.user ?? null)
      setDataReady(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!showLoginIntro) return
    const timer = window.setTimeout(() => setIntroMinimumElapsed(true), 1500)
    return () => window.clearTimeout(timer)
  }, [showLoginIntro])

  useEffect(() => {
    if (showLoginIntro && introMinimumElapsed && dataReady && !loadError) setShowLoginIntro(false)
  }, [showLoginIntro, introMinimumElapsed, dataReady, loadError])

  const reload = useCallback(async () => {
    if (!supabase || !user) return
    setLoadError('')
    setLoading(true)
    try {
      const inviteToken = new URLSearchParams(window.location.search).get('invite')
      if (inviteToken) {
        const { error } = await supabase.rpc('accept_invitation', { p_token: inviteToken })
        if (error) throw error
        window.history.replaceState({}, '', window.location.pathname)
        showToast('You joined the shared workspace.')
      }
      const nextData = await loadRemoteData(user)
      const unreadTasks = nextData.tasks.filter(task => task.assignee_id === user.id && task.status === 'open' && !task.read_at)
      if (unreadTasks.length) {
        const seenAt = new Date().toISOString()
        const { data: readRows, error: readError } = await supabase.from('tasks').update({ read_at: seenAt }).in('id', unreadTasks.map(task => task.id)).eq('assignee_id', user.id).is('read_at', null).select('id')
        if (!readError) {
          const notifiedIds = new Set((readRows ?? []).map((row: { id: string }) => row.id))
          nextData.tasks = nextData.tasks.map(task => notifiedIds.has(task.id) ? { ...task, read_at: seenAt } : task)
          const newlyNotified = unreadTasks.filter(task => notifiedIds.has(task.id))
          if (newlyNotified.length) {
            const message = newlyNotified.length === 1
              ? `New task from ${newlyNotified[0].created_by_name}: ${newlyNotified[0].title}`
              : `${newlyNotified.length} new tasks are waiting for you.`
            showToast(message)
          }
        }
      }
      setData(nextData)
      setSelectionNote(nextData.selectionNote)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load your workspace.'
      setLoadError(message); setData(makeEmptyData(user)); showToast(message)
    } finally { setLoading(false); setDataReady(true) }
  }, [user])

  useEffect(() => { if (user) { setData(makeEmptyData(user)); void reload() } }, [user, reload])

  useEffect(() => {
    if (!supabase || !user) return
    const refresh = () => { if (document.visibilityState === 'visible') void reload() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [reload, user])

  useEffect(() => {
    if (!supabase || !user || !data.workspaceId || data.workspaceId === 'local-space') return
    const channel = supabase.channel(`workspace-${data.workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas', filter: `workspace_id=eq.${data.workspaceId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources', filter: `workspace_id=eq.${data.workspaceId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${data.workspaceId}` }, () => void reload())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `id=eq.${data.workspaceId}` }, () => void reload())
      .subscribe()
    return () => { void supabase?.removeChannel(channel) }
  }, [data.workspaceId, reload, user])

  useEffect(() => { if (!isSupabaseConfigured) localStorage.setItem(demoKey, JSON.stringify(data)) }, [data])
  useEffect(() => { setInviteId(data.activeInvitationId); setInviteExpiresAt(data.invitationExpiresAt) }, [data.activeInvitationId, data.invitationExpiresAt])

  const ideas = useMemo(() => {
    let list = data.ideas
    if (page === 'myideas') list = list.filter(x => x.created_by === data.currentUserId)
    if (page === 'shared' || page === 'sharedlinks') list = list.filter(x => x.visibility === 'shared')
    if (page === 'discussions') list = list.filter(x => x.visibility === 'shared' && x.comment_count > 0)
    if (page === 'selected') list = list.filter(x => x.id === data.selectedIdeaId)
    if (page === 'progress') list = list.filter(x => x.status === 'in_progress')
    if (page === 'completed') list = list.filter(x => x.status === 'completed')
    if (categoryFilter !== 'All categories') list = list.filter(x => x.category === categoryFilter)
    if (statusFilter !== 'All statuses') list = list.filter(x => x.status === statusFilter)
    if (creatorFilter === 'Mine') list = list.filter(x => x.created_by === data.currentUserId)
    if (creatorFilter === 'Collaborator') list = list.filter(x => x.created_by !== data.currentUserId)
    if (visibilityFilter !== 'Any visibility') list = list.filter(x => x.visibility === visibilityFilter.toLowerCase())
    if (dateFilter !== 'Any time') {
      const ageDays = dateFilter === 'Past week' ? 7 : 30
      list = list.filter(x => Date.now() - new Date(x.created_at).getTime() <= ageDays * 86400000)
    }
    const q = query.toLowerCase().trim()
    if (q) list = list.filter(x => [x.title, x.short_description, x.description, x.category, ...x.technologies, ...x.expected_features].join(' ').toLowerCase().includes(q) || data.comments.some(c => c.idea_id === x.id && c.content.toLowerCase().includes(q)))
    return [...list].sort((a, b) => sortOrder === 'votes' ? b.vote_count - a.vote_count : sortOrder === 'oldest' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at))
  }, [data, page, categoryFilter, statusFilter, creatorFilter, visibilityFilter, dateFilter, query, sortOrder])

  const visibleResources = useMemo(() => {
    let list = [...data.resources]
    if (page === 'favorites') list = list.filter(r => r.favorite)
    if (page === 'sharedlinks') list = list.filter(r => r.visibility === 'shared')
    if (resourceCategoryFilter !== 'All categories') list = list.filter(r => r.category === resourceCategoryFilter)
    if (resourceCreatorFilter === 'Mine') list = list.filter(r => r.created_by === data.currentUserId)
    if (resourceCreatorFilter === 'Collaborator') list = list.filter(r => r.created_by !== data.currentUserId)
    const q = query.toLowerCase().trim()
    if (q) list = list.filter(r => [r.title, r.description, r.url, r.category, ...r.tags].join(' ').toLowerCase().includes(q))
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [data.resources, data.currentUserId, page, query, resourceCategoryFilter, resourceCreatorFilter])

  const selectedIdea = data.ideas.find(i => i.id === data.selectedIdeaId) ?? null
  const totalIdeas = data.ideas.length
  const sharedIdeas = data.ideas.filter(i => i.visibility === 'shared').length
  const inProgressCount = data.ideas.filter(i => i.status === 'in_progress').length
  const completedCount = data.ideas.filter(i => i.status === 'completed').length
  const pendingTaskCount = data.tasks.filter(task => task.assignee_id === data.currentUserId && task.status === 'open').length

  async function onSignOut() {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }

  async function saveProfileName(rawName: string) {
    const name = rawName.trim()
    if (!name) { showToast('Enter a display name.'); return }
    if (supabase) {
      const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', user?.id)
      if (error) { showToast(error.message); return }
      await reload()
    } else {
      setData(prev => ({ ...prev, currentUserName: name, ideas: prev.ideas.map(i => i.created_by === prev.currentUserId ? { ...i, created_by_name: name } : i), comments: prev.comments.map(c => c.user_id === prev.currentUserId ? { ...c, author: name } : c), resources: prev.resources.map(r => r.created_by === prev.currentUserId ? { ...r, created_by_name: name } : r), activity: prev.activity.map(a => a.user === prev.currentUserName ? { ...a, user: name } : a) }))
    }
    showToast('Profile updated.')
  }

  async function saveWorkspaceName(rawName: string) {
    const name = rawName.trim()
    if (!name) { showToast('Enter a workspace name.'); return }
    if (data.currentUserRole !== 'owner') { showToast('Only the owner can rename this workspace.'); return }
    if (supabase) {
      const { error } = await supabase.from('workspaces').update({ name }).eq('id', data.workspaceId)
      if (error) { showToast(error.message); return }
    }
    setData(prev => ({ ...prev, workspaceName: name })); showToast('Workspace name updated.')
  }

  async function saveIdeaFromForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') || '').trim()
    if (!title) return
    const existing = editingIdea
    const row: Idea = {
      id: existing?.id ?? newId(), workspace_id: data.workspaceId, created_by: existing?.created_by ?? data.currentUserId,
      created_by_name: existing?.created_by_name ?? data.currentUserName, title,
      short_description: String(form.get('short_description') || ''), description: String(form.get('description') || ''),
      problem_statement: String(form.get('problem_statement') || ''), proposed_solution: String(form.get('proposed_solution') || ''),
      category: String(form.get('category') || 'Other'), technologies: String(form.get('technologies') || '').split(',').map(x => x.trim()).filter(Boolean),
      expected_features: String(form.get('expected_features') || '').split(',').map(x => x.trim()).filter(Boolean),
      visibility: String(form.get('visibility') || 'private') as Idea['visibility'], status: String(form.get('status') || 'idea') as IdeaStatus,
      created_at: existing?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString(),
      vote_count: existing?.vote_count ?? 0, comment_count: existing?.comment_count ?? 0, voted_by_me: existing?.voted_by_me ?? false,
    }
    const info: ProjectInfo = { start_date: String(form.get('start_date') || '') || null, target_date: String(form.get('target_date') || '') || null, notes: String(form.get('project_notes') || ''), github_url: String(form.get('github_url') || '') || null, demo_url: String(form.get('demo_url') || '') || null }
    if (supabase) {
      const { error } = await supabase.from('ideas').upsert({ id: row.id, workspace_id: row.workspace_id, created_by: row.created_by, title: row.title, short_description: row.short_description, description: row.description, problem_statement: row.problem_statement, proposed_solution: row.proposed_solution, category: row.category, technologies: row.technologies, expected_features: row.expected_features, visibility: row.visibility, status: row.status, updated_at: row.updated_at })
      if (error) { showToast(error.message); return }
      if (['selected', 'planned', 'in_progress', 'completed', 'on_hold'].includes(row.status)) {
        const { error: projectError } = await supabase.from('project_details').upsert({ idea_id: row.id, workspace_id: row.workspace_id, ...info })
        if (projectError) { showToast(projectError.message); return }
      }
      await reload()
    } else {
      setData(prev => ({ ...prev, ideas: existing ? prev.ideas.map(i => i.id === row.id ? row : i) : [row, ...prev.ideas], projectInfo: { ...prev.projectInfo, [row.id]: info }, activity: [{ id: newId(), action: existing ? 'updated' : 'created', user: prev.currentUserName, entity: row.title, created_at: new Date().toISOString() }, ...prev.activity] }))
    }
    setModal(null); setEditingIdea(null); setDetailIdea(null); showToast(existing ? 'Idea updated.' : 'Idea added to your space.')
  }

  async function deleteIdea(idea: Idea) {
    if (!window.confirm(`Delete “${idea.title}” and its discussion?`)) return
    if (supabase) {
      const { error } = await supabase.from('ideas').delete().eq('id', idea.id)
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, ideas: prev.ideas.filter(i => i.id !== idea.id), comments: prev.comments.filter(c => c.idea_id !== idea.id), resources: prev.resources.map(r => r.related_idea_id === idea.id ? { ...r, related_idea_id: null } : r), selectedIdeaId: prev.selectedIdeaId === idea.id ? null : prev.selectedIdeaId }))
    setDetailIdea(null); showToast('Idea deleted.')
  }

  async function toggleVote(idea: Idea) {
    if (idea.visibility !== 'shared') return
    if (supabase) {
      const result = idea.voted_by_me ? await supabase.from('votes').delete().eq('idea_id', idea.id).eq('user_id', user?.id) : await supabase.from('votes').insert({ idea_id: idea.id, user_id: user?.id, vote_type: 'upvote' })
      if (result.error) { showToast(result.error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, ideas: prev.ideas.map(i => i.id === idea.id ? { ...i, voted_by_me: !i.voted_by_me, vote_count: i.vote_count + (i.voted_by_me ? -1 : 1) } : i) }))
  }

  async function addComment(idea: Idea, content: string, parentId: string | null) {
    if (idea.visibility !== 'shared' || !content.trim()) return
    if (supabase) {
      const { error } = await supabase.from('comments').insert({ idea_id: idea.id, user_id: user?.id, parent_id: parentId, content: content.trim() })
      if (error) { showToast(error.message); return }
      await reload()
    } else {
      const comment: Comment = { id: newId(), idea_id: idea.id, user_id: data.currentUserId, author: data.currentUserName, parent_id: parentId, content: content.trim(), created_at: new Date().toISOString() }
      setData(prev => ({ ...prev, comments: [...prev.comments, comment], ideas: prev.ideas.map(i => i.id === idea.id ? { ...i, comment_count: i.comment_count + 1 } : i), activity: [{ id: newId(), action: 'commented on', user: prev.currentUserName, entity: idea.title, created_at: new Date().toISOString() }, ...prev.activity] }))
    }
    setReplyTo(null); showToast('Comment added.')
  }

  async function updateComment(comment: Comment, content: string) {
    if (!content.trim()) return
    if (supabase) {
      const { error } = await supabase.from('comments').update({ content: content.trim(), updated_at: new Date().toISOString() }).eq('id', comment.id)
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, comments: prev.comments.map(c => c.id === comment.id ? { ...c, content: content.trim() } : c) }))
    setEditingComment(null); showToast('Comment updated.')
  }

  async function removeComment(comment: Comment) {
    if (!window.confirm('Delete this comment?')) return
    if (supabase) {
      const { error } = await supabase.from('comments').delete().eq('id', comment.id)
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== comment.id && c.parent_id !== comment.id), ideas: prev.ideas.map(i => i.id === comment.idea_id ? { ...i, comment_count: Math.max(0, i.comment_count - 1) } : i) }))
  }

  async function saveResourceFromForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') || '').trim()
    const rawUrl = String(form.get('url') || '').trim()
    let parsed: URL
    try { parsed = new URL(rawUrl); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only web links are supported.') } catch { showToast('Enter a valid http or https link.'); return }
    const existing = editingResource
    const row: Resource = { id: existing?.id ?? newId(), workspace_id: data.workspaceId, created_by: existing?.created_by ?? data.currentUserId, created_by_name: existing?.created_by_name ?? data.currentUserName, title, url: parsed.toString(), description: String(form.get('description') || ''), category: String(form.get('category') || 'Other'), tags: String(form.get('tags') || '').split(',').map(x => x.trim()).filter(Boolean), visibility: String(form.get('visibility') || 'private') as Resource['visibility'], related_idea_id: String(form.get('related_idea_id') || '') || null, created_at: existing?.created_at ?? new Date().toISOString(), favorite: existing?.favorite ?? false }
    if (supabase) {
      const { error } = await supabase.from('resources').upsert({ id: row.id, workspace_id: row.workspace_id, created_by: row.created_by, title: row.title, url: row.url, description: row.description, category: row.category, tags: row.tags, visibility: row.visibility, related_idea_id: row.related_idea_id, updated_at: new Date().toISOString() })
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, resources: existing ? prev.resources.map(r => r.id === row.id ? row : r) : [row, ...prev.resources], activity: [{ id: newId(), action: existing ? 'updated a resource' : 'saved a resource', user: prev.currentUserName, entity: row.title, created_at: new Date().toISOString() }, ...prev.activity] }))
    setModal(null); setEditingResource(null); showToast(existing ? 'Resource updated.' : 'Resource saved.')
  }

  async function createTaskFromForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (supabase && !data.tasksAvailable) { showToast('Task setup is not active in this workspace yet.'); return }
    if (!data.collaboratorId) { showToast('Invite your teammate before assigning a task.'); return }
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') || '').trim()
    const description = String(form.get('description') || '').trim()
    if (!title || title.length > 120 || description.length > 1000) { showToast('Keep the task title under 120 characters and details under 1,000.'); return }
    const task: Task = { id: newId(), workspace_id: data.workspaceId, title, description, created_by: data.currentUserId, created_by_name: data.currentUserName, assignee_id: data.collaboratorId, assignee_name: data.collaboratorName ?? 'Teammate', status: 'open', read_at: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (supabase) {
      const { error } = await supabase.from('tasks').insert({ workspace_id: data.workspaceId, title, description, assignee_id: data.collaboratorId })
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, tasks: [task, ...prev.tasks] }))
    setTaskModalOpen(false)
    showToast(`Task sent to ${task.assignee_name}.`)
  }

  async function completeTask(task: Task) {
    if (task.assignee_id !== data.currentUserId || task.status === 'completed') return
    if (supabase) {
      const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id).eq('assignee_id', data.currentUserId)
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, tasks: prev.tasks.map(item => item.id === task.id ? { ...item, status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : item) }))
    showToast('Task marked as complete.')
  }

  async function toggleFavorite(resource: Resource) {
    if (supabase) {
      const result = resource.favorite ? await supabase.from('resource_favorites').delete().eq('resource_id', resource.id).eq('user_id', user?.id) : await supabase.from('resource_favorites').insert({ resource_id: resource.id, user_id: user?.id })
      if (result.error) { showToast(result.error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, resources: prev.resources.map(r => r.id === resource.id ? { ...r, favorite: !r.favorite } : r) }))
  }

  async function deleteResource(resource: Resource) {
    if (!window.confirm(`Remove “${resource.title}” from your library?`)) return
    if (supabase) {
      const { error } = await supabase.from('resources').delete().eq('id', resource.id)
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, resources: prev.resources.filter(r => r.id !== resource.id) }))
    showToast('Resource removed.')
  }

  async function selectProject(idea: Idea | null, note = selectionNote) {
    if (idea && idea.visibility !== 'shared') { showToast('Only shared ideas can be selected.'); return }
    if (supabase) {
      const { error } = await supabase.rpc('set_next_project', { p_idea_id: idea?.id ?? null, p_note: note })
      if (error) { showToast(error.message); return }
      await reload()
    } else setData(prev => ({ ...prev, selectedIdeaId: idea?.id ?? null, selectionNote: note, ideas: prev.ideas.map(i => i.id === prev.selectedIdeaId ? { ...i, status: 'idea' } : i.id === idea?.id ? { ...i, status: 'selected' } : i), activity: idea ? [{ id: newId(), action: 'selected as the next project', user: prev.currentUserName, entity: idea.title, created_at: new Date().toISOString() }, ...prev.activity] : prev.activity }))
    if (idea) { setPage('selected'); showToast(`${idea.title} is the next project.`) }
  }

  async function inviteCollaborator() {
    if (data.currentUserRole !== 'owner') { showToast('Only the workspace owner can invite a collaborator.'); return }
    if (!supabase) { showToast('Connect Supabase to create a secure invitation.'); return }
    const { data: token, error } = await supabase.rpc('create_invitation', { p_expires_in_days: 7 })
    if (error) { showToast(error.message); return }
    const { data: invitation } = await supabase.from('invitations').select('id, expires_at').eq('workspace_id', data.workspaceId).is('used_at', null).is('revoked_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const link = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(token)}`
    setInviteUrl(link)
    setInviteId(invitation?.id ?? null)
    setInviteExpiresAt(invitation?.expires_at ?? null)
    await navigator.clipboard?.writeText(link)
    showToast('Invitation link copied. It expires in 7 days.')
  }

  async function revokeInvitation() {
    if (!supabase || !inviteId) return
    const { error } = await supabase.rpc('revoke_invitation', { p_invitation_id: inviteId })
    if (error) { showToast(error.message); return }
    setInviteId(null); setInviteUrl(''); setInviteExpiresAt(null); showToast('Invitation link revoked.')
  }

  if (isSupabaseConfigured && passwordRecovery && user) return <PasswordUpdateScreen onComplete={() => { setPasswordRecovery(false); window.history.replaceState({}, '', window.location.pathname) }} />
  if (!authReady) return <div className="loading-screen"><div className="brand-mark large"><img className="brand-symbol" src={brandIconSrc} alt="OpenSpace" /></div><div className="loader" /><span>Opening OpenSpace…</span></div>
  if (isSupabaseConfigured && !user) return <><AuthScreen onToast={showToast} />{toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}</>
  if (isSupabaseConfigured && user && loadError) return <AccessScreen message={loadError} onSignOut={() => void onSignOut()} />
  if (isSupabaseConfigured && user && (!dataReady || showLoginIntro)) return <LoginIntro workspaceName={data.workspaceName} />

  const pageInfo: Record<PageKey, { title: string; eyebrow: string; description: string }> = {
    dashboard: { title: 'A space for what’s next.', eyebrow: 'YOUR STUDIO', description: 'A little clarity for the ideas you’re building together.' },
    ideas: { title: 'Ideas, taking shape.', eyebrow: 'WORKSPACE', description: 'Everything you’re thinking about, in one thoughtful place.' },
    myideas: { title: 'Your ideas.', eyebrow: 'PERSONAL SPACE', description: 'Private thoughts stay yours until you choose to share them.' },
    shared: { title: 'Shared ideas.', eyebrow: 'TOGETHER', description: 'Ideas you and your collaborator can shape together.' },
    next: { title: 'What should we build next?', eyebrow: 'DECISION ROOM', description: 'Compare the ideas that are ready for a closer look.' },
    selected: { title: 'The next project.', eyebrow: 'IN THE MAKING', description: 'One shared idea, now moving toward something real.' },
    progress: { title: 'In progress.', eyebrow: 'PROJECTS', description: 'The work currently moving forward.' },
    completed: { title: 'Made real.', eyebrow: 'PROJECTS', description: 'A small archive of things you brought to life.' },
    resources: { title: 'A library of useful things.', eyebrow: 'RESOURCES', description: 'Links, references, and tools worth keeping close.' },
    sharedlinks: { title: 'Shared links.', eyebrow: 'RESOURCES', description: 'References your little team can return to.' },
    favorites: { title: 'Saved for later.', eyebrow: 'YOUR LIBRARY', description: 'Your personal collection of things worth keeping.' },
    discussions: { title: 'Good conversations, in one place.', eyebrow: 'COLLABORATION', description: 'Shared ideas with new thoughts to talk through.' },
    tasks: { title: 'A little progress, together.', eyebrow: 'TEAM TASKS', description: 'Send a clear next step to your teammate and keep track of what’s done.' },
    activity: { title: 'The little things lately.', eyebrow: 'ACTIVITY', description: 'A private record of ideas moving forward.' },
    settings: { title: 'Your workspace.', eyebrow: 'SETTINGS', description: 'Make this space feel like yours.' },
  }

  const title = pageInfo[page].title

  return (
    <div className="app-shell" data-glisse-backdrop>
      <div className="ambient ambient-a" /><div className="ambient ambient-b" />
      <aside className={`sidebar glass-panel ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><img className="brand-symbol" src={brandIconSrc} alt="" /></div><span>Open<span className="brand-light">Space</span></span><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <button type="button" className="workspace-switch" onClick={() => setPage('settings')} aria-label={`Open settings for ${data.workspaceName}`}><span className="workspace-avatar">{data.workspaceName.slice(0, 1).toUpperCase()}<span className="workspace-status" /></span><span className="workspace-names"><strong>{data.workspaceName}</strong><small><LockKeyhole size={11} /> Private workspace</small></span><ChevronRight size={15} className="workspace-chevron" /></button>
        <nav className="side-nav" aria-label="Main navigation">
          <NavGroup label="Workspace" items={[
            ['dashboard', 'Overview', Home], ['ideas', 'Ideas board', Lightbulb], ['myideas', 'My ideas', LockKeyhole], ['shared', 'Shared ideas', Users], ['next', 'Next project', Sparkles],
          ] as NavItem[]} page={page} onNavigate={setPage} expanded={expandedNavGroup === 'Workspace'} onToggle={() => setExpandedNavGroup(expandedNavGroup === 'Workspace' ? '' : 'Workspace')} />
          <NavGroup label="Projects" items={[
            ['selected', 'Selected', FolderKanban], ['progress', 'In progress', ActivityIcon], ['completed', 'Completed', CheckCircle2],
          ] as NavItem[]} page={page} onNavigate={setPage} expanded={expandedNavGroup === 'Projects'} onToggle={() => setExpandedNavGroup(expandedNavGroup === 'Projects' ? '' : 'Projects')} />
          <NavGroup label="Resources" items={[
            ['resources', 'All links', Link2], ['sharedlinks', 'Shared links', Globe2], ['favorites', 'Favorites', Heart],
          ] as NavItem[]} page={page} onNavigate={setPage} expanded={expandedNavGroup === 'Resources'} onToggle={() => setExpandedNavGroup(expandedNavGroup === 'Resources' ? '' : 'Resources')} />
          <NavGroup label="Collaboration" items={[
            ['tasks', 'Tasks', ClipboardList], ['discussions', 'Discussions', MessageCircle], ['activity', 'Activity', ActivityIcon],
          ] as NavItem[]} page={page} onNavigate={setPage} expanded={expandedNavGroup === 'Collaboration'} onToggle={() => setExpandedNavGroup(expandedNavGroup === 'Collaboration' ? '' : 'Collaboration')} badgeCount={pendingTaskCount} />
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><Settings2 size={17} /><span>Settings</span></button>
          <div className="sidebar-profile"><div className="avatar avatar-self">{data.currentUserName.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><div className="profile-copy"><strong>{data.currentUserName}</strong><small>{isSupabaseConfigured ? user?.email : 'Workspace owner'}</small></div><button className="icon-button logout-button" onClick={isSupabaseConfigured ? onSignOut : () => showToast('This preview is saved on this device.')} aria-label={isSupabaseConfigured ? 'Sign out' : 'Local preview'}>{isSupabaseConfigured ? <LogOut size={16} /> : <MoreHorizontal size={18} />}</button></div>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>{data.workspaceName}</span><ChevronRight size={13} /><strong>{pageInfo[page].eyebrow.toLowerCase()}</strong></div>
          <div className="top-actions">
            <label className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search anything…" /><kbd><Command size={11} /> K</kbd></label>
            <button className="icon-button theme-toggle" aria-label="Switch color theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button className="avatar avatar-self top-avatar" title={data.currentUserName} onClick={() => setPage('settings')}>{data.currentUserName.split(' ').map(x => x[0]).join('').slice(0, 2)}</button>
          </div>
        </header>

        <div className="page-wrap" key={page}>
          <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />{pageInfo[page].eyebrow}</div><h1>{title}</h1><p>{pageInfo[page].description}</p></div><div className="heading-actions">{page === 'tasks' && <button className="primary-button" onClick={() => setTaskModalOpen(true)} disabled={!data.tasksAvailable || !data.collaboratorId} title={!data.tasksAvailable ? 'Task database setup is needed' : !data.collaboratorId ? 'Invite your teammate first' : undefined}><Plus size={16} /> Assign a task</button>}{page === 'dashboard' && <button className="secondary-button header-secondary" onClick={() => { setEditingResource(null); setModal('resource') }}><Plus size={15} /> Add resource</button>}{page === 'resources' || page === 'sharedlinks' || page === 'favorites' ? <button className="primary-button" onClick={() => { setEditingResource(null); setModal('resource') }}><Plus size={16} /> Add resource</button> : page !== 'settings' && page !== 'activity' && page !== 'tasks' && page !== 'selected' && page !== 'progress' && page !== 'completed' && page !== 'next' ? <button className="primary-button" onClick={() => { setEditingIdea(null); setModal('idea') }}><Plus size={16} /> New idea</button> : null}</div></section>

          {!isSupabaseConfigured && <div className="preview-note"><span className="preview-pulse" /> Preview workspace <span>·</span> changes save on this device <button onClick={() => setPage('settings')}>Connect Supabase <ArrowRight size={13} /></button></div>}
          {loading && <div className="sync-strip"><div className="loader small" /> Syncing workspace…</div>}
          {query && <div className="search-context">Showing matches for <strong>“{query}”</strong><button onClick={() => setQuery('')}><X size={13} /> Clear</button></div>}

          {page === 'dashboard' && <Dashboard data={data} selectedIdea={selectedIdea} totalIdeas={totalIdeas} sharedIdeas={sharedIdeas} inProgressCount={inProgressCount} completedCount={completedCount} onNavigate={setPage} onOpenIdea={setDetailIdea} onCreate={() => { setEditingIdea(null); setModal('idea') }} />}
          {['ideas', 'myideas', 'shared', 'discussions', 'selected', 'progress', 'completed', 'next'].includes(page) && (page === 'next' ? <NextProject ideas={data.ideas.filter(i => i.visibility === 'shared')} selected={selectedIdea} onSelect={idea => void selectProject(idea)} onOpen={setDetailIdea} /> : page === 'selected' ? <SelectedProject idea={selectedIdea} info={selectedIdea ? data.projectInfo[selectedIdea.id] : undefined} note={selectionNote} setNote={setSelectionNote} onSaveNote={() => void selectProject(selectedIdea, selectionNote)} onEdit={() => { if (selectedIdea) { setEditingIdea(selectedIdea); setModal('idea') } }} onBrowse={() => setPage('next')} /> : <IdeasBoard ideas={ideas} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} creatorFilter={creatorFilter} setCreatorFilter={setCreatorFilter} visibilityFilter={visibilityFilter} setVisibilityFilter={setVisibilityFilter} dateFilter={dateFilter} setDateFilter={setDateFilter} sortOrder={sortOrder} setSortOrder={setSortOrder} onOpen={setDetailIdea} onVote={idea => void toggleVote(idea)} onSelect={idea => void selectProject(idea)} onNew={() => { setEditingIdea(null); setModal('idea') }} query={query} />)}
          {['resources', 'sharedlinks', 'favorites'].includes(page) && <ResourcesPage resources={visibleResources} ideas={data.ideas} currentUserId={data.currentUserId} categoryFilter={resourceCategoryFilter} setCategoryFilter={setResourceCategoryFilter} creatorFilter={resourceCreatorFilter} setCreatorFilter={setResourceCreatorFilter} onFavorite={resource => void toggleFavorite(resource)} onEdit={resource => { setEditingResource(resource); setModal('resource') }} onDelete={resource => void deleteResource(resource)} onAdd={() => { setEditingResource(null); setModal('resource') }} onToast={showToast} />}
          {page === 'activity' && <ActivityPage activity={data.activity} onOpenIdeas={() => setPage('ideas')} />}
          {page === 'tasks' && <TasksPage tasks={data.tasks} tasksAvailable={data.tasksAvailable} currentUserId={data.currentUserId} currentUserName={data.currentUserName} collaboratorName={data.collaboratorName} onComplete={task => void completeTask(task)} onCreate={() => setTaskModalOpen(true)} hasTeammate={Boolean(data.collaboratorId)} />}
          {page === 'settings' && <SettingsPage data={data} theme={theme} setTheme={setTheme} onInvite={() => void inviteCollaborator()} inviteUrl={inviteUrl} inviteId={inviteId} inviteExpiresAt={inviteExpiresAt} onRevokeInvite={() => void revokeInvitation()} onProfileSave={name => void saveProfileName(name)} onWorkspaceSave={name => void saveWorkspaceName(name)} onToast={showToast} />}
        </div>
      </main>

      {modal === 'idea' && <IdeaModal idea={editingIdea} info={editingIdea ? data.projectInfo[editingIdea.id] : undefined} onClose={() => { setModal(null); setEditingIdea(null) }} onSubmit={saveIdeaFromForm} />}
      {modal === 'resource' && <ResourceModal resource={editingResource} ideas={data.ideas} onClose={() => { setModal(null); setEditingResource(null) }} onSubmit={saveResourceFromForm} />}
      {taskModalOpen && data.tasksAvailable && <TaskModal teammateName={data.collaboratorName ?? 'your teammate'} onClose={() => setTaskModalOpen(false)} onSubmit={createTaskFromForm} />}
      {detailIdea && <IdeaDetail idea={data.ideas.find(i => i.id === detailIdea.id) ?? detailIdea} data={data} currentUserId={data.currentUserId} projectInfo={data.projectInfo[detailIdea.id]} onClose={() => setDetailIdea(null)} onEdit={() => { setEditingIdea(data.ideas.find(i => i.id === detailIdea.id) ?? detailIdea); setModal('idea') }} onDelete={() => void deleteIdea(detailIdea)} onVote={() => void toggleVote(data.ideas.find(i => i.id === detailIdea.id) ?? detailIdea)} onAddComment={content => void addComment(detailIdea, content, replyTo)} onReply={setReplyTo} replyTo={replyTo} onUpdateComment={(comment, content) => void updateComment(comment, content)} onDeleteComment={comment => void removeComment(comment)} editingComment={editingComment} setEditingComment={setEditingComment} />}
      {toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  )
}

type NavItem = [PageKey, string, LucideIcon]
function NavGroup({ label, items, page, onNavigate, expanded, onToggle, badgeCount = 0 }: { label: string; items: NavItem[]; page: PageKey; onNavigate: (page: PageKey) => void; expanded: boolean; onToggle: () => void; badgeCount?: number }) {
  return <div className={`nav-group ${expanded ? 'expanded' : ''}`}><button className="nav-label nav-group-toggle" onClick={onToggle} aria-expanded={expanded}><span>{label}</span><ChevronDown size={13} /></button><div className="nav-group-items" aria-hidden={!expanded}><div className="nav-group-items-inner">{items.map(([key, name, Icon]) => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => onNavigate(key)} disabled={!expanded}><Icon size={17} strokeWidth={page === key ? 2.1 : 1.7} /><span>{name}</span>{key === 'tasks' && badgeCount > 0 && <span className="nav-count">{badgeCount > 9 ? '9+' : badgeCount}</span>}{key === 'next' && <span className="nav-indicator" />}</button>)}</div></div></div>
}

function Dashboard({ data, selectedIdea, totalIdeas, sharedIdeas, inProgressCount, completedCount, onNavigate, onOpenIdea, onCreate }: { data: StoredData; selectedIdea: Idea | null; totalIdeas: number; sharedIdeas: number; inProgressCount: number; completedCount: number; onNavigate: (p: PageKey) => void; onOpenIdea: (i: Idea) => void; onCreate: () => void }) {
  const topIdeas = [...data.ideas].filter(i => i.visibility === 'shared').sort((a, b) => b.vote_count - a.vote_count).slice(0, 3)
  const stats = [
    ['All ideas', totalIdeas, Lightbulb, 'rose'],
    ['My ideas', data.ideas.filter(i => i.created_by === data.currentUserId).length, LockKeyhole, 'blue'],
    ['Shared ideas', sharedIdeas, Users, 'green'],
    ['Saved resources', data.resources.length, Bookmark, 'gold'],
  ] as const
  return <div className="dashboard-grid">
    <section className="stat-row">{stats.map(([label, value, Icon, color]) => <div className="stat-card glass-panel" key={label}><div className={`stat-icon ${color}`}><Icon size={17} /></div><div className="stat-copy"><span>{label}</span><strong>{value.toString().padStart(2, '0')}</strong></div><div className="stat-sparkline"><i /><i /><i /><i /><i /><i /><i /></div></div>)}</section><div className="project-status-strip"><span className="project-strip-title">Project rhythm</span><span><i className="status-dot green-dot" /> {Number(Boolean(selectedIdea))} selected</span><span><i className="status-dot green-dot" /> {inProgressCount} in progress</span><span><i className="status-dot completed-dot" /> {completedCount} completed</span></div>
    <section className="main-column">
      <div className="section-heading"><div><div className="section-kicker"><Sparkles size={13} /> CURRENT FOCUS</div><h2>A good idea deserves a little momentum.</h2></div><button className="text-button" onClick={() => onNavigate('selected')}>Project space <ArrowRight size={14} /></button></div>
      {selectedIdea ? <div className="focus-card glass-panel"><div className="focus-shine" /><div className="focus-top"><div className="focus-label"><span className="status-dot green-dot" /> NEXT PROJECT</div><span className="focus-private"><Users size={12} /> Shared</span></div><div className="focus-body"><div className="focus-symbol"><Glass aria-hidden="true" className="focus-lens" style={{ background: 'none', '--lg-glass-bend': 0.45, '--lg-glass-dispersion': 0.4, '--lg-blur': '0px', '--lg-rim-shine': 0.13 } as React.CSSProperties} /><Sparkles size={23} /></div><div><h3>{selectedIdea.title}</h3><p>{selectedIdea.short_description}</p></div></div><div className="focus-meta"><span><span className="mini-avatar">{selectedIdea.created_by_name.split(' ').map(n => n[0]).join('')}</span>{selectedIdea.created_by_name}</span><span><MessageCircle size={14} /> {selectedIdea.comment_count} conversations</span><span><ThumbsUp size={14} /> {selectedIdea.vote_count} votes</span></div><div className="focus-bottom"><div className="progress-caption"><span>Project pulse</span><strong>{selectedIdea.status === 'in_progress' ? 'In progress' : 'Just getting started'}</strong></div><div className="progress-track"><span style={{ width: selectedIdea.status === 'in_progress' ? '42%' : '18%' }} /></div><button className="focus-open" onClick={() => onOpenIdea(selectedIdea)} aria-label="Open selected project"><ArrowUpRight size={18} /></button></div></div> : <div className="empty-card glass-panel"><Sparkles size={24} /><h3>Choose your next project</h3><p>Pick a shared idea and give it a little momentum.</p><button className="secondary-button" onClick={() => onNavigate('next')}>Explore ideas <ArrowRight size={14} /></button></div>}
      <div className="section-heading compact"><div><div className="section-kicker"><Lightbulb size={13} /> THE IDEA BOARD</div><h2>Ideas with a little spark</h2></div><button className="text-button" onClick={() => onNavigate('ideas')}>View all <ArrowRight size={14} /></button></div>
      <div className="mini-idea-list">{topIdeas.map((idea, i) => <button className="mini-idea glass-panel" key={idea.id} onClick={() => onOpenIdea(idea)}><span className={`rank rank-${i + 1}`}>0{i + 1}</span><span className="mini-idea-main"><strong>{idea.title}</strong><small>{idea.short_description}</small></span><span className="mini-idea-category">{idea.category}</span><span className="mini-idea-votes"><ThumbsUp size={13} />{idea.vote_count}</span><ArrowUpRight size={15} className="mini-arrow" /></button>)}</div>
    </section>
    <aside className="right-column">
      <div className="widget-card glass-panel people-card"><div className="widget-heading"><div><div className="section-kicker">YOUR LITTLE TEAM</div><h3>Building, together.</h3></div><button className="icon-button tiny" onClick={() => onNavigate('settings')}><MoreHorizontal size={17} /></button></div><div className="member-row"><div className="avatar avatar-self">{data.currentUserName.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><div className="member-copy"><strong>{data.currentUserName}</strong><span>Workspace {data.currentUserRole}</span></div><i className="online-dot" /></div><div className="member-row"><div className="avatar avatar-sam">{data.collaboratorName ? data.collaboratorName.split(' ').map(x => x[0]).join('').slice(0, 2) : '+'}</div><div className="member-copy"><strong>{data.collaboratorName ?? 'Collaborator seat'}</strong><span>{data.collaboratorName ? 'Collaborator' : 'Invite one person'}</span></div>{data.collaboratorName && <i className="online-dot" />}</div><button className="invite-link" onClick={() => onNavigate('settings')}><Plus size={14} /> Invite your collaborator</button></div>
      <div className="widget-card glass-panel activity-widget"><div className="widget-heading"><div><div className="section-kicker">RECENTLY</div><h3>Little updates</h3></div><button className="text-button small-text" onClick={() => onNavigate('activity')}>See all <ArrowRight size={13} /></button></div><div className="activity-list">{data.activity.slice(0, 4).map((item, i) => <div className="activity-item" key={item.id}><div className={`activity-marker marker-${i % 4}`}>{i === 0 ? <MessageCircle size={12} /> : i === 1 ? <ThumbsUp size={12} /> : i === 2 ? <Lightbulb size={12} /> : <Bookmark size={12} />}</div><div className="activity-copy"><p><strong>{item.user}</strong> {item.action} <b>{item.entity}</b></p><small>{relativeDate(item.created_at)}</small></div></div>)}</div></div>
      <div className="quote-card"><div className="quote-glow" /><div className="quote-mark">“</div><p>The best ideas don’t shout.<br />They keep showing up.</p><span>A little reminder for today</span><div className="quote-orb" /></div>
      <button className="quick-create" onClick={onCreate}><div className="quick-plus"><Plus size={18} /></div><div><strong>A new thought?</strong><span>Give it a place to land.</span></div><ArrowRight size={16} /></button>
    </aside>
  </div>
}

function IdeasBoard({ ideas, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, creatorFilter, setCreatorFilter, visibilityFilter, setVisibilityFilter, dateFilter, setDateFilter, sortOrder, setSortOrder, onOpen, onVote, onSelect, onNew, query }: { ideas: Idea[]; categoryFilter: string; setCategoryFilter: (s: string) => void; statusFilter: string; setStatusFilter: (s: string) => void; creatorFilter: string; setCreatorFilter: (s: string) => void; visibilityFilter: string; setVisibilityFilter: (s: string) => void; dateFilter: string; setDateFilter: (s: string) => void; sortOrder: 'newest' | 'oldest' | 'votes'; setSortOrder: (s: 'newest' | 'oldest' | 'votes') => void; onOpen: (i: Idea) => void; onVote: (i: Idea) => void; onSelect: (i: Idea) => void; onNew: () => void; query: string }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const activeAdvancedCount = [creatorFilter !== 'Anyone', visibilityFilter !== 'Any visibility', dateFilter !== 'Any time'].filter(Boolean).length
  return <section className="content-panel glass-panel board-panel"><div className="board-toolbar"><div className="board-count"><span className="count-orb"><Lightbulb size={16} /></span><span><strong>{ideas.length}</strong> {ideas.length === 1 ? 'idea' : 'ideas'} <small>in this view</small></span></div><div className="filters"><label className="select-wrap"><Filter size={14} /><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>All categories</option>{ideaCategories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={13} /></label><label className="select-wrap"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All statuses</option>{Object.entries(statusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><ChevronDown size={13} /></label><button className={showAdvanced ? "more-filters open" : "more-filters"} onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced}><Filter size={14} /><span>More filters</span>{activeAdvancedCount > 0 && <b>{activeAdvancedCount}</b>}<ChevronDown size={13} /></button>{showAdvanced && <div className="advanced-filters"><label className="select-wrap"><select aria-label="Creator" value={creatorFilter} onChange={e => setCreatorFilter(e.target.value)}><option>Anyone</option><option>Mine</option><option>Collaborator</option></select><ChevronDown size={13} /></label><label className="select-wrap"><select aria-label="Visibility" value={visibilityFilter} onChange={e => setVisibilityFilter(e.target.value)}><option>Any visibility</option><option value="private">Private</option><option value="shared">Shared</option></select><ChevronDown size={13} /></label><label className="select-wrap"><select aria-label="Date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}><option>Any time</option><option>Past week</option><option>Past month</option></select><ChevronDown size={13} /></label></div>}<button className="sort-button" onClick={() => setSortOrder(sortOrder === 'newest' ? 'votes' : sortOrder === 'votes' ? 'oldest' : 'newest')}><ArrowDownUp size={14} /> {sortOrder === 'newest' ? 'Newest' : sortOrder === 'votes' ? 'Most voted' : 'Oldest'}</button></div></div>
    {ideas.length ? <div className="idea-grid">{ideas.map((idea, i) => <IdeaCard key={idea.id} idea={idea} index={i} onOpen={() => onOpen(idea)} onVote={() => onVote(idea)} onSelect={() => onSelect(idea)} />)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><h3>{query ? 'Nothing found just yet.' : 'A little room for your first idea.'}</h3><p>{query ? 'Try a different search or clear the filters.' : 'Start with a rough thought. You can shape it later.'}</p><button className="primary-button" onClick={onNew}><Plus size={15} /> Create an idea</button></div>}
  </section>
}

function IdeaCard({ idea, index, onOpen, onVote, onSelect }: { idea: Idea; index: number; onOpen: () => void; onVote: () => void; onSelect: () => void }) {
  const hue = ['lavender', 'mint', 'peach', 'sky'][index % 4]
  return <article className="idea-card glass-panel"><div className="idea-card-top"><span className={`idea-art ${hue}`}><Sparkles size={18} /></span><div className="idea-actions"><span className={`visibility-tag ${idea.visibility}`} title={idea.visibility}><span>{idea.visibility === 'shared' ? <Users size={11} /> : <LockKeyhole size={11} />}</span>{idea.visibility}</span><button className="icon-button tiny" onClick={onOpen} aria-label="Open idea"><MoreHorizontal size={16} /></button></div></div><button className="idea-title-button" onClick={onOpen}><h3>{idea.title}</h3></button><p className="idea-summary">{idea.short_description || idea.description || 'A new thought, ready to take shape.'}</p><div className="idea-tags"><span className="category-pill">{idea.category || 'Other'}</span>{idea.technologies.slice(0, 2).map(tag => <span className="tech-pill" key={tag}>{tag}</span>)}{idea.technologies.length > 2 && <span className="tech-more">+{idea.technologies.length - 2}</span>}</div><div className="idea-card-bottom"><button className="creator-chip" onClick={onOpen}><span className={`tiny-avatar ${idea.created_by_name === 'Sam Rivera' ? 'sam' : ''}`}>{idea.created_by_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>{idea.created_by_name.split(' ')[0]}</button><div className="idea-card-meta"><button className={`meta-action ${idea.voted_by_me ? 'voted' : ''}`} onClick={e => { e.stopPropagation(); onVote() }} disabled={idea.visibility !== 'shared'}><ThumbsUp size={14} /> {idea.vote_count}</button><span className="meta-action"><MessageCircle size={14} /> {idea.comment_count}</span></div></div><div className="idea-card-footer"><span className={`status-label status-${idea.status}`}>{statusLabels[idea.status]}</span><span className="card-date">{relativeDate(idea.created_at)}</span></div>{idea.visibility === 'shared' && <button className="select-idea" onClick={onSelect} title="Select as next project"><ArrowUpRight size={14} /></button>}</article>
}

function NextProject({ ideas, selected, onSelect, onOpen }: { ideas: Idea[]; selected: Idea | null; onSelect: (i: Idea) => void; onOpen: (i: Idea) => void }) {
  const sorted = [...ideas].sort((a, b) => b.vote_count - a.vote_count)
  return <div className="next-layout"><section className="content-panel glass-panel next-list"><div className="next-list-heading"><div><div className="section-kicker"><Sparkles size={13} /> THE SHORTLIST</div><h2>Worth a closer look</h2></div><span className="muted-count">{sorted.length} shared ideas</span></div>{sorted.length ? sorted.map((idea, i) => <div className={`candidate-row ${idea.id === selected?.id ? 'chosen' : ''}`} key={idea.id}><div className={`candidate-rank ${i === 0 ? 'first-rank' : ''}`}>{String(i + 1).padStart(2, '0')}</div><button className="candidate-main" onClick={() => onOpen(idea)}><strong>{idea.title}</strong><span>{idea.short_description}</span><small>{idea.category} <i /> {idea.created_by_name}</small></button><div className="candidate-votes"><ThumbsUp size={14} /><strong>{idea.vote_count}</strong><span>votes</span></div>{idea.id === selected?.id ? <span className="selected-badge"><Check size={13} /> Selected</span> : <button className="choose-button" onClick={() => onSelect(idea)}>Choose this <ArrowRight size={13} /></button>}</div>) : <div className="empty-state"><h3>Nothing shared yet.</h3><p>Share an idea to bring it into the decision room.</p></div>}</section><aside className="selection-aside glass-panel"><div className="selection-orbit"><div><Sparkles size={23} /></div></div><span className="section-kicker">A GOOD NEXT STEP</span><h3>Voting helps.<br />A conversation decides.</h3><p>Pick a shared idea that feels right for both of you. Your choice is easy to change as priorities move.</p><div className="selection-rule"><span>01</span><span>Votes are a signal, not a verdict.</span></div><div className="selection-rule"><span>02</span><span>Only one next project at a time.</span></div></aside></div>
}

function SelectedProject({ idea, info, note, setNote, onSaveNote, onEdit, onBrowse }: { idea: Idea | null; info?: ProjectInfo; note: string; setNote: (s: string) => void; onSaveNote: () => void; onEdit: () => void; onBrowse: () => void }) {
  if (!idea) return <div className="empty-state panel-empty glass-panel"><div className="empty-icon"><FolderKanban size={20} /></div><h3>No project selected yet.</h3><p>Choose a shared idea and give it a place to grow.</p><button className="primary-button" onClick={onBrowse}>Explore the shortlist <ArrowRight size={14} /></button></div>
  return <div className="project-layout"><section className="project-overview glass-panel"><div className="project-cover"><div className="cover-orb orb-one" /><div className="cover-orb orb-two" /><div className="cover-symbol"><Sparkles size={28} /></div><span className="cover-caption">PROJECT 01 · SHARED STUDIO</span><button className="cover-edit" onClick={onEdit}><Settings2 size={14} /> Edit project</button></div><div className="project-content"><div className="project-status-row"><span className={`status-label status-${idea.status}`}>{statusLabels[idea.status]}</span><span className="project-category">{idea.category}</span></div><h2>{idea.title}</h2><p>{idea.short_description}</p><div className="project-meta-grid"><div><span>Started</span><strong>{info?.start_date ? new Date(`${info.start_date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</strong></div><div><span>Target date</span><strong>{info?.target_date ? new Date(`${info.target_date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</strong></div><div><span>Project owners</span><strong className="owners-inline"><span className="tiny-avatar">{idea.created_by_name.split(' ').map(n => n[0]).join('')}</span> + 1</strong></div></div><div className="project-progress"><div><span>Project pulse</span><b>{idea.status === 'in_progress' ? 'Moving along' : 'Ready to begin'}</b></div><div className="progress-track"><span style={{ width: idea.status === 'in_progress' ? '42%' : idea.status === 'completed' ? '100%' : '18%' }} /></div></div><div className="project-links">{info?.github_url ? <a href={info.github_url} target="_blank" rel="noreferrer"><Command size={15} /> Repository <ArrowUpRight size={13} /></a> : <button onClick={onEdit}><Command size={15} /> Add repository <Plus size={13} /></button>}{info?.demo_url ? <a href={info.demo_url} target="_blank" rel="noreferrer"><Globe2 size={15} /> Live demo <ArrowUpRight size={13} /></a> : <button onClick={onEdit}><Globe2 size={15} /> Add live demo <Plus size={13} /></button>}</div></div></section><aside className="project-side"><div className="project-notes glass-panel"><div className="widget-heading"><div><div className="section-kicker">A NOTE TO SELF</div><h3>Keep the thread.</h3></div><FileText size={16} className="muted" /></div><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What feels important to remember?" /><button className="save-note" onClick={onSaveNote}><Check size={14} /> Save note</button></div><div className="project-details glass-panel"><div className="section-kicker">A LITTLE CONTEXT</div><p>{idea.description || idea.short_description}</p>{idea.problem_statement && <div className="context-pair"><small>The problem</small><span>{idea.problem_statement}</span></div>}{idea.proposed_solution && <div className="context-pair"><small>The approach</small><span>{idea.proposed_solution}</span></div>}<div className="project-tech">{idea.technologies.map(t => <span key={t}>{t}</span>)}</div></div></aside></div>
}

function ResourcesPage({ resources, ideas, currentUserId, categoryFilter, setCategoryFilter, creatorFilter, setCreatorFilter, onFavorite, onEdit, onDelete, onAdd, onToast }: { resources: Resource[]; ideas: Idea[]; currentUserId: string; categoryFilter: string; setCategoryFilter: (s: string) => void; creatorFilter: string; setCreatorFilter: (s: string) => void; onFavorite: (r: Resource) => void; onEdit: (r: Resource) => void; onDelete: (r: Resource) => void; onAdd: () => void; onToast: (s: string) => void }) {
  const copy = async (url: string) => { await navigator.clipboard?.writeText(url); onToast('Link copied to clipboard.') }
  return <section className="content-panel glass-panel resources-panel"><div className="board-toolbar resource-toolbar"><div className="board-count"><span className="count-orb lavender-count"><Bookmark size={15} /></span><span><strong>{resources.length}</strong> saved {resources.length === 1 ? 'resource' : 'resources'} <small>in your library</small></span></div><div className="filters"><label className="select-wrap"><Filter size={14} /><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>All categories</option>{resourceCategories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={13} /></label><label className="select-wrap"><select aria-label="Creator" value={creatorFilter} onChange={e => setCreatorFilter(e.target.value)}><option>Anyone</option><option>Mine</option><option>Collaborator</option></select><ChevronDown size={13} /></label></div></div>{resources.length ? <div className="resource-grid">{resources.map(resource => { const linked = ideas.find(i => i.id === resource.related_idea_id); return <article className="resource-card glass-panel" key={resource.id}><div className="resource-card-top"><div className="resource-domain-icon"><Globe2 size={16} /></div><div className="resource-actions"><button className={`icon-button tiny ${resource.favorite ? 'favorite-active' : ''}`} onClick={() => onFavorite(resource)} aria-label={resource.favorite ? 'Remove favorite' : 'Add favorite'}><Heart size={15} fill={resource.favorite ? 'currentColor' : 'none'} /></button>{resource.created_by === currentUserId && <button className="icon-button tiny" onClick={() => onEdit(resource)} aria-label="Edit resource"><MoreHorizontal size={16} /></button>}</div></div><a className="resource-title" href={resource.url} target="_blank" rel="noreferrer">{resource.title}<ArrowUpRight size={13} /></a><div className="resource-url">{new URL(resource.url).hostname}</div><p>{resource.description || 'A useful link for your next good idea.'}</p><div className="resource-tags"><span className="category-pill">{resource.category}</span>{resource.tags.slice(0, 2).map(t => <span className="tech-pill" key={t}>#{t}</span>)}</div>{linked && <button className="related-idea" onClick={() => onToast(`Related to ${linked.title}`)}><Lightbulb size={12} /> {linked.title}</button>}<div className="resource-footer"><span className={`visibility-tag ${resource.visibility}`}><span>{resource.visibility === 'shared' ? <Users size={10} /> : <LockKeyhole size={10} />}</span>{resource.visibility}</span><span className="resource-footer-actions"><button className="icon-button tiny" onClick={() => void copy(resource.url)} aria-label="Copy link"><Copy size={14} /></button>{resource.created_by === currentUserId && <button className="icon-button tiny danger-hover" onClick={() => onDelete(resource)} aria-label="Delete resource"><Trash2 size={14} /></button>}<a className="icon-button tiny" href={resource.url} target="_blank" rel="noreferrer" aria-label="Open link"><ArrowUpRight size={14} /></a></span></div></article>})}<button className="add-resource-card" onClick={onAdd}><div><Plus size={19} /></div><strong>Keep something useful.</strong><span>Save a link for later.</span></button></div> : <div className="empty-state"><div className="empty-icon"><Bookmark size={19} /></div><h3>Your library starts with one good link.</h3><p>Save a reference, an API, or anything you want close by.</p><button className="primary-button" onClick={onAdd}><Plus size={15} /> Add a resource</button></div>}</section>
}

function TasksPage({ tasks, tasksAvailable, currentUserId, currentUserName, collaboratorName, onComplete, onCreate, hasTeammate }: { tasks: Task[]; tasksAvailable: boolean; currentUserId: string; currentUserName: string; collaboratorName: string | null; onComplete: (task: Task) => void; onCreate: () => void; hasTeammate: boolean }) {
  const [view, setView] = useState<'inbox' | 'sent'>('inbox')
  const incoming = tasks.filter(task => task.assignee_id === currentUserId).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const outgoing = tasks.filter(task => task.created_by === currentUserId).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const visibleTasks = view === 'inbox' ? incoming : outgoing
  const openIncoming = incoming.filter(task => task.status === 'open').length
  const openOutgoing = outgoing.filter(task => task.status === 'open').length
  const completed = tasks.filter(task => task.status === 'completed').length
  return <div className="tasks-layout">
    <section className="tasks-panel glass-panel">
      <div className="tasks-summary"><div className="task-summary-icon"><ClipboardList size={18} /></div><div><div className="section-kicker">A SHARED TO-DO LIST</div><h2>Small steps, moving forward.</h2><p>Assign a clear next step. Your teammate can mark it done when it’s finished.</p></div><div className="task-total"><strong>{tasks.length.toString().padStart(2, '0')}</strong><span>Total tasks</span></div></div>
      <div className="task-stats"><div><span>Assigned to you</span><strong>{openIncoming.toString().padStart(2, '0')}<small> open</small></strong></div><div><span>Waiting on teammate</span><strong>{openOutgoing.toString().padStart(2, '0')}<small> open</small></strong></div><div><span>Completed together</span><strong>{completed.toString().padStart(2, '0')}</strong></div></div>
      <div className="task-tabs" role="tablist" aria-label="Task lists"><button role="tab" aria-selected={view === 'inbox'} className={view === 'inbox' ? 'active' : ''} onClick={() => setView('inbox')}><span>Assigned to me</span><b>{incoming.length}</b></button><button role="tab" aria-selected={view === 'sent'} className={view === 'sent' ? 'active' : ''} onClick={() => setView('sent')}><span>Assigned by me</span><b>{outgoing.length}</b></button></div>
      {!tasksAvailable && <div className="task-setup-notice" role="status"><LockKeyhole size={15} /><span>Task sharing needs one database setup step before it can be used. Your workspace is still available while that setup is pending.</span></div>}
      {tasksAvailable && (visibleTasks.length ? <div className="task-list">{visibleTasks.map(task => <article className={`task-card ${task.status === 'completed' ? 'is-complete' : ''}`} key={task.id}><div className="task-card-top"><span className={`task-status ${task.status}`}><i />{task.status === 'completed' ? 'Completed' : 'Open'}</span><span>{relativeDate(task.created_at)}</span></div><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="task-card-bottom"><div className="task-assignment"><span className={`tiny-avatar ${task.created_by === currentUserId ? '' : 'sam'}`}>{(view === 'inbox' ? task.created_by_name : task.assignee_name).split(' ').map(part => part[0]).join('').slice(0, 2)}</span><span>{view === 'inbox' ? `From ${task.created_by_name}` : `For ${task.assignee_name}`}</span></div>{task.status === 'completed' ? <span className="task-done"><CheckCircle2 size={14} /> Done{task.completed_at ? ` · ${relativeDate(task.completed_at)}` : ''}</span> : task.assignee_id === currentUserId ? <button className="task-complete-button" onClick={() => onComplete(task)}><Check size={14} /> Mark complete</button> : <span className="task-waiting"><span /> Waiting on {task.assignee_name}</span>}</div></article>)}</div> : <div className="task-empty"><div className="task-empty-icon"><CheckCircle2 size={19} /></div><h3>{view === 'inbox' ? 'Nothing on your plate yet.' : 'No tasks sent yet.'}</h3><p>{view === 'inbox' ? 'New tasks from your teammate will appear here.' : hasTeammate ? 'Give your teammate a clear next step when you’re ready.' : 'Invite your teammate to start assigning tasks.'}</p>{view === 'sent' && hasTeammate && <button className="primary-button" onClick={onCreate}><Plus size={15} /> Assign a task</button>}</div>)}
    </section>
    <aside className="task-aside"><section className="task-guidance glass-panel"><div className="task-guidance-icon"><Sparkles size={17} /></div><div className="section-kicker">A GOOD HANDOFF</div><h3>Make the next step easy to start.</h3><p>Tasks are shared with your teammate as soon as you send them. When they finish one, its status updates for both of you.</p><div className="task-guidance-rule"><span>01</span><span>Keep the title clear and specific.</span></div><div className="task-guidance-rule"><span>02</span><span>Mark it complete when the work is done.</span></div></section><section className="task-person-card glass-panel"><div className="section-kicker">YOUR TASK PARTNER</div><div className="task-partner-row"><div className="avatar avatar-self">{currentUserName.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><strong>{currentUserName}</strong><span>You</span></div></div>{collaboratorName && <div className="task-partner-row"><div className="avatar avatar-sam">{collaboratorName.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><strong>{collaboratorName}</strong><span>Teammate</span></div></div>}</section></aside>
  </div>
}

function TaskModal({ teammateName, onClose, onSubmit }: { teammateName: string; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return <Modal onClose={onClose} className="form-modal task-form-modal"><div className="modal-heading"><div className="modal-symbol task-modal-symbol"><ClipboardList size={18} /></div><div><div className="section-kicker">TEAM TASK</div><h2>Pass along a next step.</h2><p>Your teammate will see it the next time they open OpenSpace.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><form onSubmit={onSubmit} className="modal-form"><label className="field-label">Task title <span>*</span><input name="title" required maxLength={120} autoFocus placeholder="What needs to get done?" /></label><label className="field-label">A little context<textarea name="description" rows={3} maxLength={1000} placeholder="Add details that will help your teammate get started." /></label><div className="task-recipient"><span>Assigned to</span><strong><Users size={14} /> {teammateName}</strong></div><div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Send size={14} /> Send task</button></div></form></Modal>
}

function ActivityPage({ activity, onOpenIdeas }: { activity: Activity[]; onOpenIdeas: () => void }) {
  return <section className="activity-page glass-panel"><div className="activity-page-heading"><span className="count-orb"><ActivityIcon size={15} /></span><div><h2>A little progress, every day.</h2><p>Only activity you have permission to see appears here.</p></div></div>{activity.length ? <div className="timeline">{activity.map((item, i) => <div className="timeline-row" key={item.id}><div className={`timeline-icon marker-${i % 4}`}>{item.action.includes('comment') ? <MessageCircle size={13} /> : item.action.includes('vot') ? <ThumbsUp size={13} /> : item.action.includes('idea') ? <Lightbulb size={13} /> : <Bookmark size={13} />}</div><div className="timeline-copy"><p><strong>{item.user}</strong> {item.action} <b>{item.entity}</b></p><span>{relativeDate(item.created_at)}</span></div><ArrowUpRight size={15} className="muted" /></div>)}</div> : <div className="empty-state"><h3>Nothing new yet.</h3><p>Your shared workspace updates will show up here.</p><button className="secondary-button" onClick={onOpenIdeas}>Visit the idea board</button></div>}</section>
}

function SettingsPage({ data, theme, setTheme, onInvite, inviteUrl, inviteId, inviteExpiresAt, onRevokeInvite, onProfileSave, onWorkspaceSave, onToast }: { data: StoredData; theme: 'dark' | 'light'; setTheme: (v: 'dark' | 'light') => void; onInvite: () => void; inviteUrl: string; inviteId: string | null; inviteExpiresAt: string | null; onRevokeInvite: () => void; onProfileSave: (name: string) => void; onWorkspaceSave: (name: string) => void; onToast: (s: string) => void }) {
  const [profileName, setProfileName] = useState(data.currentUserName)
  const [workspaceName, setWorkspaceName] = useState(data.workspaceName)
  useEffect(() => { setProfileName(data.currentUserName); setWorkspaceName(data.workspaceName) }, [data.currentUserName, data.workspaceName])
  return <div className="settings-grid"><section className="settings-card glass-panel"><div className="settings-card-heading"><div className="settings-symbol"><Users size={18} /></div><div><h2>Your little team</h2><p>Private by default, shared when you choose.</p></div></div><form className="settings-edit-row" onSubmit={e => { e.preventDefault(); onProfileSave(profileName) }}><label className="field-label">Display name<input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={60} /></label><button className="secondary-button" type="submit">Save profile</button></form><div className="setting-member"><div className="avatar avatar-self">{data.currentUserName.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><div><strong>{data.currentUserName}</strong><span>{data.currentUserRole === 'owner' ? 'Owner · can manage this workspace' : 'Collaborator'}</span></div><span className="member-state">You</span></div><div className="setting-member"><div className="avatar avatar-sam">{data.collaboratorName ? data.collaboratorName.split(' ').map(x => x[0]).join('').slice(0, 2) : '+'}</div><div><strong>{data.collaboratorName ?? 'Collaborator seat'}</strong><span>{data.collaboratorName ? 'Collaborator · can view shared items' : isSupabaseConfigured ? 'Invite one person to join' : 'Available when Supabase is connected'}</span></div><span className="member-state pending">{data.collaboratorName ? 'Joined' : 'Open'}</span></div><button className="primary-button invite-button" onClick={onInvite} disabled={data.currentUserRole !== 'owner' || Boolean(data.collaboratorName)}><Plus size={15} /> Create invitation link</button>{inviteId && <div className="invite-result"><span>{inviteUrl || (inviteExpiresAt ? ('Invitation active · expires ' + new Date(inviteExpiresAt).toLocaleDateString()) : 'Invitation active')}</span>{inviteUrl && <button onClick={() => { void navigator.clipboard?.writeText(inviteUrl); onToast('Invitation link copied.') }}><Copy size={14} /></button>}</div>}{inviteId && <button className="revoke-invite" onClick={onRevokeInvite}><X size={13} /> Revoke this invitation</button>}<div className="security-footnote"><LockKeyhole size={14} /><span>Private ideas stay hidden from your collaborator, even from direct links.</span></div></section><section className="settings-card glass-panel"><div className="settings-card-heading"><div className="settings-symbol warm"><Sun size={18} /></div><div><h2>A space that feels right.</h2><p>Set the tone for your little studio.</p></div></div><div className="theme-options"><button className={`theme-option ${theme === 'dark' ? 'selected' : ''}`} onClick={() => setTheme('dark')}><div className="theme-preview dark-preview"><span /><span /><span /></div><strong>Midnight</strong>{theme === 'dark' && <Check size={14} />}</button><button className={`theme-option ${theme === 'light' ? 'selected' : ''}`} onClick={() => setTheme('light')}><div className="theme-preview light-preview"><span /><span /><span /></div><strong>Daylight</strong>{theme === 'light' && <Check size={14} />}</button></div><form className="settings-edit-row workspace-name-form" onSubmit={e => { e.preventDefault(); onWorkspaceSave(workspaceName) }}><label className="field-label">Workspace name<input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} maxLength={60} /></label><button className="secondary-button" type="submit" disabled={data.currentUserRole !== 'owner'}>Save name</button></form><div className="setting-detail-row"><span>Membership limit</span><strong>2 people</strong></div><div className="setting-detail-row"><span>Your content</span><strong>Private by default</strong></div></section><section className="settings-card setup-card glass-panel"><div className="setup-orb"><Sparkles size={22} /></div><div><div className="section-kicker">{isSupabaseConfigured ? 'CONNECTED' : 'GET STARTED'}</div><h2>{isSupabaseConfigured ? 'Your private backend is connected.' : 'Ready to make it yours?'}</h2><p>{isSupabaseConfigured ? 'Your workspace data is protected by Supabase authentication and database access policies.' : 'Connect a Supabase project to enable real accounts, invitations, synced data, and private-by-default access rules.'}</p></div><div className="setup-status"><span className={isSupabaseConfigured ? 'connected' : ''} />{isSupabaseConfigured ? 'Supabase connected' : 'Local preview mode'}</div><div className="setup-foot">{isSupabaseConfigured ? 'Workspace members: maximum 2' : 'Add your Supabase project URL and publishable key to .env.local'} <ArrowRight size={13} /></div></section></div>
}

function IdeaModal({ idea, info, onClose, onSubmit }: { idea: Idea | null; info?: ProjectInfo; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  const isProject = Boolean(idea && ['selected', 'planned', 'in_progress', 'completed', 'on_hold'].includes(idea.status))
  return <Modal onClose={onClose} className="form-modal"><div className="modal-heading"><div className="modal-symbol"><Lightbulb size={18} /></div><div><div className="section-kicker">{idea ? 'MAKE IT CLEARER' : 'A NEW THOUGHT'}</div><h2>{idea ? 'Shape this idea.' : 'Give this idea a place.'}</h2><p>A few details now make the next conversation easier.</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><form onSubmit={onSubmit} className="modal-form"><label className="field-label">Idea title <span>*</span><input name="title" required maxLength={100} defaultValue={idea?.title ?? ''} placeholder="Something worth building…" autoFocus /></label><label className="field-label">Short description<textarea name="short_description" rows={2} defaultValue={idea?.short_description ?? ''} placeholder="One sentence is plenty." maxLength={240} /></label><div className="form-two"><label className="field-label">Category<select name="category" defaultValue={idea?.category ?? 'Developer Tools'}>{ideaCategories.map(c => <option key={c}>{c}</option>)}</select></label><label className="field-label">Visibility<select name="visibility" defaultValue={idea?.visibility ?? 'private'}><option value="private">Private · just me</option><option value="shared">Shared · both of us</option></select></label></div><div className="form-two"><label className="field-label">Status<select name="status" defaultValue={idea?.status ?? 'idea'}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="field-label">Technologies<input name="technologies" defaultValue={idea?.technologies.join(', ') ?? ''} placeholder="React, Supabase, …" /></label></div><label className="field-label">The problem<textarea name="problem_statement" rows={2} defaultValue={idea?.problem_statement ?? ''} placeholder="What could be better?" /></label><label className="field-label">Proposed solution<textarea name="proposed_solution" rows={2} defaultValue={idea?.proposed_solution ?? ''} placeholder="How might this work?" /></label><label className="field-label">Full description<textarea name="description" rows={3} defaultValue={idea?.description ?? ''} placeholder="Add the context you want to remember." /></label><label className="field-label">Expected features<input name="expected_features" defaultValue={idea?.expected_features.join(', ') ?? ''} placeholder="Source capture, activity feed, …" /></label>{isProject && <div className="project-form-section"><div className="section-kicker">PROJECT DETAILS</div><div className="form-two"><label className="field-label">Start date<input type="date" name="start_date" defaultValue={info?.start_date ?? ''} /></label><label className="field-label">Target date<input type="date" name="target_date" defaultValue={info?.target_date ?? ''} /></label></div><div className="form-two"><label className="field-label">GitHub repository<input type="url" name="github_url" defaultValue={info?.github_url ?? ''} placeholder="https://github.com/…" /></label><label className="field-label">Live demo<input type="url" name="demo_url" defaultValue={info?.demo_url ?? ''} placeholder="https://…" /></label></div><label className="field-label">Project notes<textarea name="project_notes" rows={2} defaultValue={info?.notes ?? ''} placeholder="What should stay in view?" /></label></div>}<div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Check size={15} /> {idea ? 'Save changes' : 'Create idea'}</button></div></form></Modal>
}

function ResourceModal({ resource, ideas, onClose, onSubmit }: { resource: Resource | null; ideas: Idea[]; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return <Modal onClose={onClose} className="form-modal resource-modal"><div className="modal-heading"><div className="modal-symbol blue-symbol"><Link2 size={18} /></div><div><div className="section-kicker">YOUR LIBRARY</div><h2>{resource ? 'Update this resource.' : 'Keep something useful.'}</h2><p>Links are private unless you choose to share them.</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><form onSubmit={onSubmit} className="modal-form"><label className="field-label">Title <span>*</span><input name="title" required defaultValue={resource?.title ?? ''} placeholder="A guide, tool, or little gem…" /></label><label className="field-label">URL <span>*</span><input name="url" required type="url" defaultValue={resource?.url ?? ''} placeholder="https://" /></label><label className="field-label">Description<textarea name="description" rows={2} defaultValue={resource?.description ?? ''} placeholder="Why is this worth keeping?" /></label><div className="form-two"><label className="field-label">Category<select name="category" defaultValue={resource?.category ?? 'Useful Websites'}>{resourceCategories.map(c => <option key={c}>{c}</option>)}</select></label><label className="field-label">Visibility<select name="visibility" defaultValue={resource?.visibility ?? 'private'}><option value="private">Private · just me</option><option value="shared">Shared · both of us</option></select></label></div><label className="field-label">Tags<input name="tags" defaultValue={resource?.tags.join(', ') ?? ''} placeholder="design, inspiration, …" /></label><label className="field-label">Related idea<select name="related_idea_id" defaultValue={resource?.related_idea_id ?? ''}><option value="">No related idea</option>{ideas.map(i => <option value={i.id} key={i.id}>{i.title}</option>)}</select></label><div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Bookmark size={15} /> {resource ? 'Save resource' : 'Add resource'}</button></div></form></Modal>
}

function IdeaDetail({ idea, data, currentUserId, projectInfo, onClose, onEdit, onDelete, onVote, onAddComment, onReply, replyTo, onUpdateComment, onDeleteComment, editingComment, setEditingComment }: { idea: Idea; data: StoredData; currentUserId: string; projectInfo?: ProjectInfo; onClose: () => void; onEdit: () => void; onDelete: () => void; onVote: () => void; onAddComment: (content: string) => void; onReply: (id: string | null) => void; replyTo: string | null; onUpdateComment: (comment: Comment, content: string) => void; onDeleteComment: (comment: Comment) => void; editingComment: string | null; setEditingComment: (id: string | null) => void }) {
  const isOwner = idea.created_by === currentUserId
  const comments = data.comments.filter(c => c.idea_id === idea.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const topLevel = comments.filter(c => !c.parent_id)
  const [commentText, setCommentText] = useState('')
  const [editText, setEditText] = useState('')
  function send(e: FormEvent) { e.preventDefault(); onAddComment(commentText); setCommentText('') }
  return <Modal onClose={onClose} className="detail-modal"><div className="detail-header"><span className={`idea-art lavender`}><Sparkles size={18} /></span><div className="detail-head-copy"><div className="section-kicker">{idea.category.toUpperCase()}</div><h2>{idea.title}</h2><span>Created by {idea.created_by_name} · {relativeDate(idea.created_at)}</span></div><div className="detail-header-actions"><span className={`visibility-tag ${idea.visibility}`}><span>{idea.visibility === 'shared' ? <Users size={11} /> : <LockKeyhole size={11} />}</span>{idea.visibility}</span>{isOwner && <button className="icon-button" onClick={onEdit} aria-label="Edit idea"><Settings2 size={17} /></button>}{isOwner && <button className="icon-button danger-hover" onClick={onDelete} aria-label="Delete idea"><Trash2 size={16} /></button>}<button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div></div><div className="detail-scroll"><div className="detail-main"><p className="detail-summary">{idea.short_description}</p>{idea.description && <div className="detail-section"><h3>The idea</h3><p>{idea.description}</p></div>}{idea.problem_statement && <div className="detail-section"><h3>The problem</h3><p>{idea.problem_statement}</p></div>}{idea.proposed_solution && <div className="detail-section"><h3>A possible approach</h3><p>{idea.proposed_solution}</p></div>}<div className="detail-section"><h3>Technologies & features</h3><div className="idea-tags">{idea.technologies.map(t => <span className="tech-pill" key={t}>{t}</span>)}{idea.expected_features.map(t => <span className="tech-pill feature-pill" key={t}>{t}</span>)}{!idea.technologies.length && !idea.expected_features.length && <span className="muted">Still taking shape.</span>}</div></div>{projectInfo && (projectInfo.github_url || projectInfo.demo_url || projectInfo.notes) && <div className="detail-section"><h3>Project notes</h3><p>{projectInfo.notes}</p><div className="project-links">{projectInfo.github_url && <a href={projectInfo.github_url} target="_blank" rel="noreferrer"><Command size={14} /> Repository <ArrowUpRight size={12} /></a>}{projectInfo.demo_url && <a href={projectInfo.demo_url} target="_blank" rel="noreferrer"><Globe2 size={14} /> Live demo <ArrowUpRight size={12} /></a>}</div></div>}<div className="detail-stats"><button className={`vote-detail ${idea.voted_by_me ? 'voted' : ''}`} onClick={onVote} disabled={idea.visibility !== 'shared'}><ThumbsUp size={15} /> {idea.voted_by_me ? 'You voted' : 'Upvote'} <strong>{idea.vote_count}</strong></button><span><MessageCircle size={15} /> {idea.comment_count} comments</span><span className={`status-label status-${idea.status}`}>{statusLabels[idea.status]}</span></div></div><aside className="detail-discussion"><div className="discussion-heading"><div><div className="section-kicker">THE CONVERSATION</div><h3>{comments.length} {comments.length === 1 ? 'thought' : 'thoughts'}</h3></div><span className="online-pair"><i /> 2 here</span></div>{idea.visibility === 'shared' ? <><div className="comment-list">{topLevel.map(comment => <div className="comment-thread" key={comment.id}><CommentRow comment={comment} currentUserId={currentUserId} replyTo={replyTo} onReply={onReply} editingComment={editingComment} editText={editText} setEditText={setEditText} onEditStart={c => { setEditingComment(c.id); setEditText(c.content) }} onEditSave={onUpdateComment} onEditCancel={() => setEditingComment(null)} onDelete={onDeleteComment} /><div className="comment-replies">{comments.filter(reply => reply.parent_id === comment.id).map(reply => <CommentRow key={reply.id} comment={reply} currentUserId={currentUserId} replyTo={replyTo} onReply={onReply} editingComment={editingComment} editText={editText} setEditText={setEditText} onEditStart={c => { setEditingComment(c.id); setEditText(c.content) }} onEditSave={onUpdateComment} onEditCancel={() => setEditingComment(null)} onDelete={onDeleteComment} />)}</div>{replyTo === comment.id && <form className="reply-form" onSubmit={e => { e.preventDefault(); if (commentText.trim()) { onAddComment(commentText); setCommentText('') } }}><input autoFocus value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={`Reply to ${comment.author.split(' ')[0]}…`} /><button className="icon-button" type="submit"><Send size={15} /></button></form>}</div>)}</div><form className="comment-compose" onSubmit={send}><div className="avatar avatar-self">{data.currentUserName.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a thoughtful note…" rows={2} /><button className="send-button" type="submit" disabled={!commentText.trim()}><Send size={14} /></button></form></> : <div className="private-discussion"><LockKeyhole size={18} /><strong>Private, by design.</strong><span>Share this idea when you’re ready to talk it through.</span></div>}</aside></div></Modal>
}

function CommentRow({ comment, currentUserId, replyTo, onReply, editingComment, editText, setEditText, onEditStart, onEditSave, onEditCancel, onDelete }: { comment: Comment; currentUserId: string; replyTo: string | null; onReply: (s: string | null) => void; editingComment: string | null; editText: string; setEditText: (s: string) => void; onEditStart: (c: Comment) => void; onEditSave: (c: Comment, content: string) => void; onEditCancel: () => void; onDelete: (c: Comment) => void }) {
  const mine = comment.user_id === currentUserId
  return <div className="comment-row"><div className={`tiny-avatar comment-avatar ${comment.author === 'Sam Rivera' ? 'sam' : ''}`}>{comment.author.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><div className="comment-content"><div className="comment-byline"><strong>{comment.author}</strong><span>{relativeDate(comment.created_at)}</span></div>{editingComment === comment.id ? <form className="comment-edit-form" onSubmit={e => { e.preventDefault(); onEditSave(comment, editText) }}><input autoFocus value={editText} onChange={e => setEditText(e.target.value)} /><button type="submit"><Check size={13} /></button><button type="button" onClick={onEditCancel}><X size={13} /></button></form> : <p>{comment.content}</p>}<div className="comment-controls">{!comment.parent_id && <button onClick={() => onReply(replyTo === comment.id ? null : comment.id)}>Reply</button>}{mine && <><button onClick={() => onEditStart(comment)}>Edit</button><button onClick={() => onDelete(comment)}>Delete</button></>}</div></div></div>
}

function LoginIntro({ workspaceName }: { workspaceName: string }) {
  return <main className="login-intro" role="status" aria-live="polite">
    <div className="login-intro-glow intro-glow-one" /><div className="login-intro-glow intro-glow-two" />
    <div className="login-intro-content">
      <div className="login-intro-brand"><span className="login-intro-brandmark"><img src={brandIconSrc} alt="" /></span><span>Open<span>Space</span></span></div>
      <div className="login-intro-orbit" aria-hidden="true"><span className="intro-orbit-ring ring-one" /><span className="intro-orbit-ring ring-two" /><span className="intro-orbit-dot" /><span className="login-intro-core"><img src={brandIconSrc} alt="" /></span></div>
      <div className="login-intro-kicker"><i /> YOUR PRIVATE STUDIO</div>
      <h1>Welcome back<span>.</span></h1>
      <p>Your ideas are finding their place.<br />We’re getting your workspace ready.</p>
      <div className="login-intro-progress" role="progressbar" aria-label="Opening your workspace"><span /></div>
      <div className="login-intro-status"><LockKeyhole size={13} /><span>{workspaceName ? `Opening ${workspaceName}` : 'Securing your session'}</span><i /></div>
    </div>
    <div className="login-intro-footer"><span>PRIVATE BY DEFAULT</span><i /> <span>BUILT FOR WHAT’S NEXT</span></div>
  </main>
}

function Modal({ children, onClose, className = '' }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className={`modal-card glass-panel ${className}`} role="dialog" aria-modal="true">{children}</div></div>
}

function AuthScreen({ onToast }: { onToast: (s: string) => void }) {
  const inviteFlow = new URLSearchParams(window.location.search).has('invite')
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim().toLowerCase()
    const password = String(form.get('password') || '')
    setBusy(true)
    if (mode === 'signup') {
      const result = await supabase.auth.signUp({ email, password, options: { data: { display_name: String(form.get('display_name') || '') }, emailRedirectTo: window.location.href } })
      setBusy(false)
      if (result.error) onToast(result.error.message)
      else if (!result.data.session) onToast('Check your email to confirm your account.')
      return
    }
    if (mode === 'reset') {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      setBusy(false)
      if (result.error) onToast(result.error.message)
      else { onToast('If that account exists, a reset link is on its way.'); setMode('login') }
      return
    }
    const result = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) onToast(result.error.message)
  }
  return <div className="auth-screen"><div className="auth-backdrop" /><div className="auth-card glass-panel"><div className="brand auth-brand"><div className="brand-mark"><img className="brand-symbol" src={brandIconSrc} alt="" /></div><span>Open<span className="brand-light">Space</span></span></div><div className="auth-art"><div className="auth-orbit auth-orbit-a" /><div className="auth-orbit auth-orbit-b" /><Sparkles size={28} /></div><div className="eyebrow"><span className="eyebrow-dot" /> A PRIVATE LITTLE STUDIO</div><h1>{mode === 'signup' ? 'Make room for ideas.' : mode === 'reset' ? 'A fresh start.' : 'Good ideas grow here.'}</h1><p className="auth-subtitle">A calm, shared space for two people building something meaningful.</p><form className="modal-form auth-form" onSubmit={submit}>{mode === 'signup' && <label className="field-label">Your name<input required name="display_name" placeholder="How should we call you?" /></label>}<label className="field-label">Email address<input required type="email" name="email" placeholder="you@example.com" /></label>{mode !== 'reset' && <label className="field-label">Password<input required type="password" name="password" minLength={8} placeholder="At least 8 characters" /></label>}<button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? 'One moment…' : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Send reset link' : 'Sign in'} <ArrowRight size={15} /></button></form><div className="auth-switch">{mode === 'login' ? <>{inviteFlow ? <>Joining with an invitation? <button onClick={() => setMode('signup')}>Create an account</button></> : <span>Access is invitation only. Ask the owner for a link.</span>}<button className="forgot-link" onClick={() => setMode('reset')}>Forgot password?</button></> : <><button onClick={() => setMode('login')}>Back to sign in</button></>}</div><div className="auth-lock"><LockKeyhole size={12} /> Your ideas stay private until you share them.</div></div><div className="auth-caption">Two builders. One little space. Lots of possibilities.</div></div>
}

function PasswordUpdateScreen({ onComplete }: { onComplete: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return
    const form = new FormData(e.currentTarget)
    const password = String(form.get('password') || '')
    const confirmation = String(form.get('confirmation') || '')
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return }
    if (password !== confirmation) { setError('The passwords do not match.'); return }
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) { setError(updateError.message); return }
    onComplete()
  }
  return <div className="auth-screen"><div className="auth-backdrop" /><div className="auth-card glass-panel"><div className="brand auth-brand"><div className="brand-mark"><img className="brand-symbol" src={brandIconSrc} alt="" /></div><span>Open<span className="brand-light">Space</span></span></div><div className="auth-art"><div className="auth-orbit auth-orbit-a" /><div className="auth-orbit auth-orbit-b" /><LockKeyhole size={26} /></div><div className="eyebrow"><span className="eyebrow-dot" /> SUPABASE ACCOUNT</div><h1>Choose your password.</h1><p className="auth-subtitle">This password belongs to your Supabase account. Only you choose it.</p><form className="modal-form auth-form" onSubmit={submit}><label className="field-label">New password<input required type="password" name="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" /></label><label className="field-label">Confirm password<input required type="password" name="confirmation" minLength={8} autoComplete="new-password" placeholder="Type it again" /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? 'Updating…' : 'Set password'} <ArrowRight size={15} /></button></form><div className="auth-lock"><LockKeyhole size={12} /> Your password is sent directly to Supabase Auth.</div></div><div className="auth-caption">A secure key for your private studio.</div></div>
}

function AccessScreen({ message, onSignOut }: { message: string; onSignOut: () => void }) {
  return <div className="loading-screen access-screen"><div className="access-card glass-panel"><div className="brand-mark large"><img className="brand-symbol" src={brandIconSrc} alt="OpenSpace" /></div><div className="section-kicker">WORKSPACE ACCESS</div><h1>This account can’t open this studio yet.</h1><p>{message}</p><span>Ask the owner for a current invitation link, then sign in through that link.</span><button className="secondary-button" onClick={onSignOut}><LogOut size={14} /> Sign out</button></div></div>
}

export default App
