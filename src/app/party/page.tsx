"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Sparkles, Users, Radio, Music2 } from "lucide-react";

import PageLayout from "@/components/PageLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createEmptyNowPlaying, generateRoomCode } from "@/lib/party";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-white/[0.07] transition-all outline-none";
const smallInputClass =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 transition-all outline-none";

export default function PartyLandingPage() {
    const router = useRouter();
    const [roomName, setRoomName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const displayNameValue = useMemo(() => displayName.trim() || "Guest", [displayName]);
    const normalizedJoinCode = useMemo(() => joinCode.trim().toUpperCase(), [joinCode]);

    const ensureSession = async () => {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return data.session.user;
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError || !anonData.user) {
            throw anonError ?? new Error("Anonymous sign-in failed.");
        }
        return anonData.user;
    };

    const handleCreate = async () => {
        if (!isSupabaseConfigured) {
            setError("Supabase is not configured yet.");
            return;
        }
        setIsCreating(true);
        setError(null);
        try {
            const supabase = getSupabaseBrowserClient();
            const user = await ensureSession();
            const name = roomName.trim() || "Party Room";

            let code = "";
            for (let i = 0; i < 5; i += 1) {
                const candidate = generateRoomCode();
                const { error: insertError } = await supabase.from("party_rooms").insert({
                    code: candidate,
                    name,
                    host_id: user.id,
                    co_dj_ids: [],
                    now_playing: createEmptyNowPlaying(),
                    queue: [],
                });
                if (!insertError) {
                    code = candidate;
                    break;
                }
                if (insertError.code !== "23505") {
                    throw insertError;
                }
            }

            if (!code) throw new Error("Failed to create a room. Try again.");
            localStorage.setItem("party:displayName", displayNameValue);
            router.push(`/party/${code}`);
        } catch (createError: unknown) {
            setError(createError instanceof Error ? createError.message : "Room creation failed.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoin = async () => {
        if (!isSupabaseConfigured) {
            setError("Supabase is not configured yet.");
            return;
        }
        if (!normalizedJoinCode) {
            setError("Enter a room code.");
            return;
        }
        setIsJoining(true);
        setError(null);
        try {
            const supabase = getSupabaseBrowserClient();
            await ensureSession();
            const { data, error: fetchError } = await supabase
                .from("party_rooms")
                .select("code")
                .eq("code", normalizedJoinCode)
                .maybeSingle();
            if (fetchError) throw fetchError;
            if (!data) throw new Error("Room not found.");
            localStorage.setItem("party:displayName", displayNameValue);
            router.push(`/party/${normalizedJoinCode}`);
        } catch (joinError: unknown) {
            setError(joinError instanceof Error ? joinError.message : "Failed to join room.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <PageLayout>
            <div className="max-w-5xl mx-auto space-y-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Party Mode
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight">
                        Sync the vibe. Run the room.
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Create a room code, invite friends, and keep everyone locked to the same beat. Built for Vercel + Supabase realtime.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card variant="elevated" className="p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                                <Radio className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-semibold">Create a Room</h2>
                                <p className="text-muted-foreground text-sm">Be the host and set the soundtrack.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Room Name</label>
                                <input
                                    value={roomName}
                                    onChange={(event) => setRoomName(event.target.value)}
                                    className={inputClass}
                                    placeholder="Friday Night Orbit"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Your Display Name</label>
                                <input
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    className={smallInputClass}
                                    placeholder="DJ Nova"
                                />
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleCreate} isLoading={isCreating}>
                            Create Room <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Card>

                    <Card variant="elevated" className="p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary-foreground flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-semibold">Join a Room</h2>
                                <p className="text-muted-foreground text-sm">Drop in with a code and sync up.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Room Code</label>
                                <input
                                    value={joinCode}
                                    onChange={(event) => setJoinCode(event.target.value)}
                                    className={inputClass}
                                    placeholder="6-letter code"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Your Display Name</label>
                                <input
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    className={smallInputClass}
                                    placeholder="Guest"
                                />
                            </div>
                        </div>

                        <Button variant="secondary" className="w-full" onClick={handleJoin} isLoading={isJoining}>
                            Join Room <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Card>
                </div>

                <div id="features" className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <Card className="flex items-center gap-3 p-4">
                        <Music2 className="w-5 h-5 text-primary" />
                        <span>Sync now playing and queue state in realtime.</span>
                    </Card>
                    <Card className="flex items-center gap-3 p-4">
                        <Users className="w-5 h-5 text-secondary-foreground" />
                        <span>Invite anyone with a room code. No sign-up wall.</span>
                    </Card>
                    <Card className="flex items-center gap-3 p-4">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>Keep the party moving with shared controls and chat.</span>
                    </Card>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 justify-center">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
