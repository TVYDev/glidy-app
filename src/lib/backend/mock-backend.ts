import { DEFAULT_ORIGIN } from '@/lib/mapbox-api';
import { t } from '@/i18n';
import { storage } from '@/lib/storage';
import type {
  Backend,
  CreateSessionInput,
  Member,
  MemberLocation,
  Profile,
  SaveRouteInput,
  SavedRoute,
  Session,
  SessionChannel,
  SessionEvents,
} from '@/lib/types';

/**
 * Local demo backend, used when Supabase is not configured. Everything is stored
 * on-device, so sessions only exist on this phone, and two demo travellers are
 * simulated so the live map has something to show.
 */

type StoredUser = { id: string; email: string; password: string; displayName: string };
type StoredMember = { sessionId: string; userId: string; joinedAt: string };
type State = {
  users: StoredUser[];
  currentUserId: string | null;
  sessions: Session[];
  members: StoredMember[];
  routes: SavedRoute[];
};

const KEY = 'glidy.mock.v1';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const demoTravellers = (): Profile[] => [
  { id: 'demo-alex', displayName: `Alex ${t('common.demoSuffix')}` },
  { id: 'demo-sam', displayName: `Sam ${t('common.demoSuffix')}` },
];

const load = (): State =>
  storage.get<State>(KEY, { users: [], currentUserId: null, sessions: [], members: [], routes: [] });
const save = (state: State) => storage.set(KEY, state);

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const makeCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

const listeners = new Set<(profile: Profile | null) => void>();
const toProfile = (u: StoredUser | undefined): Profile | null =>
  u ? { id: u.id, displayName: u.displayName } : null;
const emitAuth = (state: State) => {
  const profile = toProfile(state.users.find((u) => u.id === state.currentUserId));
  listeners.forEach((l) => l(profile));
};

function requireUser(state: State): StoredUser {
  const user = state.users.find((u) => u.id === state.currentUserId);
  if (!user) throw new Error(t('err.signInFirst'));
  return user;
}

function findSession(state: State, id: string): Session {
  const session = state.sessions.find((s) => s.id === id);
  if (!session) throw new Error(t('err.sessionNotFound'));
  return session;
}

export function createMockBackend(): Backend {
  return {
    isMock: true,

    auth: {
      async current() {
        const state = load();
        return toProfile(state.users.find((u) => u.id === state.currentUserId));
      },
      onChange(callback) {
        listeners.add(callback);
        return () => {
          listeners.delete(callback);
        };
      },
      async signUp(email, password, displayName) {
        const state = load();
        const normalized = email.trim().toLowerCase();
        if (state.users.some((u) => u.email === normalized)) {
          throw new Error(t('err.emailExists'));
        }
        const user: StoredUser = { id: uid(), email: normalized, password, displayName: displayName.trim() };
        state.users.push(user);
        state.currentUserId = user.id;
        save(state);
        emitAuth(state);
        return { id: user.id, displayName: user.displayName };
      },
      async signIn(email, password) {
        const state = load();
        const normalized = email.trim().toLowerCase();
        const user = state.users.find((u) => u.email === normalized && u.password === password);
        if (!user) throw new Error(t('err.wrongCredentials'));
        state.currentUserId = user.id;
        save(state);
        emitAuth(state);
        return { id: user.id, displayName: user.displayName };
      },
      async signOut() {
        const state = load();
        state.currentUserId = null;
        save(state);
        emitAuth(state);
      },
      async updateDisplayName(displayName) {
        const state = load();
        const user = requireUser(state);
        user.displayName = displayName.trim();
        save(state);
        emitAuth(state);
        return { id: user.id, displayName: user.displayName };
      },
    },

    sessions: {
      async create(input: CreateSessionInput) {
        const state = load();
        const user = requireUser(state);
        let code = makeCode();
        while (state.sessions.some((s) => s.code === code)) code = makeCode();
        const session: Session = {
          id: uid(),
          code,
          name: input.name.trim() || 'Group trip',
          leaderId: user.id,
          destination: input.destination,
          route: input.route,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        state.sessions.push(session);
        state.members.push({ sessionId: session.id, userId: user.id, joinedAt: session.createdAt });
        save(state);
        return session;
      },
      async join(code) {
        const state = load();
        const user = requireUser(state);
        const session = state.sessions.find((s) => s.code === code.trim().toUpperCase() && s.status === 'active');
        if (!session) throw new Error(t('err.noGroupForCode'));
        if (!state.members.some((m) => m.sessionId === session.id && m.userId === user.id)) {
          state.members.push({ sessionId: session.id, userId: user.id, joinedAt: new Date().toISOString() });
          save(state);
        }
        return session;
      },
      async get(id) {
        return findSession(load(), id);
      },
      async listMine() {
        const state = load();
        const user = requireUser(state);
        const mine = new Set(state.members.filter((m) => m.userId === user.id).map((m) => m.sessionId));
        return state.sessions
          .filter((s) => mine.has(s.id) && s.status === 'active')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async update(id, patch) {
        const state = load();
        const user = requireUser(state);
        const session = findSession(state, id);
        if (session.leaderId !== user.id) throw new Error(t('err.onlyLeaderRoute'));
        session.destination = patch.destination;
        session.route = patch.route;
        save(state);
        return session;
      },
      async end(id) {
        const state = load();
        const user = requireUser(state);
        const session = findSession(state, id);
        if (session.leaderId !== user.id) throw new Error(t('err.onlyLeaderEnd'));
        session.status = 'ended';
        save(state);
      },
      async leave(id) {
        const state = load();
        const user = requireUser(state);
        state.members = state.members.filter((m) => !(m.sessionId === id && m.userId === user.id));
        save(state);
      },
      async members(id) {
        const state = load();
        const real: Member[] = state.members
          .filter((m) => m.sessionId === id)
          .map((m) => ({
            userId: m.userId,
            displayName: state.users.find((u) => u.id === m.userId)?.displayName ?? t('common.traveller'),
            joinedAt: m.joinedAt,
          }));
        const demo: Member[] = demoTravellers().map((t) => ({
          userId: t.id,
          displayName: t.displayName,
          joinedAt: new Date().toISOString(),
        }));
        return [...real, ...demo];
      },
      openChannel(session: Session, _me: Profile, events: SessionEvents): SessionChannel {
        let tick = 0;
        events.onStatus?.('live');
        const timer = setInterval(() => {
          tick += 1;
          // Re-read the session so the demo travellers follow the leader's latest route.
          const current = load().sessions.find((s) => s.id === session.id) ?? session;
          demoTravellers().forEach((traveller, index) => {
            events.onLocation(simulate(traveller, index, tick, current));
          });
        }, 3000);
        return {
          sendLocation() {},
          notifySessionChanged() {},
          notifyMembersChanged() {},
          stop() {
            clearInterval(timer);
          },
        };
      },
    },

    routes: {
      async list() {
        const state = load();
        const user = requireUser(state);
        return state.routes
          .filter((r) => r.ownerId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async get(id) {
        const route = load().routes.find((r) => r.id === id);
        if (!route) throw new Error(t('err.routeNotFound'));
        return route;
      },
      async save(input: SaveRouteInput) {
        const state = load();
        const user = requireUser(state);
        const route: SavedRoute = {
          id: uid(),
          ownerId: user.id,
          name: input.name.trim() || input.destination.name,
          origin: input.origin,
          destination: input.destination,
          route: input.route,
          isShared: false,
          createdAt: new Date().toISOString(),
        };
        state.routes.push(route);
        save(state);
        return route;
      },
      async setShared(id, isShared) {
        const state = load();
        const route = state.routes.find((r) => r.id === id);
        if (!route) throw new Error(t('err.routeNotFound'));
        route.isShared = isShared;
        save(state);
        return route;
      },
      async remove(id) {
        const state = load();
        state.routes = state.routes.filter((r) => r.id !== id);
        save(state);
      },
    },
  };
}

/** Moves a demo traveller along the route, or around the start point when there is none. */
function simulate(traveller: Profile, index: number, tick: number, session: Session): MemberLocation {
  const geometry = session.route?.geometry;
  let longitude: number;
  let latitude: number;
  if (geometry && geometry.length > 1) {
    const offset = (index + 1) * 3;
    const position = Math.min(geometry.length - 1, (tick * 2 + offset) % geometry.length);
    [longitude, latitude] = geometry[position];
  } else {
    const angle = tick / 6 + index * Math.PI;
    longitude = DEFAULT_ORIGIN.longitude + Math.cos(angle) * 0.01 * (index + 1);
    latitude = DEFAULT_ORIGIN.latitude + Math.sin(angle) * 0.01 * (index + 1);
  }
  return {
    userId: traveller.id,
    displayName: traveller.displayName,
    coord: { latitude, longitude },
    heading: null,
    speed: null,
    updatedAt: Date.now(),
  };
}
