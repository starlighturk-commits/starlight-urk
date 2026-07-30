import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useGetPodcasts,
  getGetPodcastsQueryKey,
  type PodcastEpisode,
} from "@/lib/api-client";

const COVER_IMAGE = require("@/assets/images/luut-podcast-cover.png");
const FALLBACK_IMAGE = require("@/assets/images/luut-podcast-cover.png");
const PODCAST_URL = "https://starlighturk.nl/luut-podcast/";

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type PlayState = "idle" | "loading" | "playing" | "paused";

// ─── Singleton web audio element ─────────────────────────────────────────────
// Created once on module load so the browser considers it user-activated.
// We swap .src to change tracks without re-creating the element.
let _webAudio: HTMLAudioElement | null = null;

function getWebAudio(): HTMLAudioElement {
  if (!_webAudio && typeof document !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _webAudio = new (globalThis as any).Audio() as HTMLAudioElement;
    _webAudio.preload = "none";
  }
  return _webAudio!;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function PodcastScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const { data: feed, isLoading, refetch } = useGetPodcasts({
    query: { queryKey: getGetPodcastsQueryKey(), staleTime: 5 * 60 * 1000, retry: 1 },
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingGuid, setPlayingGuid] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [currentEp, setCurrentEp] = useState<PodcastEpisode | null>(null);

  // Wire up web audio callbacks once
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = getWebAudio();
    const onPlaying = () => setPlayState("playing");
    const onPause = () => {
      if (!el.ended) setPlayState((s) => (s === "playing" ? "paused" : s));
    };
    const onEnded = () => {
      setPlayState("idle");
      setPlayingGuid(null);
    };
    const onError = () => {
      setPlayState("idle");
      setPlayingGuid(null);
    };
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS === "web") {
        const el = _webAudio;
        if (el) { el.pause(); el.src = ""; }
      } else {
        soundRef.current?.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const stopCurrent = useCallback(async () => {
    if (Platform.OS === "web") {
      const el = _webAudio;
      if (el) { el.pause(); el.src = ""; }
    } else if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setPlayingGuid(null);
    setPlayState("idle");
  }, []);

  const handlePlay = useCallback(
    async (ep: PodcastEpisode) => {
      if (Platform.OS === "web") {
        const el = getWebAudio();

        if (playingGuid === ep.guid) {
          // Toggle pause/play — these are sync and safe inside gesture
          if (el.paused) {
            el.play().catch(() => {});
            setPlayState("playing");
          } else {
            el.pause();
            setPlayState("paused");
          }
          return;
        }

        // Switch to a new track: pause, swap src, play — all sync
        el.pause();
        el.src = ep.audioUrl;
        setCurrentEp(ep);
        setPlayingGuid(ep.guid);
        setPlayState("loading");
        el.load();
        el.play().catch(() => {
          setPlayState("idle");
          setPlayingGuid(null);
        });
        return;
      }

      // ── Native toggle ────────────────────────────────────────────────────
      if (playingGuid === ep.guid) {
        if (playState === "playing") {
          await soundRef.current?.pauseAsync();
          setPlayState("paused");
        } else {
          await soundRef.current?.playAsync();
          setPlayState("playing");
        }
        return;
      }

      // ── Native new episode ───────────────────────────────────────────────
      await stopCurrent();
      setCurrentEp(ep);
      setPlayingGuid(ep.guid);
      setPlayState("loading");

      // setAudioModeAsync can fail on some Android versions; isolate it.
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("[Audio] setAudioModeAsync failed (non-fatal):", e);
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: ep.audioUrl },
          { shouldPlay: false, progressUpdateIntervalMillis: 500 },
          (s) => {
            if (!s.isLoaded) {
              if (s.error) {
                console.error("[Audio] playback error:", s.error);
                setPlayState("idle");
                setPlayingGuid(null);
              }
            } else if (s.didJustFinish) {
              setPlayState("idle");
              setPlayingGuid(null);
            } else if (s.isPlaying) {
              setPlayState("playing");
            }
          }
        );
        soundRef.current = sound;
        await sound.playAsync();
        setPlayState("playing");
      } catch (e) {
        console.error("[Audio] createAsync/playAsync failed:", e);
        setPlayState("idle");
        setPlayingGuid(null);
      }
    },
    [playingGuid, playState, stopCurrent]
  );

  const episodes = feed?.episodes ?? [];
  const hasEpisodes = episodes.length > 0;
  const showMini = currentEp !== null && playState !== "idle";

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.playerBg },
    header: { paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 16 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    headerIcon: {
      width: 44, height: 44, borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 24, fontWeight: "700" as const, color: colors.playerText },
    headerSub: { fontSize: 13, color: colors.playerMuted, marginTop: 2 },
    divider: { height: 1, backgroundColor: "#1E1E1E" },
    list: { flex: 1 },
    listContent: { paddingTop: 8, paddingBottom: bottomPad + (showMini ? 80 : 0) },

    aboutCard: {
      marginHorizontal: 16, marginTop: 16, marginBottom: 4,
      borderRadius: 16, overflow: "hidden" as const,
    },
    aboutGradient: { flexDirection: "row", gap: 14, padding: 16, alignItems: "center" },
    aboutCover: { width: 88, height: 88, borderRadius: 10, backgroundColor: "#1A1A1A" },
    aboutInfo: { flex: 1 },
    aboutTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.playerText },
    aboutHost: { fontSize: 13, color: colors.primary, marginTop: 2 },
    aboutDesc: { fontSize: 12, color: "#AAAAAA", marginTop: 4, lineHeight: 17 },
    aboutBadge: {
      flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8,
      alignSelf: "flex-start" as const,
      backgroundColor: "rgba(232,6,14,0.15)",
      borderWidth: 1, borderColor: "rgba(232,6,14,0.3)",
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    aboutBadgeText: { fontSize: 11, color: colors.primary, fontWeight: "600" as const },

    openWebBtn: {
      marginHorizontal: 16, marginTop: 12,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#2A2A2A",
      paddingVertical: 12, borderRadius: 12,
    },
    openWebText: { color: colors.playerText, fontSize: 14, fontWeight: "600" as const },

    sectionHeader: {
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    sectionTitle: {
      fontSize: 13, fontWeight: "600" as const, color: colors.playerMuted,
      letterSpacing: 1.2, textTransform: "uppercase" as const,
    },
    episodeCount: { fontSize: 12, color: "#444" },

    featuredCard: {
      marginHorizontal: 16, marginTop: 12, marginBottom: 4,
      borderRadius: 16, overflow: "hidden" as const, backgroundColor: "#1A1A1A",
    },
    featuredGradient: { padding: 16, gap: 10 },
    featuredImage: { width: "100%", height: 160, borderRadius: 10 },
    featuredBadge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      alignSelf: "flex-start" as const,
      backgroundColor: colors.primary,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    featuredBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.8 },
    featuredTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.playerText, lineHeight: 22 },
    featuredMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
    featuredMetaText: { fontSize: 12, color: colors.playerMuted },
    dot: { color: "#444", fontSize: 10 },
    featuredDesc: { fontSize: 12, color: "#AAAAAA", lineHeight: 17 },
    featuredPlayBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
      alignSelf: "flex-start" as const, marginTop: 2,
    },
    featuredPlayText: { color: "#FFF", fontSize: 13, fontWeight: "700" as const },

    episodeRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    },
    episodeThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#1A1A1A" },
    episodeInfo: { flex: 1 },
    episodeTitle: { fontSize: 14, fontWeight: "600" as const, color: colors.playerText, lineHeight: 19 },
    episodeTitlePlaying: { color: colors.primary },
    episodeMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    episodeMetaText: { fontSize: 12, color: colors.playerMuted },
    episodePlayBtn: {
      width: 34, height: 34, borderRadius: 17, backgroundColor: "#1E1E1E",
      alignItems: "center", justifyContent: "center",
    },
    episodePlayBtnActive: { backgroundColor: colors.primary },
    rowDivider: { height: 1, backgroundColor: "#151515", marginLeft: 84 },

    loadingContainer: { padding: 40, alignItems: "center", gap: 12 },
    loadingText: { color: colors.playerMuted, fontSize: 14 },

    miniPlayer: {
      position: "absolute" as const,
      bottom: bottomPad - (Platform.OS === "web" ? 0 : 10),
      left: 0, right: 0,
      backgroundColor: "#1A1A1A", borderTopWidth: 1, borderTopColor: "#2A2A2A",
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    },
    miniThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: "#111" },
    miniInfo: { flex: 1 },
    miniTitle: { fontSize: 13, fontWeight: "600" as const, color: colors.playerText },
    miniSub: { fontSize: 11, color: colors.playerMuted, marginTop: 2 },
    miniBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    miniClose: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: "#2A2A2A",
      alignItems: "center", justifyContent: "center",
    },
  });

  const AboutCard = () => (
    <>
      <View style={styles.aboutCard}>
        <LinearGradient colors={["#1A0505", "#141414"]} style={styles.aboutGradient}>
          <Image source={COVER_IMAGE} style={styles.aboutCover} contentFit="cover" />
          <View style={styles.aboutInfo}>
            <Text style={styles.aboutTitle}>Luut Podcast</Text>
            <Text style={styles.aboutHost}>Luut Schraal</Text>
            <Text style={styles.aboutDesc} numberOfLines={2}>
              Wekelijks een nieuwe aflevering, elke zondagochtend om 09:30 op Radio Starlight Urk.
            </Text>
            <View style={styles.aboutBadge}>
              <Feather name="radio" size={10} color={colors.primary} />
              <Text style={styles.aboutBadgeText}>Elke zondag · 09:30</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </>
  );

  const renderFeatured = (ep: PodcastEpisode) => {
    const isActive = playingGuid === ep.guid;
    const epPlaying = isActive && playState === "playing";
    const epLoading = isActive && playState === "loading";

    return (
      <View style={styles.featuredCard}>
        <LinearGradient colors={["#1A0505", "#1A1A1A"]} style={styles.featuredGradient}>
          <View style={styles.featuredBadge}>
            <Feather name="mic" size={10} color="#FFF" />
            <Text style={styles.featuredBadgeText}>NIEUWSTE AFLEVERING</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={2}>{ep.title}</Text>
          <View style={styles.featuredMeta}>
            <Text style={styles.featuredMetaText}>{formatDate(ep.date)}</Text>
            {ep.duration ? (
              <><Text style={styles.dot}>•</Text><Text style={styles.featuredMetaText}>{ep.duration}</Text></>
            ) : null}
          </View>
          {ep.description ? (
            <Text style={styles.featuredDesc} numberOfLines={2}>{ep.description}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.featuredPlayBtn, pressed && { opacity: 0.8 }]}
            onPress={() => handlePlay(ep)}
          >
            {epLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Feather name={epPlaying ? "pause" : "play"} size={14} color="#FFF" />
            )}
            <Text style={styles.featuredPlayText}>
              {epLoading ? "Laden…" : epPlaying ? "Pauzeer" : "Afspelen"}
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    );
  };

  const renderEpisode = ({ item, index }: { item: PodcastEpisode; index: number }) => {
    if (index === 0) return null;
    const isActive = playingGuid === item.guid;
    const epPlaying = isActive && playState === "playing";
    const epLoading = isActive && playState === "loading";

    return (
      <>
        <Pressable
          style={({ pressed }) => [styles.episodeRow, pressed && { opacity: 0.75 }]}
          onPress={() => handlePlay(item)}
        >
          <Image
            source={FALLBACK_IMAGE}
            style={styles.episodeThumb}
            contentFit="cover"
          />
          <View style={styles.episodeInfo}>
            <Text style={[styles.episodeTitle, isActive && styles.episodeTitlePlaying]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.episodeMeta}>
              <Text style={styles.episodeMetaText}>{formatDate(item.date)}</Text>
              {item.duration ? (
                <><Text style={styles.dot}>•</Text><Text style={styles.episodeMetaText}>{item.duration}</Text></>
              ) : null}
            </View>
          </View>
          <View style={[styles.episodePlayBtn, isActive && styles.episodePlayBtnActive]}>
            {epLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Feather
                name={epPlaying ? "pause" : "play"}
                size={14}
                color={isActive ? "#FFF" : colors.playerMuted}
              />
            )}
          </View>
        </Pressable>
        <View style={styles.rowDivider} />
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Feather name="mic" size={22} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Luut Podcast</Text>
            <Text style={styles.headerSub}>Elke zondag · 09:30</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />

      {isLoading ? (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <>
              <AboutCard />
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Afleveringen laden…</Text>
              </View>
            </>
          )}
        />
      ) : !hasEpisodes ? (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <>
              <AboutCard />
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Afleveringen</Text>
                <Pressable onPress={() => refetch()}>
                  <Feather name="refresh-cw" size={14} color={colors.playerMuted} />
                </Pressable>
              </View>
              {[1, 2, 3, 4].map((i) => (
                <View key={i}>
                  <View style={styles.episodeRow}>
                    <View style={[styles.episodeThumb, { opacity: 0.15 + i * 0.05 }]} />
                    <View style={styles.episodeInfo}>
                      <View style={{ height: 14, width: `${85 - i * 8}%`, backgroundColor: "#1E1E1E", borderRadius: 7 }} />
                      <View style={{ height: 11, width: "40%", backgroundColor: "#181818", borderRadius: 6, marginTop: 6 }} />
                    </View>
                    <View style={[styles.episodePlayBtn, { backgroundColor: "#1A1A1A" }]} />
                  </View>
                  <View style={styles.rowDivider} />
                </View>
              ))}
            </>
          )}
        />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={episodes}
          keyExtractor={(ep) => ep.guid}
          ListHeaderComponent={() => (
            <>
              <AboutCard />
              {renderFeatured(episodes[0])}
              {episodes.length > 1 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Alle afleveringen</Text>
                  <Text style={styles.episodeCount}>{episodes.length}</Text>
                </View>
              )}
            </>
          )}
          renderItem={renderEpisode}
          showsVerticalScrollIndicator={false}
        />
      )}

      {showMini && currentEp && (
        <View style={styles.miniPlayer}>
          <Image
            source={FALLBACK_IMAGE}
            style={styles.miniThumb}
            contentFit="cover"
          />
          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>{currentEp.title}</Text>
            <Text style={styles.miniSub}>
              {playState === "loading" ? "Laden…" : playState === "playing" ? "▶ Speelt af" : "⏸ Gepauzeerd"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={styles.miniBtn} onPress={() => currentEp && handlePlay(currentEp)}>
              {playState === "loading" ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name={playState === "playing" ? "pause" : "play"} size={16} color="#FFF" />
              )}
            </Pressable>
            <Pressable style={styles.miniClose} onPress={stopCurrent}>
              <Feather name="x" size={14} color={colors.playerMuted} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
