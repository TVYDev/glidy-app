import type { User } from '@supabase/supabase-js';

import { t } from '@/i18n';
import { getSupabase } from '@/lib/backend/supabase-client';
import type {
  Backend,
  CreateSessionInput,
  Member,
  MemberLocation,
  Place,
  Profile,
  Route,
  SaveRouteInput,
  SavedRoute,
  Session,
  SessionChannel,
  SessionEvents,
} from '@/lib/types';

type SessionRow = {
  id: string;
  code: string;
  name: string;
  leader_id: string;
  destination: Place | null;
  route: Route | null;
  status: 'active' | 'ended';
  created_at: string;
};

type SavedRouteRow = {
  id: string;
  owner_id: string;
  name: string;
  origin: Place | null;
  destination: Place;
  route: Route;
  is_shared: boolean;
  created_at: string;
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

const toSession = (r: SessionRow): Session => ({
  id: r.id,
  code: r.code,
  name: r.name,
  leaderId: r.leader_id,
  destination: r.destination,
  route: r.route,
  status: r.status,
  createdAt: r.created_at,
});

const toSavedRoute = (r: SavedRouteRow): SavedRoute => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  origin: r.origin,
  destination: r.destination,
  route: r.route,
  isShared: r.is_shared,
  createdAt: r.created_at,
});

const toProfile = (user: User): Profile => ({
  id: user.id,
  displayName:
    (user.user_metadata?.display_name as string | undefined) || user.email?.split('@')[0] || t('common.traveller'),
});

function fail(error: { message: string } | null): never | void {
  if (error) throw new Error(error.message);
}

export function createSupabaseBackend(): Backend {
  const supabase = getSupabase();

  async function requireUserId(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error(t('err.signInFirst'));
    return id;
  }

  return {
    isMock: false,

    auth: {
      async current() {
        const { data } = await supabase.auth.getSession();
        return data.session ? toProfile(data.session.user) : null;
      },
      onChange(callback) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          callback(session ? toProfile(session.user) : null);
        });
        return () => data.subscription.unsubscribe();
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        fail(error);
        if (!data.session || !data.user) {
          throw new Error(t('err.confirmEmail'));
        }
        return toProfile(data.user);
      },
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        fail(error);
        return toProfile(data.user!);
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        fail(error);
      },
      async updateDisplayName(displayName) {
        const name = displayName.trim();
        const { data, error } = await supabase.auth.updateUser({ data: { display_name: name } });
        fail(error);
        if (!data.user) throw new Error(t('err.profileUpdate'));
        await supabase.from('profiles').update({ display_name: name }).eq('id', data.user.id);
        return toProfile(data.user);
      },
    },

    sessions: {
      async create(input: CreateSessionInput) {
        const leaderId = await requireUserId();
        // A unique-violation on the code is astronomically rare; retry a few times anyway.
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const { data, error } = await supabase
            .from('sessions')
            .insert({
              code: makeCode(),
              name: input.name.trim() || 'Group trip',
              leader_id: leaderId,
              destination: input.destination,
              route: input.route,
            })
            .select()
            .single();
          if (!error) return toSession(data as SessionRow);
          if (error.code !== '23505') throw new Error(error.message);
        }
        throw new Error(t('err.createSession'));
      },
      async join(code) {
        const { data, error } = await supabase.rpc('join_session', { p_code: code.trim().toUpperCase() });
        fail(error);
        const row = (Array.isArray(data) ? data[0] : data) as SessionRow | null;
        if (!row) throw new Error(t('err.noGroupForCode'));
        return toSession(row);
      },
      async get(id) {
        const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single();
        fail(error);
        return toSession(data as SessionRow);
      },
      async listMine() {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        fail(error);
        return (data as SessionRow[]).map(toSession);
      },
      async update(id, patch) {
        const { data, error } = await supabase
          .from('sessions')
          .update({ destination: patch.destination, route: patch.route })
          .eq('id', id)
          .select()
          .single();
        fail(error);
        return toSession(data as SessionRow);
      },
      async end(id) {
        const { error } = await supabase.from('sessions').update({ status: 'ended' }).eq('id', id);
        fail(error);
      },
      async leave(id) {
        const userId = await requireUserId();
        const { error } = await supabase
          .from('session_members')
          .delete()
          .eq('session_id', id)
          .eq('user_id', userId);
        fail(error);
      },
      async members(id) {
        const { data, error } = await supabase
          .from('session_members')
          .select('user_id, joined_at, profiles(display_name)')
          .eq('session_id', id);
        fail(error);
        type Row = { user_id: string; joined_at: string; profiles: { display_name: string } | null };
        return (data as unknown as Row[]).map(
          (r): Member => ({
            userId: r.user_id,
            displayName: r.profiles?.display_name ?? t('common.traveller'),
            joinedAt: r.joined_at,
          }),
        );
      },
      openChannel(session: Session, me: Profile, events: SessionEvents): SessionChannel {
        const channel = supabase.channel(`session:${session.id}`, {
          config: { private: true, broadcast: { self: false } },
        });
        let stopped = false;
        events.onStatus?.('connecting');

        channel
          .on('broadcast', { event: 'location' }, ({ payload }) => {
            const location = payload as MemberLocation;
            if (location.userId !== me.id) events.onLocation(location);
          })
          .on('broadcast', { event: 'session' }, () => events.onSessionChanged())
          .on('broadcast', { event: 'members' }, () => events.onMembersChanged());

        // Private channels are authorised with the user's JWT, so make sure the realtime
        // socket has it before joining; otherwise the join is rejected and the channel closes.
        void supabase.realtime
          .setAuth()
          .catch(() => undefined)
          .then(() => {
            if (stopped) return;
            channel.subscribe((status, error) => {
              // Leaving the screen closes the channel, which reports CLOSED: that is not an outage.
              if (stopped) return;
              if (__DEV__ && status !== 'SUBSCRIBED') {
                console.warn(`[realtime] session:${session.id} ${status}`, error?.message ?? '');
              }
              if (status === 'SUBSCRIBED') {
                events.onStatus?.('live');
                // Tell everyone already in the channel that the member list may have changed.
                void channel.send({ type: 'broadcast', event: 'members', payload: {} });
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                events.onStatus?.('offline');
              }
            });
          });

        const send = (event: string, payload: unknown) => {
          void channel.send({ type: 'broadcast', event, payload });
        };
        return {
          sendLocation: (location) => send('location', location),
          notifySessionChanged: () => send('session', {}),
          notifyMembersChanged: () => send('members', {}),
          stop: () => {
            stopped = true;
            void supabase.removeChannel(channel);
          },
        };
      },
    },

    routes: {
      async list() {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from('saved_routes')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });
        fail(error);
        return (data as SavedRouteRow[]).map(toSavedRoute);
      },
      async get(id) {
        const { data, error } = await supabase.from('saved_routes').select('*').eq('id', id).single();
        fail(error);
        return toSavedRoute(data as SavedRouteRow);
      },
      async save(input: SaveRouteInput) {
        const ownerId = await requireUserId();
        const { data, error } = await supabase
          .from('saved_routes')
          .insert({
            owner_id: ownerId,
            name: input.name.trim() || input.destination.name,
            origin: input.origin,
            destination: input.destination,
            route: input.route,
          })
          .select()
          .single();
        fail(error);
        return toSavedRoute(data as SavedRouteRow);
      },
      async setShared(id, isShared) {
        const { data, error } = await supabase
          .from('saved_routes')
          .update({ is_shared: isShared })
          .eq('id', id)
          .select()
          .single();
        fail(error);
        return toSavedRoute(data as SavedRouteRow);
      },
      async remove(id) {
        const { error } = await supabase.from('saved_routes').delete().eq('id', id);
        fail(error);
      },
    },
  };
}
