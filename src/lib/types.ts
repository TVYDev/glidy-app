export type Coord = { latitude: number; longitude: number };

export type Place = { name: string; subtitle?: string; coord: Coord };

export type RouteStep = {
  instruction: string;
  /** Metres for this step. */
  distance: number;
  /** Where the manoeuvre happens. */
  location: Coord;
  /** Mapbox manoeuvre type (turn, merge, roundabout, arrive…). Missing on routes saved before this existed. */
  type?: string;
  /** Mapbox manoeuvre modifier (left, slight right, uturn…). */
  modifier?: string;
};

export type Route = {
  /** GeoJSON order: [longitude, latitude]. */
  geometry: [number, number][];
  /** Metres. */
  distance: number;
  /** Seconds. */
  duration: number;
  steps: RouteStep[];
};

export type Profile = { id: string; displayName: string };

export type SessionStatus = 'active' | 'ended';

export type Session = {
  id: string;
  /** Short, shareable join code. */
  code: string;
  name: string;
  leaderId: string;
  destination: Place | null;
  route: Route | null;
  status: SessionStatus;
  createdAt: string;
};

export type Member = { userId: string; displayName: string; joinedAt: string };

export type MemberLocation = {
  userId: string;
  displayName: string;
  coord: Coord;
  heading: number | null;
  speed: number | null;
  /** Epoch ms when the position was taken. */
  updatedAt: number;
};

export type SavedRoute = {
  id: string;
  ownerId: string;
  name: string;
  origin: Place | null;
  destination: Place;
  route: Route;
  isShared: boolean;
  createdAt: string;
};

export type CreateSessionInput = {
  name: string;
  destination: Place | null;
  route: Route | null;
};

export type SaveRouteInput = {
  name: string;
  origin: Place | null;
  destination: Place;
  route: Route;
};

export type SessionEvents = {
  onLocation: (location: MemberLocation) => void;
  /** Leader changed the route/destination or ended the session: refetch it. */
  onSessionChanged: () => void;
  /** Someone joined or left: refetch members. */
  onMembersChanged: () => void;
  onStatus?: (status: 'connecting' | 'live' | 'offline') => void;
};

export type SessionChannel = {
  sendLocation: (location: MemberLocation) => void;
  notifySessionChanged: () => void;
  notifyMembersChanged: () => void;
  stop: () => void;
};

export interface Backend {
  /** True for the local demo backend. */
  readonly isMock: boolean;
  auth: {
    current(): Promise<Profile | null>;
    onChange(callback: (profile: Profile | null) => void): () => void;
    signUp(email: string, password: string, displayName: string): Promise<Profile>;
    signIn(email: string, password: string): Promise<Profile>;
    signOut(): Promise<void>;
    updateDisplayName(displayName: string): Promise<Profile>;
  };
  sessions: {
    create(input: CreateSessionInput): Promise<Session>;
    /** Joins by code and returns the session. Throws if not found/ended. */
    join(code: string): Promise<Session>;
    get(id: string): Promise<Session>;
    /** Active sessions the current user belongs to. */
    listMine(): Promise<Session[]>;
    update(id: string, patch: { destination: Place | null; route: Route | null }): Promise<Session>;
    end(id: string): Promise<void>;
    leave(id: string): Promise<void>;
    members(id: string): Promise<Member[]>;
    openChannel(session: Session, me: Profile, events: SessionEvents): SessionChannel;
  };
  routes: {
    list(): Promise<SavedRoute[]>;
    get(id: string): Promise<SavedRoute>;
    save(input: SaveRouteInput): Promise<SavedRoute>;
    setShared(id: string, isShared: boolean): Promise<SavedRoute>;
    remove(id: string): Promise<void>;
  };
}
