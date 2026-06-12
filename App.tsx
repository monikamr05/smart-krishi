import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "assistant" | "forum">(
    "dashboard"
  );
  const [query, setQuery] = useState("");

  const cropSuggestions = useMemo(
    () => [
      { name: "Millet", confidence: "92%", reason: "Low water + high market demand" },
      { name: "Pigeon Pea", confidence: "87%", reason: "Nitrogen balance + climate fit" },
      { name: "Groundnut", confidence: "83%", reason: "Good NPK profile + stable price" },
    ],
    []
  );

  const weatherHighlights = useMemo(
    () => [
      { title: "Rainfall", value: "18 mm", subtitle: "Next 3 days" },
      { title: "Temperature", value: "31°C", subtitle: "Daytime average" },
      { title: "Soil Moisture", value: "64%", subtitle: "Field estimate" },
    ],
    []
  );

  const forumPosts = useMemo(
    () => [
      { author: "Ravi, Nashik", post: "Anyone using drip for summer onion?" },
      { author: "Meena, Satara", post: "Best natural spray for whiteflies?" },
      { author: "Arun, Nagpur", post: "Market rate updates for tur?" },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.appName}>Smart Krishi Advisor</Text>
        <Text style={styles.headerSubtitle}>
          Decision support for small and marginal farmers
        </Text>
      </View>

      <View style={styles.tabRow}>
        {(["dashboard", "assistant", "forum"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
            >
              {tab === "dashboard"
                ? "Dashboard"
                : tab === "assistant"
                ? "Chintak AI"
                : "Community"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === "dashboard" && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.cardTitle}>Crop Recommendation Engine</Text>
              <Text style={styles.cardBody}>
                ML insights from soil, weather, demand-supply, and past yield data.
              </Text>
              <View style={styles.quickMetricRow}>
                <View style={styles.metricChip}>
                  <Text style={styles.metricValue}>N: 62</Text>
                </View>
                <View style={styles.metricChip}>
                  <Text style={styles.metricValue}>P: 38</Text>
                </View>
                <View style={styles.metricChip}>
                  <Text style={styles.metricValue}>K: 47</Text>
                </View>
                <View style={styles.metricChip}>
                  <Text style={styles.metricValue}>OM: 2.1%</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Top Recommendations</Text>
              {cropSuggestions.map((crop) => (
                <View key={crop.name} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTitle}>{crop.name}</Text>
                    <Text style={styles.listCaption}>{crop.reason}</Text>
                  </View>
                  <Text style={styles.confidence}>{crop.confidence}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Location + Weather Snapshot</Text>
              <Text style={styles.locationText}>Detected: Ahmednagar, Maharashtra</Text>
              <View style={styles.weatherRow}>
                {weatherHighlights.map((item) => (
                  <View key={item.title} style={styles.weatherCard}>
                    <Text style={styles.weatherTitle}>{item.title}</Text>
                    <Text style={styles.weatherValue}>{item.value}</Text>
                    <Text style={styles.weatherSub}>{item.subtitle}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {activeTab === "assistant" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Chintak AI Assistant</Text>
            <Text style={styles.cardBody}>
              Ask for crop disease support, fertilizer planning, irrigation timing, or
              market timing guidance.
            </Text>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Type your farming question..."
              placeholderTextColor="#9AA4B2"
            />
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Ask Chintak</Text>
            </TouchableOpacity>
            <View style={styles.aiReplyCard}>
              <Text style={styles.aiReplyTitle}>Sample response</Text>
              <Text style={styles.aiReplyText}>
                Based on expected rainfall, delay urea top dressing by 3 days and use
                split application to improve uptake and reduce loss.
              </Text>
            </View>
          </View>
        )}

        {activeTab === "forum" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Farmer Community Forum</Text>
            <Text style={styles.cardBody}>
              Real-time peer support with local context and practical advice.
            </Text>
            {forumPosts.map((item) => (
              <View key={item.author + item.post} style={styles.forumCard}>
                <Text style={styles.forumAuthor}>{item.author}</Text>
                <Text style={styles.forumPost}>{item.post}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open Live Chat</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  appName: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#AFBED3",
    marginTop: 4,
    fontSize: 13,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  tabPill: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    alignItems: "center",
  },
  tabPillActive: {
    backgroundColor: "#22C55E",
  },
  tabText: {
    color: "#CBD5E1",
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#052E16",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  cardBody: {
    color: "#C4D0E2",
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  quickMetricRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricChip: {
    backgroundColor: "#1F2937",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  metricValue: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
  },
  sectionHeading: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  listTitle: {
    color: "#F1F5F9",
    fontWeight: "700",
    fontSize: 14,
  },
  listCaption: {
    color: "#AFC2D8",
    marginTop: 4,
    fontSize: 12,
  },
  confidence: {
    color: "#22C55E",
    fontWeight: "700",
  },
  locationText: {
    color: "#AFC2D8",
    marginBottom: 12,
    fontSize: 13,
  },
  weatherRow: {
    flexDirection: "row",
    gap: 8,
  },
  weatherCard: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 10,
  },
  weatherTitle: {
    color: "#94A3B8",
    fontSize: 11,
  },
  weatherValue: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
    marginVertical: 4,
  },
  weatherSub: {
    color: "#94A3B8",
    fontSize: 10,
  },
  input: {
    marginTop: 12,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#E5E7EB",
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: "#22C55E",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: "#052E16",
    fontWeight: "700",
  },
  aiReplyCard: {
    marginTop: 12,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
  },
  aiReplyTitle: {
    color: "#C7D2FE",
    fontWeight: "700",
    marginBottom: 6,
  },
  aiReplyText: {
    color: "#D1D5DB",
    lineHeight: 19,
    fontSize: 13,
  },
  forumCard: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  forumAuthor: {
    color: "#C7D2FE",
    fontWeight: "700",
    marginBottom: 6,
  },
  forumPost: {
    color: "#E2E8F0",
    fontSize: 13,
  },
  secondaryButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#22C55E",
    alignItems: "center",
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: "#86EFAC",
    fontWeight: "700",
  },
});
