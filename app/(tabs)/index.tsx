import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useColors } from "@/hooks/useColors";
import { useGetNowPlaying } from "@/lib/api-client";

const SOCIAL = [
  { icon: "facebook" as const, url: "https://www.facebook.com/StarlightUrk", label: "Facebook" },
  { icon: "twitter" as const, url: "https://twitter.com/starlighturk", label: "Twitter" },
  { icon: "instagram" as const, url: "https://www.instagram.com/starlighturk", label: "Instagram" },
];

const QUICK_LINKS = [
  { icon: "calendar" as const, label: "Programmering", url: "https://starlighturk.nl/programmering/" },
  { icon: "headphones" as const, label: "Uitzending Gemist", url: "https://starlighturk.nl/uitzending-gemist/" },
  { icon: "mic" as const, label: "De Programma\'s", url: "https://starlighturk.nl/de-programmas/" },
  { icon: "music" as const, label: "Luut Podcast", url: "https://starlighturk.nl/luut-podcast/" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: nowPlaying, isLoading: npLoading } = useGetNowPlaying({
    query: { refetchInterval: 30_000 },
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.playerBg },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 24,
      paddingBottom: 24,
      alignItems: "center",
    },
    logo: {
      width: 280,
      height: 158,
    },
    tagline: {
      fontSize: 13,
      color: colors.playerMuted,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginTop: 4,
    },
    heroSection: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 24,
    },
    liveIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      marginBottom: 32,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#FFFFFF",
    },
    liveText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700" as const,
      letterSpacing: 1.5,
    },
    nowPlaying: {
      marginTop: 32,
      alignItems: "center",
    },
    nowPlayingLabel: {
      fontSize: 11,
      color: colors.playerMuted,
      letterSpacing: 1.5,
      textTransform: "uppercase" as const,
    },
    nowPlayingStation: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.playerText,
      marginTop: 4,
    },
    nowPlayingTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.playerText,
      marginTop: 4,
      textAlign: "center" as const,
      maxWidth: 280,
    },
    listenersRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      marginTop: 6,
    },
    listenersText: {
      fontSize: 12,
      color: colors.playerMuted,
    },
    divider: {
      height: 1,
      backgroundColor: "#2A2A2A",
      marginHorizontal: 24,
      marginVertical: 8,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.playerMuted,
      letterSpacing: 1.5,
      textTransform: "uppercase" as const,
      marginBottom: 12,
    },
    socialRow: {
      flexDirection: "row",
      gap: 12,
    },
    socialBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    socialLabel: {
      fontSize: 11,
      color: "#FFFFFF",
      fontWeight: "600" as const,
    },
    quickLinksGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    quickLink: {
      backgroundColor: colors.playerSurface,
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: "48%",
    },
    quickLinkText: {
      fontSize: 13,
      color: colors.playerText,
      fontWeight: "500" as const,
      flex: 1,
    },
    footer: {
      paddingVertical: 32,
      paddingBottom: bottomPad + 32,
      alignItems: "center",
    },
    footerText: {
      fontSize: 12,
      color: "#444",
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#1A0000", colors.playerBg]}
        style={styles.header}
      >
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Pressable
          style={({ pressed }) => [{ marginTop: 6, alignItems: "center" }, pressed && { opacity: 0.7 }]}
          onPress={() => Linking.openURL("https://starlighturk.nl")}
        >
          <Text style={styles.tagline}>starlighturk.nl</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.heroSection}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        <AudioPlayer />

        <View style={styles.nowPlaying}>
          <Text style={styles.nowPlayingLabel}>Now Playing</Text>
          {npLoading ? (
            <ActivityIndicator color={colors.playerMuted} size="small" style={{ marginTop: 6 }} />
          ) : nowPlaying?.title ? (
            <Text style={styles.nowPlayingTitle} numberOfLines={2}>{nowPlaying.title}</Text>
          ) : (
            <Text style={styles.nowPlayingStation}>Radio Starlight Urk</Text>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Volg ons</Text>
        <View style={styles.socialRow}>
          {SOCIAL.map((s) => (
            <Pressable
              key={s.label}
              style={({ pressed }) => [
                styles.socialBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => Linking.openURL(s.url)}
            >
              <Feather name={s.icon} size={22} color={colors.playerText} />
              <Text style={styles.socialLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>


      <View style={styles.footer}>
        <Text style={styles.footerText}>© Radio Starlight Urk</Text>
      </View>
    </ScrollView>
  );
}
