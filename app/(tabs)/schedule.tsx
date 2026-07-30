import { useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

type Program = {
  time: string;
  name: string;
  host?: string;
  live?: boolean;
};

type Day = {
  day: string;
  short: string;
  programs: Program[];
};

const SCHEDULE: Day[] = [
  {
    day: "Maandag",
    short: "MA",
    programs: [
      { time: "00:00", name: "Starlight Nightshift" },
      { time: "04:00", name: "Starlight Loungeclub" },
      { time: "06:00", name: "Hits In De Spits" },
      { time: "10:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "12:00", name: "Lunchbreak", host: "Patrick Jacobs" },
      { time: "13:00", name: "The Middle Of The Roadshow", host: "Hans de Knegt" },
      { time: "14:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "17:00", name: "Hits From The Heartland", host: "Camille Janszen" },
      { time: "19:00", name: "Musicbox", host: "Patrick Jacobs" },
      { time: "21:00", name: "Bont", host: "Jan Berg" },
      { time: "23:00", name: "Starlight Easy Listening" },
    ],
  },
  {
    day: "Dinsdag",
    short: "DI",
    programs: [
      { time: "00:00", name: "Starlight Nightshift" },
      { time: "04:00", name: "Starlight Loungeclub" },
      { time: "06:00", name: "Hits In De Spits" },
      { time: "10:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "12:00", name: "Lunchbreak", host: "Patrick Jacobs" },
      { time: "13:00", name: "The Middle Of The Roadshow", host: "Hans de Knegt" },
      { time: "14:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "17:00", name: "Tim Voor 3", host: "Tim Verstraete" },
      { time: "18:00", name: "Nonstop Music Factory" },
      { time: "19:00", name: "De Muzikale Tijdmachine", host: "Bart vd Heuvel", live: true },
      { time: "21:00", name: "Bont", host: "Jan Berg" },
      { time: "23:00", name: "Starlight Easy Listening" },
    ],
  },
  {
    day: "Woensdag",
    short: "WO",
    programs: [
      { time: "00:00", name: "Starlight Nightshift" },
      { time: "04:00", name: "Starlight Loungeclub" },
      { time: "06:00", name: "Hits In De Spits" },
      { time: "10:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "12:00", name: "Lunchbreak", host: "Patrick Jacobs" },
      { time: "13:00", name: "The Middle Of The Roadshow", host: "Hans de Knegt" },
      { time: "14:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "17:00", name: "Rob Op Woensdag", host: "Rob Achterkamp" },
      { time: "18:00", name: "Nonstop Music Factory" },
      { time: "19:00", name: "Let's Go Back To The 70's", host: "Bart vd Heuvel", live: true },
      { time: "21:00", name: "Bont", host: "Jan Berg" },
      { time: "23:00", name: "Starlight Easy Listening" },
    ],
  },
  {
    day: "Donderdag",
    short: "DO",
    programs: [
      { time: "00:00", name: "Starlight Nightshift" },
      { time: "04:00", name: "Starlight Loungeclub" },
      { time: "06:00", name: "Hits In De Spits" },
      { time: "10:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "12:00", name: "Lunchbreak", host: "Patrick Jacobs" },
      { time: "13:00", name: "The Middle Of The Roadshow", host: "Hans de Knegt" },
      { time: "14:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "17:00", name: "Nonstop Music Factory" },
      { time: "18:00", name: "Classic Rock", host: "Adrie van Putten" },
      { time: "19:00", name: "Barts Guitar Platform", host: "Bart vd Heuvel", live: true },
      { time: "20:00", name: "Black & Blues", host: "Wim Velderman" },
      { time: "21:00", name: "Bont", host: "Jan Berg" },
      { time: "23:00", name: "Starlight Easy Listening" },
    ],
  },
  {
    day: "Vrijdag",
    short: "VR",
    programs: [
      { time: "00:00", name: "Starlight Nightshift" },
      { time: "04:00", name: "Starlight Loungeclub" },
      { time: "06:00", name: "Nonstop Music Factory" },
      { time: "07:00", name: "Good Morning!" },
      { time: "10:00", name: "Classics For Work", host: "Wout Pleijzier" },
      { time: "12:00", name: "Lunchbreak", host: "Patrick Jacobs" },
      { time: "13:00", name: "The Middle Of The Roadshow", host: "Hans de Knegt" },
      { time: "14:00", name: "Nonstop Music Factory" },
      { time: "15:00", name: "De Flitsende 50" },
      { time: "18:00", name: "De Radioshow van Ramon en Mathieu", host: "Ramon Regeling & Mathieu Sijtsma" },
      { time: "20:00", name: "Nonstop Music Factory" },
      { time: "21:00", name: "Bont", host: "Jan Berg" },
      { time: "23:00", name: "Starlight Easy Listening" },
    ],
  },
  {
    day: "Zaterdag",
    short: "ZA",
    programs: [
      { time: "00:00", name: "Starlight Nightshift" },
      { time: "04:00", name: "Starlight Loungeclub" },
      { time: "06:00", name: "Nonstop Music Factory" },
      { time: "10:00", name: "Club Remember 80's", host: "Tim Corbet" },
      { time: "12:00", name: "Huis Tuin en Keukenshow", host: "Mike Kuyt", live: true },
      { time: "14:00", name: "Muziektherapie", host: "René v/d Abeelen" },
      { time: "15:00", name: "Nonstop Music Factory" },
      { time: "17:00", name: "Lieftinck Is Los", host: "Bram Lieftinck" },
      { time: "18:00", name: "The X Vibe", host: "Jesse Sprikkelman en Ron Selles" },
      { time: "19:00", name: "De Connectie", host: "Rick de Ruiter" },
      { time: "21:00", name: "90's Forevermix", host: "DJ Henri Kicken" },
      { time: "23:00", name: "Starlight Easy Listening" },
    ],
  },
  {
    day: "Zondag",
    short: "ZO",
    programs: [
      { time: "00:00", name: "Joyful Radio op Starlight Urk" },
      { time: "09:00", name: "Opstaan Met God", host: "Luut Schraal" },
      { time: "10:00", name: "Kerkdienst" },
      { time: "12:00", name: "Joyful Radio op Starlight Urk" },
      { time: "13:00", name: "Glory Of Gospel" },
      { time: "15:00", name: "Joyful Radio op Starlight Urk" },
      { time: "19:00", name: "Zondagavondradio" },
      { time: "22:00", name: "Crossroads", host: "Kees de Haan" },
    ],
  },
];

const DAY_ORDER = ["ZO", "MA", "DI", "WO", "DO", "VR", "ZA"];

function getCurrentProgram(programs: Program[]): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let current = 0;
  for (let i = 0; i < programs.length; i++) {
    const [h, m] = programs[i].time.split(":").map(Number);
    if (h * 60 + m <= currentMinutes) current = i;
  }
  return current;
}

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const todayShort = DAY_ORDER[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(todayShort);

  const selectedSchedule = SCHEDULE.find((d) => d.short === selectedDay) ?? SCHEDULE[0];
  const currentProgramIdx = selectedDay === todayShort ? getCurrentProgram(selectedSchedule.programs) : -1;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.playerBg },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    title: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.playerText,
    },
    subtitle: {
      fontSize: 14,
      color: colors.playerMuted,
      marginTop: 2,
      marginBottom: 16,
    },
    dayPickerWrap: {
      paddingBottom: 14,
    },
    dayPickerContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    dayBtn: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 22,
      backgroundColor: colors.playerSurface,
      minWidth: 52,
      alignItems: "center",
    },
    dayBtnActive: {
      backgroundColor: colors.primary,
    },
    dayBtnText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.playerMuted,
    },
    dayBtnTextActive: {
      color: "#FFFFFF",
    },
    dayFullName: {
      paddingHorizontal: 20,
      paddingBottom: 6,
    },
    dayFullNameText: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.playerText,
      letterSpacing: 0.3,
    },
    divider: {
      height: 1,
      backgroundColor: "#1E1E1E",
      marginHorizontal: 20,
      marginBottom: 4,
    },
    programList: { flex: 1 },
    programItem: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 13,
      alignItems: "center",
      gap: 14,
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
    },
    programItemCurrent: {
      borderLeftColor: colors.primary,
      backgroundColor: "#1A0000",
    },
    timeBox: {
      width: 52,
      alignItems: "flex-start",
    },
    timeText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.primary,
      fontVariant: ["tabular-nums"],
    },
    timeSuffix: {
      fontSize: 11,
      color: colors.playerMuted,
      fontWeight: "400" as const,
    },
    programInfo: { flex: 1 },
    programName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.playerText,
      lineHeight: 20,
    },
    programNameCurrent: {
      color: "#FFFFFF",
    },
    programHost: {
      fontSize: 12,
      color: colors.playerMuted,
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 4,
      alignItems: "center",
    },
    liveBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: "#FFFFFF",
    },
    liveBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700" as const,
      letterSpacing: 0.8,
    },
    nowBadge: {
      backgroundColor: "#2A1A00",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 4,
    },
    nowBadgeText: {
      color: "#FFA500",
      fontSize: 10,
      fontWeight: "700" as const,
      letterSpacing: 0.8,
    },
    rowSeparator: {
      height: 1,
      backgroundColor: "#1A1A1A",
      marginLeft: 86,
      marginRight: 20,
    },
    bottomSpacer: { height: bottomPad + 24 },
  }), [colors, topPad, bottomPad]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Programmering</Text>
        <Text style={styles.subtitle}>Wekelijks uitzendschema</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayPickerWrap}
        contentContainerStyle={styles.dayPickerContent}
      >
        {SCHEDULE.map((d) => (
          <Pressable
            key={d.short}
            style={[styles.dayBtn, selectedDay === d.short && styles.dayBtnActive]}
            onPress={() => setSelectedDay(d.short)}
          >
            <Text style={[styles.dayBtnText, selectedDay === d.short && styles.dayBtnTextActive]}>
              {d.short}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.dayFullName}>
        <Text style={styles.dayFullNameText}>{selectedSchedule.day}</Text>
      </View>
      <View style={styles.divider} />

      <ScrollView
        ref={scrollRef}
        style={styles.programList}
        showsVerticalScrollIndicator={false}
      >
        {selectedSchedule.programs.map((prog, i) => {
          const isCurrent = i === currentProgramIdx;
          const showBadges = isCurrent || prog.live;
          return (
            <View key={i}>
              <View style={[styles.programItem, isCurrent && styles.programItemCurrent]}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{prog.time}</Text>
                  <Text style={styles.timeSuffix}>uur</Text>
                </View>
                <View style={styles.programInfo}>
                  <Text style={[styles.programName, isCurrent && styles.programNameCurrent]}>
                    {prog.name}
                  </Text>
                  {prog.host && (
                    <Text style={styles.programHost}>{prog.host}</Text>
                  )}
                  {showBadges && (
                    <View style={styles.badgeRow}>
                      {isCurrent && (
                        <View style={styles.nowBadge}>
                          <Text style={styles.nowBadgeText}>NU</Text>
                        </View>
                      )}
                      {prog.live && (
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              {i < selectedSchedule.programs.length - 1 && (
                <View style={styles.rowSeparator} />
              )}
            </View>
          );
        })}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}
