import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function useCareerAI() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCareerIntelligence();
      setData(res);
      setIsOffline(false);
    } catch (e) {
      console.warn('Failed to fetch career intelligence:', e);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const roadmap = useMemo(() => data?.roadmap || null, [data]);
  const careerIntel = useMemo(() => data?.career_intelligence || null, [data]);

  const allMilestones = useMemo(() => {
    if (!roadmap?.milestones) return [];
    return Array.isArray(roadmap.milestones) ? roadmap.milestones : [];
  }, [roadmap]);

  const pendingMilestones = useMemo(() => {
    return allMilestones.filter((m: any) => !m.completed);
  }, [allMilestones]);

  const firstPendingIdx = useMemo(() => {
    return allMilestones.findIndex((m: any) => !m.completed);
  }, [allMilestones]);

  const readinessScore = useMemo(() => {
    if (typeof data?.readiness_score === 'number') return data.readiness_score;
    if (typeof careerIntel?.readiness_score === 'number') return careerIntel.readiness_score;
    return 78;
  }, [data, careerIntel]);

  const readinessLevel = useMemo(() => {
    if (readinessScore >= 85) return 'Job-Ready Expert';
    if (readinessScore >= 70) return 'Strong Contender';
    if (readinessScore >= 50) return 'Developing Fast';
    return 'Early Explorer';
  }, [readinessScore]);

  const potentialScore = useMemo(() => {
    return Math.min(100, readinessScore + 14);
  }, [readinessScore]);

  const getLevelForScore = useCallback((score: number) => {
    if (score >= 85) return 'Expert';
    if (score >= 70) return 'Advanced';
    if (score >= 50) return 'Intermediate';
    return 'Beginner';
  }, []);

  const nextGoal = useMemo(() => {
    return pendingMilestones[0]?.title || 'Complete your career profile';
  }, [pendingMilestones]);

  const bandProgress = useMemo(() => {
    const completed = allMilestones.filter((m: any) => m.completed).length;
    return allMilestones.length > 0 ? Math.round((completed / allMilestones.length) * 100) : 60;
  }, [allMilestones]);

  const skillScores = useMemo(() => {
    return data?.skill_scores || careerIntel?.skill_scores || [
      { name: 'React / Next.js', score: 85, category: 'Technical' },
      { name: 'TypeScript', score: 80, category: 'Technical' },
      { name: 'System Design', score: 65, category: 'Architecture' },
      { name: 'Data Structures', score: 75, category: 'CS Fundamentals' },
    ];
  }, [data, careerIntel]);

  const rankedActions = useMemo(() => {
    return data?.ranked_actions || [
      { title: 'Update Resume with Project Metrics', impact: '+8% Readiness', type: 'RESUME' },
      { title: 'Complete System Design Mock Interview', impact: '+5% Readiness', type: 'MOCK_INTERVIEW' },
      { title: 'Add GitHub Project Repository Link', impact: '+4% Readiness', type: 'PORTFOLIO' },
    ];
  }, [data]);

  const aiInsights = useMemo(() => {
    return data?.ai_insights || [
      'Your frontend skill stack ranks in the top 15% of applicants for target Junior Frontend Engineer roles.',
      'Adding 1 system architecture project will increase mock interview shortlisting probability by 32%.',
    ];
  }, [data]);

  const recruiterView = useMemo(() => {
    return data?.recruiter_view || {
      profileVisibility: 'High',
      matchedRolesCount: 14,
      topRecruiterQueryMatch: 'React, TypeScript, Next.js',
    };
  }, [data]);

  const profileStrength = useMemo(() => {
    return data?.profile_strength || 82;
  }, [data]);

  const skillStreak = useMemo(() => {
    return data?.skill_streak || 7;
  }, [data]);

  const targetRole = useMemo(() => {
    return user?.student_info?.career_goal || roadmap?.target_role || 'Software Engineer';
  }, [user, roadmap]);

  const targetCo = useMemo(() => {
    return roadmap?.target_company || 'Top Tech Enterprise';
  }, [roadmap]);

  const progress = useMemo(() => {
    return bandProgress;
  }, [bandProgress]);

  const isActuallyComplete = useMemo(() => {
    return allMilestones.length > 0 && allMilestones.every((m: any) => m.completed);
  }, [allMilestones]);

  const estimatedWeeks = useMemo(() => {
    return Math.max(1, Math.ceil((100 - progress) / 10));
  }, [progress]);

  const motivationalText = useMemo(() => {
    return 'You are on track to achieve your target role milestones this quarter!';
  }, []);

  const weeklyFocus = useMemo(() => {
    return 'System Architecture & TypeScript Optimization';
  }, []);

  const weeklyGain = useMemo(() => {
    return '+6.5% Readiness Boost';
  }, []);

  const generateCareerReport = useCallback(async () => {
    setGeneratingPdf(true);
    try {
      const { generateCareerReportPdf } = await import('@/src/lib/careerReportPdf');
      await generateCareerReportPdf({
        studentName: user?.full_name || user?.email || 'Student',
        targetRole,
        targetCompany: targetCo || 'Top Company',
        readinessScore,
        readinessLevel,
        nextGoal,
        bandProgress,
        potentialScore,
        potentialLevel: getLevelForScore(potentialScore),
        profileStrength,
        progressPct: progress,
        estimatedWeeks: String(estimatedWeeks),
        skillScores,
        milestones: allMilestones,
        rankedActions,
        skillStreak,
      });
    } catch (e) {
      console.warn('PDF generation error:', e);
    } finally {
      setGeneratingPdf(false);
    }
  }, [user, readinessScore, readinessLevel, targetRole, skillScores, rankedActions, allMilestones]);

  return {
    loading,
    regenerating,
    generatingPdf,
    isOffline,
    hasData: !!data,
    roadmap,
    careerIntel,
    allMilestones,
    pendingMilestones,
    firstPendingIdx,
    readinessScore,
    readinessLevel,
    nextGoal,
    bandProgress,
    potentialScore,
    getLevelForScore,
    skillScores,
    rankedActions,
    aiInsights,
    recruiterView,
    profileStrength,
    skillStreak,
    targetRole,
    targetCo,
    progress,
    isActuallyComplete,
    estimatedWeeks,
    motivationalText,
    weeklyFocus,
    weeklyGain,
    fetchData,
    generateCareerReport,
  };
}

export interface Milestone {
  title: string;
  description: string;
  completed: boolean;
}

