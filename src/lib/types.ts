export type Coord = { latitude: number; longitude: number };

export type Place = { name: string; subtitle?: string; coord: Coord };

export type RouteStep = {
  instruction: string;
  /** Metres for this step. */
  distance: number;
  /** Where the manoeuvre happens. */
  location: Coord;
  /** Manoeuvre type (turn, merge, roundabout, arrive…); Google's names are mapped to these. Missing on old routes. */
  type?: string;
  /** Manoeuvre modifier (left, slight right, uturn…). */
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
  /**
   * Stops between the start and the end, in the order they are visited. Kept inside the route so
   * the sessions and saved_routes tables need no new column.
   */
  stops?: Place[];
};

/** A person's picture: a small photo, or an emoji on a coloured circle. `null` means initials. */
export type Avatar =
  | { kind: 'emoji'; emoji: string; color: string }
  | { kind: 'photo'; /** A `data:image/jpeg;base64,…` URI, about 192 px square. */ uri: string };

export type Profile = { id: string; displayName: string; avatar?: Avatar | null };

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

export type Member = { userId: string; displayName: string; joinedAt: string; avatar?: Avatar | null };

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
  /** Leader only matters: a member asks to take over. Anyone may receive it; only the leader acts. */
  onLeaderRequest?: (from: { userId: string; displayName: string }) => void;
  /** The leader said no to this member's request. */
  onLeaderDeclined?: (userId: string) => void;
};

export type SessionChannel = {
  sendLocation: (location: MemberLocation) => void;
  notifySessionChanged: () => void;
  notifyMembersChanged: () => void;
  /** A member asks the leader to hand the group over. */
  requestLeadership: (from: { userId: string; displayName: string }) => void;
  /** The leader turns a request down. */
  declineLeadership: (userId: string) => void;
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
    /** Sets or clears (null) the profile picture. */
    updateAvatar(avatar: Avatar | null): Promise<Profile>;
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
    /** Leader hands the group to another member and returns the updated session. */
    transferLeader(id: string, userId: string): Promise<Session>;
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
