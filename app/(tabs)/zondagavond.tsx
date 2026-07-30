import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Platform,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import { useState, useRef } from "react";
import WebView from "react-native-webview";
import { useColors } from "@/hooks/useColors";

interface FormData {
  name: string;
  email: string;
  type: "Kind" | "Volwassen";
  vanWie: string;
  voorWie: string;
  waarom: string;
  lied1: string;
  lied2: string;
}

function buildInjection(form: FormData): string {
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
  return `
(function() {
  // Hide everything except the captcha + submit
  var style = document.createElement('style');
  style.innerHTML = \`
    .header-container, .site-header, header, nav, .top-bar,
    .sidebar, .widget-area, aside, footer, .site-footer,
    #wpadminbar, [class*="cookie"], [class*="cmplz"],
    .breadcrumbs, .back-to-top, .go-to-top { display: none !important; }
    html, body, .site, .site-content, .content-area, .entry-content,
    main, #main, #page { background: #0A0A0A !important; color: #EEE !important; }
    .dt-layout-row, .dt-layout-content, .content-area, .entry-content, main, #main {
      width: 100% !important; max-width: 100% !important; float: none !important;
      padding: 0 12px !important; margin: 0 !important;
    }
    h1, h2, h3, h4, h5 { color: #FFF !important; }
    p, li, span, label { color: #DDD !important; }
    .wpcf7-form p:not(:last-child):not(:nth-last-child(2)) { display: none !important; }
    input[type="radio"] { accent-color: #E8060E !important; }
    .wpcf7-submit {
      background: #E8060E !important; color: #FFF !important; border: none !important;
      border-radius: 10px !important; padding: 14px 28px !important;
      font-size: 16px !important; font-weight: 700 !important; width: 100% !important;
      margin-top: 16px !important; cursor: pointer !important;
    }
    .wpcf7-response-output { color: #EEE !important; border-color: #333 !important; }
    .captcha-image { margin-bottom: 12px !important; }
    .cf7ic_instructions { color: #FFF !important; font-size: 15px !important; margin-bottom: 8px !important; display: block !important; }
    .wpcf7-radio label { color: #DDD !important; }
    svg { fill: #EEE !important; }
  \`;
  document.head.appendChild(style);

  function fillForm() {
    var n = document.querySelector('[name="your-name"]');
    if (n) n.value = '${escape(form.name)}';
    var e = document.querySelector('[name="your-email"]');
    if (e) e.value = '${escape(form.email)}';
    var radios = document.querySelectorAll('[name="Verzoekvoorkindofvolwassen"]');
    radios.forEach(function(r) { if (r.value === '${form.type}') r.checked = true; });
    var vw = document.querySelector('[name="textarea-Vanwie"]');
    if (vw) vw.value = '${escape(form.vanWie)}';
    var vv = document.querySelector('[name="voorwie"]');
    if (vv) vv.value = '${escape(form.voorWie)}';
    var wa = document.querySelector('[name="waarom"]');
    if (wa) wa.value = '${escape(form.waarom)}';
    var l1 = document.querySelector('[name="liedkeuze1"]');
    if (l1) l1.value = '${escape(form.lied1)}';
    var l2 = document.querySelector('[name="liedkeuze2"]');
    if (l2) l2.value = '${escape(form.lied2)}';

    // Watch for success
    var obs = new MutationObserver(function() {
      var out = document.querySelector('.wpcf7-response-output');
      if (out && out.textContent && out.closest('form').classList.contains('sent')) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('SENT');
      }
    });
    var form = document.querySelector('.wpcf7-form');
    if (form) obs.observe(form, { attributes: true, childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillForm);
  } else {
    fillForm();
  }
  setTimeout(fillForm, 1000);
})();
true;
`;
}

export default function ZondagavondradioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    type: "Volwassen",
    vanWie: "",
    voorWie: "",
    waarom: "",
    lied1: "",
    lied2: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showWebView, setShowWebView] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [sent, setSent] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Vereist";
    if (!form.email.trim()) e.email = "Vereist";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Ongeldig e-mailadres";
    if (!form.lied1.trim()) e.lied1 = "Vul minimaal één liedkeuze in";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSent(false);
    setShowWebView(true);
    setWebLoading(true);
  }

  function handleWebMessage(event: { nativeEvent: { data: string } }) {
    if (event.nativeEvent.data === "SENT") {
      setShowWebView(false);
      setSent(true);
      setForm({ name: "", email: "", type: "Volwassen", vanWie: "", voorWie: "", waarom: "", lied1: "", lied2: "" });
    }
  }

  const s = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.playerBg,
      paddingTop: topPad,
      paddingBottom: bottomPad,
    },
    scroll: { flex: 1 },
    inner: { padding: 20, paddingBottom: 32 },
    pageTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.playerText,
      marginBottom: 4,
    },
    pageSubtitle: {
      fontSize: 13,
      color: colors.playerMuted,
      marginBottom: 24,
    },
    divider: { height: 1, backgroundColor: "#1E1E1E", marginBottom: 24 },
    card: {
      backgroundColor: "#111111",
      borderRadius: 14,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#1E1E1E",
    },
    cardTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      color: colors.playerMuted,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: "#1A1A1A",
      color: colors.playerText,
      borderWidth: 1,
      borderColor: "#2E2E2E",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    inputFocus: { borderColor: colors.primary },
    inputError: { borderColor: "#E8060E" },
    textarea: { minHeight: 80, textAlignVertical: "top" },
    errorText: { color: "#E8060E", fontSize: 12, marginTop: 4 },
    radioRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    radioBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: "#2E2E2E",
      paddingVertical: 12,
      alignItems: "center",
    },
    radioBtnActive: { borderColor: colors.primary, backgroundColor: "#1A0505" },
    radioBtnText: { color: colors.playerMuted, fontWeight: "600", fontSize: 15 },
    radioBtnTextActive: { color: colors.primary },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    submitText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
    successCard: {
      backgroundColor: "#0D1F0D",
      borderRadius: 14,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#1A3A1A",
      marginBottom: 24,
    },
    successTitle: { color: "#4ADE80", fontSize: 20, fontWeight: "700", marginBottom: 8 },
    successText: { color: "#CCC", textAlign: "center", lineHeight: 22 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "#000",
    },
    modalHeader: {
      backgroundColor: "#111",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#222",
    },
    modalTitle: { color: "#FFF", fontWeight: "700", fontSize: 16 },
    modalClose: { color: colors.primary, fontSize: 15, fontWeight: "600" },
    modalHint: { color: "#999", fontSize: 13, textAlign: "center", padding: 12, backgroundColor: "#111" },
    webview: { flex: 1, backgroundColor: "#0A0A0A" },
    webLoading: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#0A0A0A",
      alignItems: "center",
      justifyContent: "center",
    },
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  function inputStyle(field: keyof FormData, multiline = false) {
    return [
      s.input,
      multiline && s.textarea,
      focusedField === field && s.inputFocus,
      errors[field] && s.inputError,
    ];
  }

  return (
    <View style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={s.scroll} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
          <Text style={s.pageTitle}>Zondagavondradio</Text>
          <Text style={s.pageSubtitle}>Vraag een verzoekplaat aan</Text>
          <View style={s.divider} />

          {sent && (
            <View style={s.successCard}>
              <Text style={s.successTitle}>Verzonden!</Text>
              <Text style={s.successText}>
                Je aanvraag is ontvangen. Veel plezier op zondagavond!
              </Text>
            </View>
          )}

          {/* Jouw gegevens */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Jouw gegevens</Text>

            <Text style={s.label}>Je naam *</Text>
            <TextInput
              style={inputStyle("name")}
              placeholder="Naam"
              placeholderTextColor="#555"
              value={form.name}
              onChangeText={(v) => { setForm((f) => ({ ...f, name: v })); setErrors((e) => ({ ...e, name: undefined })); }}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
            />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}

            <Text style={s.label}>Je e-mailadres *</Text>
            <TextInput
              style={inputStyle("email")}
              placeholder="email@voorbeeld.nl"
              placeholderTextColor="#555"
              value={form.email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(v) => { setForm((f) => ({ ...f, email: v })); setErrors((e) => ({ ...e, email: undefined })); }}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
            {errors.email && <Text style={s.errorText}>{errors.email}</Text>}

            <Text style={s.label}>Verzoek voor</Text>
            <View style={s.radioRow}>
              {(["Kind", "Volwassen"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.radioBtn, form.type === t && s.radioBtnActive]}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}
                >
                  <Text style={[s.radioBtnText, form.type === t && s.radioBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Aanvraag */}
          <View style={s.card}>
            <Text style={s.cardTitle}>De aanvraag</Text>

            <Text style={s.label}>Van wie?</Text>
            <TextInput
              style={inputStyle("vanWie", true)}
              placeholder="Jouw naam of groep"
              placeholderTextColor="#555"
              multiline
              value={form.vanWie}
              onChangeText={(v) => setForm((f) => ({ ...f, vanWie: v }))}
              onFocus={() => setFocusedField("vanWie")}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={s.label}>Voor wie vraag je een lied aan?</Text>
            <TextInput
              style={inputStyle("voorWie", true)}
              placeholder="Naam van de ontvanger"
              placeholderTextColor="#555"
              multiline
              value={form.voorWie}
              onChangeText={(v) => setForm((f) => ({ ...f, voorWie: v }))}
              onFocus={() => setFocusedField("voorWie")}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={s.label}>Waarom vraag je dit lied aan?</Text>
            <TextInput
              style={inputStyle("waarom", true)}
              placeholder="Vertel iets over de aanvraag"
              placeholderTextColor="#555"
              multiline
              value={form.waarom}
              onChangeText={(v) => setForm((f) => ({ ...f, waarom: v }))}
              onFocus={() => setFocusedField("waarom")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Liedkeuze */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Liedkeuze</Text>

            <Text style={s.label}>Liedkeuze 1 *</Text>
            <TextInput
              style={inputStyle("lied1", true)}
              placeholder="Artiest – Liedtitel"
              placeholderTextColor="#555"
              multiline
              value={form.lied1}
              onChangeText={(v) => { setForm((f) => ({ ...f, lied1: v })); setErrors((e) => ({ ...e, lied1: undefined })); }}
              onFocus={() => setFocusedField("lied1")}
              onBlur={() => setFocusedField(null)}
            />
            {errors.lied1 && <Text style={s.errorText}>{errors.lied1}</Text>}

            <Text style={s.label}>Liedkeuze 2 (optioneel)</Text>
            <TextInput
              style={inputStyle("lied2", true)}
              placeholder="Artiest – Liedtitel"
              placeholderTextColor="#555"
              multiline
              value={form.lied2}
              onChangeText={(v) => setForm((f) => ({ ...f, lied2: v }))}
              onFocus={() => setFocusedField("lied2")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={s.submitText}>Aanvraag versturen →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Captcha modal */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Beveiliging</Text>
            <Pressable onPress={() => setShowWebView(false)}>
              <Text style={s.modalClose}>Annuleren</Text>
            </Pressable>
          </View>
          <Text style={s.modalHint}>
            Selecteer het gevraagde pictogram en tik op "Verstuur aanvraag"
          </Text>
          <WebView
            ref={webviewRef}
            style={s.webview}
            source={{ uri: "https://starlighturk.nl/zondagavondradio/" }}
            injectedJavaScript={buildInjection(form)}
            onLoadEnd={() => setWebLoading(false)}
            onLoadStart={() => setWebLoading(true)}
            onMessage={handleWebMessage}
            javaScriptEnabled
            domStorageEnabled
            backgroundColor="#0A0A0A"
          />
          {webLoading && (
            <View style={s.webLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: "#999", marginTop: 12 }}>Formulier laden…</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
