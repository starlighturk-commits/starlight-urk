import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export default function RequestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleSubmit = async () => {
    if (!name.trim() || !song.trim() || !artist.trim()) {
      Alert.alert("Verzoek", "Vul je naam, artiest en nummer in.");
      return;
    }

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName("");
      setSong("");
      setArtist("");
      setMessage("");
    }, 3000);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.playerBg },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.playerText,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.playerMuted,
    },
    content: {
      paddingHorizontal: 20,
      gap: 16,
    },
    card: {
      backgroundColor: colors.playerSurface,
      borderRadius: 16,
      padding: 20,
      gap: 14,
    },
    label: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.playerMuted,
      letterSpacing: 1.2,
      textTransform: "uppercase" as const,
      marginBottom: 2,
    },
    field: {
      gap: 6,
    },
    input: {
      backgroundColor: "#2A2A2A",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.playerText,
      borderWidth: 1,
      borderColor: "#333",
    },
    textArea: {
      height: 90,
      textAlignVertical: "top" as const,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    submitBtnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700" as const,
    },
    successCard: {
      backgroundColor: "#0D1A0D",
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: "#1E4D1E",
    },
    successText: {
      color: "#4CAF50",
      fontSize: 18,
      fontWeight: "700" as const,
    },
    successSub: {
      color: colors.playerMuted,
      fontSize: 14,
      textAlign: "center" as const,
    },
    webBtn: {
      backgroundColor: colors.playerSurface,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 4,
    },
    webBtnText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    bottomSpacer: { height: bottomPad + 40 },
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Verzoekjes</Text>
        <Text style={styles.subtitle}>Stuur je muziekverzoek in</Text>
      </View>

      <View style={styles.content}>
        {submitted ? (
          <View style={styles.successCard}>
            <Feather name="check-circle" size={40} color="#4CAF50" />
            <Text style={styles.successText}>Verzoek verstuurd!</Text>
            <Text style={styles.successSub}>
              Bedankt {name}! We proberen je verzoek zo snel mogelijk te spelen.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Jouw naam</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Bijv. Jan de Vries"
                placeholderTextColor={colors.playerMuted}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Artiest</Text>
              <TextInput
                style={styles.input}
                value={artist}
                onChangeText={setArtist}
                placeholder="Naam van de artiest"
                placeholderTextColor={colors.playerMuted}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nummer</Text>
              <TextInput
                style={styles.input}
                value={song}
                onChangeText={setSong}
                placeholder="Naam van het nummer"
                placeholderTextColor={colors.playerMuted}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Berichtje (optioneel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Een persoonlijk berichtje..."
                placeholderTextColor={colors.playerMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
              onPress={handleSubmit}
            >
              <Feather name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Verstuur Verzoek</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.webBtn, pressed && { opacity: 0.7 }]}
          onPress={() => Linking.openURL("https://starlighturk.nl/verzoekjes-zondagavondradio/")}
        >
          <Feather name="external-link" size={16} color={colors.primary} />
          <Text style={styles.webBtnText}>Zondagavond Verzoeken</Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}
