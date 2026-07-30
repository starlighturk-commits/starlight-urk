import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const STREAM_URL = "https://streams.mediaplatformurk.nl/starlighturk";

type PlayerState = "idle" | "loading" | "playing" | "error";

export function AudioPlayer() {
  const colors = useColors();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const nativeDriver = Platform.OS !== "web";

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: nativeDriver,
        }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim, nativeDriver]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: nativeDriver,
    }).start();
  }, [pulseAnim, nativeDriver]);

  useEffect(() => {
    if (state === "playing") {
      startPulse();
    } else {
      stopPulse();
    }
  }, [state, startPulse, stopPulse]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const pressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: nativeDriver,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: nativeDriver,
    }).start();
  };

  const togglePlay = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (state === "playing") {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setState("idle");
      return;
    }

    setState("loading");

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: STREAM_URL },
        { shouldPlay: true, isLooping: false }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if (status.error) {
            setState("error");
          }
        } else {
          if (status.isPlaying) {
            setState("playing");
          }
        }
      });

      soundRef.current = sound;
      setState("playing");
    } catch {
      setState("error");
    }
  };

  const isPlaying = state === "playing";
  const isLoading = state === "loading";
  const hasError = state === "error";

  const styles = StyleSheet.create({
    container: {
      alignItems: "center",
      gap: 16,
    },
    pulseRing: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary,
      opacity: 0.15,
    },
    button: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: isPlaying ? colors.primary : "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      elevation: 8,
      ...Platform.select({
        web: {
          boxShadow: `0px 4px 12px ${isPlaying ? "rgba(232,6,14,0.5)" : "rgba(232,6,14,0.2)"}`,
        },
        default: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isPlaying ? 0.5 : 0.2,
          shadowRadius: 12,
        },
      }),
    },
    label: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: isPlaying ? colors.primary : colors.mutedForeground,
      letterSpacing: 1.5,
      textTransform: "uppercase" as const,
    },
    errorText: {
      fontSize: 12,
      color: colors.destructive,
    },
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={togglePlay} onPressIn={pressIn} onPressOut={pressOut} disabled={isLoading}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {isPlaying && (
            <Animated.View
              style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
            />
          )}
          <View style={styles.button}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <Feather
                name={isPlaying ? "square" : "play"}
                size={isPlaying ? 28 : 32}
                color={isPlaying ? "#FFFFFF" : colors.primary}
              />
            )}
          </View>
        </Animated.View>
      </Pressable>

      <Text style={styles.label}>
        {isLoading ? "Verbinden..." : isPlaying ? "Playing" : "Luister Live"}
      </Text>

      {hasError && (
        <Text style={styles.errorText}>
          Verbinding mislukt. Probeer opnieuw.
        </Text>
      )}
    </View>
  );
}
