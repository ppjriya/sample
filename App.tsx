import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {
  fetchCommitDiff,
  fetchCurrentReadme,
  updateRepositoryReadme,
} from './src/services/githubService';
import {
  analyzeDocumentationRot,
  AnalysisReport,
} from './src/services/aiService';

export default function App() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [sha, setSha] = useState('');

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [report, setReport] = useState<AnalysisReport | null>(null);

  const handleRunAudit = async () => {
    if (!owner || !repo || !sha) {
      setError('Please provide all three repository inputs.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    setReport(null);

    try {
      setLoadingStage('Pulling codebase details from GitHub...');
      const commitResult = await fetchCommitDiff(
        owner.trim(),
        repo.trim(),
        sha.trim(),
      );
      const readmeResult = await fetchCurrentReadme(owner.trim(), repo.trim());

      setLoadingStage('Gemini analyzing code logic for documentation rot...');
      const aiReport = await analyzeDocumentationRot(
        commitResult.message,
        commitResult.diff,
        readmeResult,
      );

      setReport(aiReport);
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleCommitPatchToGitHub = async () => {
    if (!report || !report.updatedDocumentation) return;

    setSyncing(true);
    setError('');
    setSuccessMessage('');

    try {
      const customMessage = `docs: auto-fix documentation rot from commit ${sha.substring(
        0,
        7,
      )} via AI`;

      const success = await updateRepositoryReadme(
        owner.trim(),
        repo.trim(),
        report.updatedDocumentation,
        customMessage,
      );

      if (success) {
        setSuccessMessage(
          '🎉 Remote Source of Truth successfully synchronized on GitHub!',
        );
        // Clear report preview since repository is now updated and perfectly aligned
        setReport(null);
        Alert.alert(
          'Success',
          'README.md has been automatically updated on your main branch!',
        );
      }
    } catch (err: any) {
      setError(
        err.message || 'Failed to push documentation fix back to GitHub.',
      );
    } finally {
      setSyncing(false);
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'High':
        return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' };
      case 'Medium':
        return { bg: '#fef3c7', border: '#d97706', text: '#92400e' };
      case 'Low':
        return { bg: '#e0e7ff', border: '#4f46e5', text: '#3730a3' };
      default:
        return { bg: '#dcfce7', border: '#22c55e', text: '#166534' };
    }
  };

  const currentTheme = report
    ? getSeverityColors(report.severity)
    : { bg: '#26262f', border: '#444', text: '#fff' };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e24" />

      <View style={styles.header}>
        <Text style={styles.title}>DocRot Guardian</Text>
        <Text style={styles.subtitle}>
          Day 3: Automated Remedial Synced Loop
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="GitHub Username"
          placeholderTextColor="#666"
          value={owner}
          onChangeText={setOwner}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Repository Name"
          placeholderTextColor="#666"
          value={repo}
          onChangeText={setRepo}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Commit SHA"
          placeholderTextColor="#666"
          value={sha}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSha}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRunAudit}
        disabled={loading || syncing}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.loadingStageText}>{loadingStage}</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Audit Documentation Alignment</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>❌ {error}</Text> : null}
      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}

      <ScrollView
        style={styles.dashboardView}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {report && (
          <View>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: currentTheme.bg,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: currentTheme.border }]}>
                Rot Status: {report.severity} Rot Risk Detected
              </Text>
              <Text
                style={[styles.cardExplanation, { color: currentTheme.text }]}
              >
                {report.explanation}
              </Text>
            </View>

            {/* Day 3 Master Sync Action Component Trigger */}
            {report.hasDiscrepancy && (
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.buttonDisabled]}
                onPress={handleCommitPatchToGitHub}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.syncButtonText}>
                    🚀 Approve & Rewrite README on GitHub
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <Text style={styles.sectionHeading}>
              📄 Generated Patch Preview:
            </Text>
            <View style={styles.markdownBox}>
              <Markdown style={markdownStyles}>
                {report.updatedDocumentation}
              </Markdown>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e24' },
  header: { marginVertical: 12, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 12, color: '#818cf8', marginTop: 2 },
  inputContainer: {
    backgroundColor: '#26262f',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#17171c',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  syncButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { backgroundColor: '#3730a3' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingStageText: {
    color: '#c7d2fe',
    fontSize: 12,
    marginLeft: 10,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 13,
    paddingHorizontal: 16,
  },
  successText: {
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  dashboardView: { flex: 1, marginHorizontal: 16 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1.5, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  cardExplanation: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  sectionHeading: {
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  markdownBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    minHeight: 200,
  },
});

const markdownStyles = {
  body: { color: '#2c3e50', fontSize: 13, lineHeight: 19 },
  heading1: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eaecef',
    paddingBottom: 4,
  },
  heading2: {
    color: '#2c3e50',
    fontSize: 15,
    fontWeight: '600',
    marginVertical: 6,
  },
  code_inline: {
    backgroundColor: '#f1f5f9',
    color: '#dc2626',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  fence: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
};
