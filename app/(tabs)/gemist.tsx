import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useGetGemist,
  getGetGemistQueryKey,
  type GemistEpisode,
} from "@/lib/api-client";

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const SHOW_NAME_MAP: Record<string, string> = {
  HFTH: "Hits From The Heartland",
  Xvibe: "The X Vibe",
  "Club Remember": "Club Remember 80's",
  "Black en Blues": "Black & Blues",
  "Radioshow Ramon en Mathieu": "Radioshow Ramon & Mathieu",
};

function cleanShowName(raw: string): string {
  return SHOW_NAME_MAP[raw] ?? raw;
}

type PlayState = "idle" | "loading" | "playing" | "paused";

// Flat list item types
type SectionHeaderItem = { kind: "header"; showName: string; episodeCount: number };
type EpisodeItem = { kind: "episode"; ep: GemistEpisode; showName: string };
type ListItem = SectionHeaderItem | EpisodeItem;

// ─── Singleton web audio element ─────────────────────────────────────────────
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

export default function GemistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const { data: feed, isLoading, refetch } = useGetGemist({
    query: { queryKey: getGetGemistQueryKey(), staleTime: 5 * 60 * 1000, retry: 1 },
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingGuid, setPlayingGuid] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [currentEp, setCurrentEp] = useState<GemistEpisode | null>(null);
  const [currentShow, setCurrentShow] = useState<string>("");

  // Wire web audio callbacks once
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = getWebAudio();
    const onPlaying = () => setPlayState("playing");
    const onEnded = () => { setPlayState("idle"); setPlayingGuid(null); };
    const onError = () => { setPlayState("idle"); setPlayingGuid(null); };
    el.addEventListener("playing", onPlaying);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (Platform.OS === "web") {
        if (_webAudio) { _webAudio.pause(); _webAudio.src = ""; }
      } else {
        soundRef.current?.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const stopCurrent = useCallback(async () => {
    if (Platform.OS === "web") {
      if (_webAudio) { _webAudio.pause(); _webAudio.src = ""; }
    } else if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setPlayingGuid(null);
    setPlayState("idle");
  }, []);

  const handlePlay = useCallback(
    async (ep: GemistEpisode, showName: string) => {
      if (Platform.OS === "web") {
        const el = getWebAudio();
        if (playingGuid === ep.guid) {
          if (el.paused) {
            el.play().catch(() => {});
            setPlayState("playing");
          } else {
            el.pause();
            setPlayState("paused");
          }
          return;
        }
        el.pause();
        el.src = ep.audioUrl;
        setCurrentEp(ep);
        setCurrentShow(showName);
        setPlayingGuid(ep.guid);
        setPlayState("loading");
        el.load();
        el.play().catch(() => { setPlayState("idle"); setPlayingGuid(null); });
        return;
      }

      // Native toggle
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

      // Native new episode
      await stopCurrent();
      setCurrentEp(ep);
      setCurrentShow(showName);
      setPlayingGuid(ep.guid);
      setPlayState("loading");

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

  // Flatten shows → [{kind:'header',...}, {kind:'episode',...}, ...]
  const listData = useMemo<ListItem[]>(() => {
    if (!feed?.shows) return [];
    const items: ListItem[] = [];
    for (const show of feed.shows) {
      const name = cleanShowName(show.showName);
      items.push({ kind: "header", showName: name, episodeCount: show.episodes.length });
      for (const ep of show.episodes) {
        items.push({ kind: "episode", ep, showName: show.showName });
      }
    }
    return items;
  }, [feed]);

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

    sectionHeader: {
      paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    sectionTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.playerText },
    episodeCount: { fontSize: 12, color: "#555" },

    episodeRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 11, gap: 12,
    },
    showDot: {
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: colors.primary, marginLeft: 3,
    },
    episodeInfo: { flex: 1 },
    episodeTitle: { fontSize: 14, fontWeight: "600" as const, color: colors.playerText, lineHeight: 19 },
    episodeTitlePlaying: { color: colors.primary },
    episodeMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    episodeMetaText: { fontSize: 12, color: colors.playerMuted },
    dot: { color: "#333", fontSize: 10 },
    episodePlayBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E1E1E",
      alignItems: "center", justifyContent: "center",
    },
    episodePlayBtnActive: { backgroundColor: colors.primary },
    rowDivider: { height: 1, backgroundColor: "#151515", marginLeft: 42 },

    loadingContainer: { padding: 40, alignItems: "center", gap: 12 },
    loadingText: { color: colors.playerMuted, fontSize: 14 },
    emptyContainer: { padding: 40, alignItems: "center", gap: 12 },
    emptyText: { color: colors.playerMuted, fontSize: 14 },

    miniPlayer: {
      position: "absolute" as const,
      bottom: bottomPad - (Platform.OS === "web" ? 0 : 10),
      left: 0, right: 0,
      backgroundColor: "#1A1A1A", borderTopWidth: 1, borderTopColor: "#2A2A2A",
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    },
    miniIconWrap: {
      width: 44, height: 44, borderRadius: 6,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
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

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "header") {
      return (
        <LinearGradient colors={["#1A0505", colors.playerBg]} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.showName}</Text>
          <Text style={styles.episodeCount}>{item.episodeCount} {item.episodeCount === 1 ? "deel" : "delen"}</Text>
        </LinearGradient>
      );
    }

    const { ep, showName } = item;
    const isActive = playingGuid === ep.guid;
    const epPlaying = isActive && playState === "playing";
    const epLoading = isActive && playState === "loading";

    return (
      <>
        <Pressable
          style={({ pressed }) => [styles.episodeRow, pressed && { opacity: 0.75 }]}
          onPress={() => handlePlay(ep, showName)}
        >
          <View style={styles.showDot} />
          <View style={styles.episodeInfo}>
            <Text style={[styles.episodeTitle, isActive && styles.episodeTitlePlaying]} numberOfLines={2}>
              {ep.title}
            </Text>
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
            <Feather name="clock" size={22} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Uitzending Gemist</Text>
            <Text style={styles.headerSub}>Beluister uitzendingen terug</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Programma's laden…</Text>
        </View>
      ) : !listData.length ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={32} color={colors.playerMuted} />
          <Text style={styles.emptyText}>Geen uitzendingen gevonden</Text>
          <Pressable onPress={() => refetch()} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.primary, fontSize: 14 }}>Opnieuw proberen</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={listData}
          keyExtractor={(item, index) =>
            item.kind === "header" ? `hdr-${item.showName}` : `ep-${item.ep.guid}-${index}`
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      {showMini && currentEp && (
        <View style={styles.miniPlayer}>
          <View style={styles.miniIconWrap}>
            <Feather name="clock" size={20} color="#FFF" />
          </View>
          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>{currentEp.title}</Text>
            <Text style={styles.miniSub}>
              {cleanShowName(currentShow)} · {playState === "loading" ? "Laden…" : playState === "playing" ? "▶ Speelt af" : "⏸ Gepauzeerd"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={styles.miniBtn} onPress={() => handlePlay(currentEp, currentShow)}>
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
