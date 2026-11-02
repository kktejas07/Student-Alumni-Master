// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, ActivityIndicator
} from 'react-native';
import {
  Award, Sparkles, Printer, Download, CheckCircle2, ShieldCheck,
  Upload, Layers, Sliders, RefreshCw, Copy, FileText, Image as ImageIcon,
  UserCheck, Building2, GraduationCap, Star, Palette
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { Badge } from '../atoms';
import { GradientButton, SecondaryButton, Card, IconBox } from '../applekit';
import { request } from '@/src/models/services/api';

type EventSeries = 'echo_2026' | 'axiss_2026' | 'sa_platform';

interface TemplateDef {
  id: string;
  name: string;
  category: string;
  seriesPrefix: string;
  defaultId: string;
  defaultTitle: string;
  defaultRecipient: string;
  defaultRole: string;
  defaultDept: string;
  defaultInst: string;
  defaultProg: string;
  defaultTerm: string;
  defaultCite: string;
  defaultIssueDate: string;
  colorScheme: 'purple' | 'green' | 'gold' | 'dark' | 'amber' | 'ember';
}

const TEMPLATES: TemplateDef[] = [
  // ── ECHO 2026 Series ──
  {
    id: 'certA',
    name: 'Campus Ambassador (Rosette)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-AMB-2026',
    defaultId: 'SA-AMB-2026-0001',
    defaultTitle: 'Campus Ambassador',
    defaultRecipient: 'Sri Valli',
    defaultRole: 'Campus Ambassador',
    defaultDept: 'CSE, III Year',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'for leading the StudentAlumni presence on campus — mobilising peers, running programme activities and representing the student body with initiative, reliability and genuine care for the community.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'purple'
  },
  {
    id: 'certA2',
    name: 'Campus Ambassador (Pass / Stub)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-AMB-2026',
    defaultId: 'SA-AMB-2026-0002',
    defaultTitle: 'Campus Ambassador',
    defaultRecipient: 'Mani Krishna',
    defaultRole: 'Campus Ambassador',
    defaultDept: 'IT, IV Year',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'is appointed a Campus Ambassador of StudentAlumni for the term 2026–27, in recognition of student leadership shown through ECHO 2026 × HackWave 3.0.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'purple'
  },
  {
    id: 'certA3',
    name: 'Campus Ambassador (Rail)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-AMB-2026',
    defaultId: 'SA-AMB-2026-0003',
    defaultTitle: 'Campus Ambassador',
    defaultRecipient: 'Kavya Sharma',
    defaultRole: 'Campus Ambassador',
    defaultDept: 'ECE, III Year',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'for leading the StudentAlumni presence on campus with dedication and peer community engagement.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'purple'
  },
  {
    id: 'certE',
    name: 'Award of Excellence (Portrait Laureate)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-EXC-2026',
    defaultId: 'SA-EXC-2026-0001',
    defaultTitle: 'Award of Excellence',
    defaultRecipient: 'Sethu Rohith',
    defaultRole: 'Lead Campus Ambassador',
    defaultDept: 'VJ DQ Student Chapter',
    defaultInst: 'VNR Vignana Jyothi Institute of Engineering & Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'for standing out among the campus ambassador cohort through initiative, consistency and the quality of work delivered, setting the standard for the rest of the team.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'gold'
  },
  {
    id: 'certB',
    name: 'Faculty Mentor (Laurel Centered)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-FAC-2026',
    defaultId: 'SA-FAC-2026-0001',
    defaultTitle: 'Faculty Mentor',
    defaultRecipient: 'Dr. P. Kumar',
    defaultRole: 'Professor & Faculty Mentor',
    defaultDept: 'Department of Computer Science & Engineering',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'for guiding students through the programme with generosity and rigour — shaping teams, opening doors and giving time well beyond what the role required. The programme ran on this support.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'green'
  },
  {
    id: 'certB2',
    name: 'Faculty Mentor (Rail Style)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-FAC-2026',
    defaultId: 'SA-FAC-2026-0002',
    defaultTitle: 'Faculty Coordinator',
    defaultRecipient: 'Prof. S. Reddy',
    defaultRole: 'Associate Professor',
    defaultDept: 'Department of AI & Data Science',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'recognised as a Faculty Coordinator of ECHO 2026 × HackWave 3.0 for exceptional mentorship and campus coordination.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'green'
  },
  {
    id: 'certF1',
    name: 'Faculty Leadership (Ribbon Banner)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-FLH-2026',
    defaultId: 'SA-FLH-2026-0001',
    defaultTitle: 'Campus & ECHO Faculty Leader',
    defaultRecipient: 'Dr. Ramesh Chandra',
    defaultRole: 'Dean of Student Affairs',
    defaultDept: 'Academic Leadership',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'for leading the faculty side of the programme on campus — rallying departments, holding coordination together across students and staff, and giving the initiative the institutional weight it needed to run at this scale.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'green'
  },
  {
    id: 'certF2',
    name: 'Champion of Compassion (Warm Ribbon)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-FLH-2026',
    defaultId: 'SA-FLH-2026-0002',
    defaultTitle: 'Champion of Compassion',
    defaultRecipient: 'Dr. Anita Desai',
    defaultRole: 'Professor of Humanities',
    defaultDept: 'Department of Social Initiatives',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'who turned a competition into an act of giving — proposing that part of the prize pool be directed to charity, a suggestion now carried forward as a standing element of every future edition.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'amber'
  },
  {
    id: 'certC',
    name: 'Institutional Patron (Dark Foil)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-HON-2026',
    defaultId: 'SA-HON-2026-0001',
    defaultTitle: 'Institutional Patron',
    defaultRecipient: 'Dr. A. Sharma',
    defaultRole: 'Head of Department, CSE',
    defaultDept: 'Executive Leadership',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'whose leadership made this collaboration possible — backing the programme institutionally, opening the campus to industry and setting the standard for how academia and industry build together.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'dark'
  },
  {
    id: 'certC2',
    name: 'Visionary Patron (Ivory Gold)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-HON-2026',
    defaultId: 'SA-HON-2026-0002',
    defaultTitle: 'Visionary Patron',
    defaultRecipient: 'Dr. B. Rao',
    defaultRole: 'Dean, Academics & Institutional Strategy',
    defaultDept: 'Executive Leadership',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'whose vision and institutional backing enabled seamless industry-academia collaboration across students and faculty.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'gold'
  },
  {
    id: 'certD',
    name: 'Partner Campus of Excellence (Watermark)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-CAM-2026',
    defaultId: 'SA-CAM-2026-0001',
    defaultTitle: 'Partner Campus of Excellence',
    defaultRecipient: 'Sreenidhi Institute of Science and Technology',
    defaultRole: 'Host Institution',
    defaultDept: 'Campus Administration',
    defaultInst: 'Sreenidhi Institute of Science and Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'for hosting the programme with exceptional commitment — students, faculty and leadership turning out in strength — and for building a campus culture where industry collaboration is welcomed rather than merely permitted.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'purple'
  },
  {
    id: 'certD2',
    name: 'Partner Campus Plaque (Deep Purple)',
    category: 'ECHO 2026 × HackWave 3.0',
    seriesPrefix: 'SA-CAM-2026',
    defaultId: 'SA-CAM-2026-0002',
    defaultTitle: 'Partner Campus of Excellence',
    defaultRecipient: 'VNR Vignana Jyothi Institute of Engineering & Technology',
    defaultRole: 'Host Institution',
    defaultDept: 'Campus Administration',
    defaultInst: 'VNR Vignana Jyothi Institute of Engineering & Technology',
    defaultProg: 'ECHO 2026 × HackWave 3.0',
    defaultTerm: '2026–27',
    defaultCite: 'named a Partner Campus of Excellence by StudentAlumni following ECHO 2026 for hosting the programme with exceptional commitment.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'dark'
  },

  // ── AXISS Group Series ──
  {
    id: 'cert1',
    name: 'AXISS Internship Completion (Ledger)',
    category: 'AXISS Group 2026 Series',
    seriesPrefix: 'AXG-INT-2026',
    defaultId: 'AXG-INT-2026-0117',
    defaultTitle: 'Certificate of Internship Completion',
    defaultRecipient: 'Yerraguntla Harsha Vardhan',
    defaultRole: 'Software Engineering Intern',
    defaultDept: 'Product Engineering',
    defaultInst: 'AXISS Group · Hyderabad',
    defaultProg: 'Engineering Internship 2026',
    defaultTerm: '6 Months',
    defaultCite: 'contributed to live product development across the AXISS Group portfolio, working alongside the engineering team on feature delivery, code review and release support. Throughout the internship he showed strong ownership, technical curiosity and a consistent standard of work.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'ember'
  },
  {
    id: 'cert2',
    name: 'AXISS Project Completion (Docket)',
    category: 'AXISS Group 2026 Series',
    seriesPrefix: 'AXG-PRJ-2026',
    defaultId: 'AXG-PRJ-2026-0118',
    defaultTitle: 'Certificate of Project Completion',
    defaultRecipient: 'Yerraguntla Harsha Vardhan',
    defaultRole: 'Full Stack Developer',
    defaultDept: 'Product Engineering',
    defaultInst: 'AXISS Group · Product Engineering',
    defaultProg: 'Enterprise Platform Project',
    defaultTerm: 'Phase 1 Delivery',
    defaultCite: 'took the project from requirements through architecture, implementation, testing and release, and handed over working software that met the scope and quality bar set by the AXISS Group engineering team.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'ember'
  },

  // ── StudentAlumni Platform Series ──
  {
    id: 'cert3',
    name: 'StudentAlumni Internship (Medallion)',
    category: 'StudentAlumni 2026 Series',
    seriesPrefix: 'SA-INT-2026',
    defaultId: 'SA-INT-2026-0119',
    defaultTitle: 'Certificate of Internship Completion',
    defaultRecipient: 'Yerraguntla Harsha Vardhan',
    defaultRole: 'Product Engineering Intern',
    defaultDept: 'Platform & Engagement Team',
    defaultInst: 'StudentAlumni Platform',
    defaultProg: 'Core Platform Engineering',
    defaultTerm: '6 Months',
    defaultCite: 'worked across the StudentAlumni platform — supporting the student, alumni and college portals through build, review and release — and brought steady initiative, care for detail and a collaborative way of working to the team.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'purple'
  },
  {
    id: 'cert4',
    name: 'StudentAlumni Project Completion (Panel)',
    category: 'StudentAlumni 2026 Series',
    seriesPrefix: 'SA-PRJ-2026',
    defaultId: 'SA-PRJ-2026-0120',
    defaultTitle: 'Certificate of Project Completion',
    defaultRecipient: 'Yerraguntla Harsha Vardhan',
    defaultRole: 'Lead Platform Developer',
    defaultDept: 'Engineering & Innovation',
    defaultInst: 'StudentAlumni Platform',
    defaultProg: 'NexusOS Architecture',
    defaultTerm: 'Project Delivery 2026',
    defaultCite: 'designed, built and delivered the project end to end — from requirements through implementation, testing and handover — meeting the scope and quality standards set by the StudentAlumni product team.',
    defaultIssueDate: '10 August 2026',
    colorScheme: 'purple'
  }
];

export function EchoCertificateStudio({ onSaved }: { onSaved?: (msg: string) => void }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('certA');
  const [activeEventFilter, setActiveEventFilter] = useState<string>('ALL');

  // Active Certificate Form Data
  const currentTpl = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  const [certId, setCertId] = useState(currentTpl.defaultId);
  const [recipientName, setRecipientName] = useState(currentTpl.defaultRecipient);
  const [recipientEmail, setRecipientEmail] = useState('student01@test.com');
  const [title, setTitle] = useState(currentTpl.defaultTitle);
  const [role, setRole] = useState(currentTpl.defaultRole);
  const [department, setDepartment] = useState(currentTpl.defaultDept);
  const [institution, setInstitution] = useState(currentTpl.defaultInst);
  const [programme, setProgramme] = useState(currentTpl.defaultProg);
  const [term, setTerm] = useState(currentTpl.defaultTerm);
  const [citation, setCitation] = useState(currentTpl.defaultCite);
  const [issueDate, setIssueDate] = useState(currentTpl.defaultIssueDate);
  const [bgStyle, setBgStyle] = useState<'wm' | 'tech' | 'geo' | 'none'>('wm');
  const [showHonorBadge, setShowHonorBadge] = useState(true);
  const [showSignatory2, setShowSignatory2] = useState(true);

  // Signatories
  const [sig1Name, setSig1Name] = useState('Devender V');
  const [sig1Title, setSig1Title] = useState('HR Manager, US & India');
  const [sig2Name, setSig2Name] = useState('Dr. A. Sharma');
  const [sig2Title, setSig2Title] = useState('Director & Institutional Patron');
  const [verifyContact, setVerifyContact] = useState('hr@studentalumni.ai');

  const [issuing, setIssuing] = useState(false);

  // ── AI Agents State ──
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiSyncing, setAiSyncing] = useState(false);

  const [auditResult, setAuditResult] = useState<any>(null);
  const [skillsResult, setSkillsResult] = useState<any>(null);

  // Agent 1: AI Citation Drafter
  const runAiCitationDrafter = async () => {
    setAiDrafting(true);
    try {
      const res: any = await request('/certificates/ai/draft-citation', {
        method: 'POST',
        auth: true,
        body: {
          recipient_name: recipientName,
          role: role,
          event_or_programme: programme,
          institution: institution,
          key_achievements: 'High initiative, teamwork, and technical excellence'
        }
      });
      if (res?.citation) {
        setCitation(res.citation);
        if (onSaved) onSaved(`AI Citation Drafter generated personalized citation (${res.suggested_honor})`);
      }
    } catch (e: any) {
      if (onSaved) onSaved(e?.message || 'AI Citation draft failed');
    } finally {
      setAiDrafting(false);
    }
  };

  // Agent 2: AI Tamper & Fraud Detector
  const runAiTamperAudit = async () => {
    setAiAuditing(true);
    try {
      const res: any = await request('/certificates/ai/detect-fraud', {
        method: 'POST',
        auth: true,
        body: {
          certificate_id: certId,
          recipient_name: recipientName,
          issue_date: issueDate,
          issuer: 'StudentAlumni & Institutional Network'
        }
      });
      setAuditResult(res);
      if (onSaved) onSaved(`AI Authenticity Audit: Trust Score ${res?.trust_score}% (${res?.authenticity_status})`);
    } catch (e: any) {
      if (onSaved) onSaved(e?.message || 'AI Tamper audit failed');
    } finally {
      setAiAuditing(false);
    }
  };

  // Agent 3: AI Skill Extractor & Badge Sync
  const runAiSkillSync = async () => {
    setAiSyncing(true);
    try {
      const res: any = await request('/certificates/ai/extract-skills-badges', {
        method: 'POST',
        auth: true,
        body: {
          certificate_title: title,
          citation_text: citation,
          recipient_email: recipientEmail
        }
      });
      setSkillsResult(res);
      if (onSaved) onSaved(`AI Extracted ${res?.skills?.length || 0} skills & awarded profile badges!`);
    } catch (e: any) {
      if (onSaved) onSaved(e?.message || 'AI Skill sync failed');
    } finally {
      setAiSyncing(false);
    }
  };

  // When switching templates, auto-populate defaults
  const switchTemplate = (tpl: TemplateDef) => {
    setSelectedTemplateId(tpl.id);
    setCertId(tpl.defaultId);
    setTitle(tpl.defaultTitle);
    setRecipientName(tpl.defaultRecipient);
    setRole(tpl.defaultRole);
    setDepartment(tpl.defaultDept);
    setInstitution(tpl.defaultInst);
    setProgramme(tpl.defaultProg);
    setTerm(tpl.defaultTerm);
    setCitation(tpl.defaultCite);
    setIssueDate(tpl.defaultIssueDate);
    setAuditResult(null);
    setSkillsResult(null);
  };

  const filteredTemplates = activeEventFilter === 'ALL'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category.toLowerCase().includes(activeEventFilter.toLowerCase()));

  // Issue into Platform MongoDB Registry
  const issueToPlatformRegistry = async () => {
    setIssuing(true);
    try {
      await request('/certificates/issue', {
        method: 'POST',
        auth: true,
        body: {
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          certification_name: `${title} (${programme})`,
          verification_code: certId,
          issue_date: issueDate,
          institution: institution,
          department: department,
          role: role,
          citation: citation,
          branch: department.includes('CSE') ? 'CSE' : department.includes('IT') ? 'IT' : department.includes('ECE') ? 'ECE' : 'ALL',
          metadata: {
            template_id: selectedTemplateId,
            series_prefix: currentTpl.seriesPrefix,
            programme: programme,
            term: term,
            signatory1: { name: sig1Name, title: sig1Title },
            signatory2: showSignatory2 ? { name: sig2Name, title: sig2Title } : null
          }
        }
      });
      if (onSaved) onSaved(`Certificate ${certId} issued and verifiable at /certificates/verify/${certId}`);
    } catch (e: any) {
      if (onSaved) onSaved(e?.message || 'Issuance failed');
    } finally {
      setIssuing(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <View style={s.container}>
      {/* Studio Header */}
      <View style={s.headerBanner}>
        <View style={s.hIcon}><Award size={22} color={T.accent} /></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.hTitle}>ECHO 2026 & AXISS Certificate Studio</Text>
            <Badge label="15 TEMPLATES" color="purple" />
          </View>
          <Text style={s.hSub}>
            Generate high-resolution printable & verifiable certificates across ECHO 2026, AXISS Group, and StudentAlumni series with custom signatories, medals, and background vectors.
          </Text>
        </View>
      </View>

      {/* Series & Event Filter Strip */}
      <View style={s.filterRow}>
        <Text style={s.filterLabel}>Series / Event:</Text>
        {[
          { id: 'ALL', label: 'All Series' },
          { id: 'ECHO', label: 'ECHO 2026 × HackWave 3.0' },
          { id: 'AXISS', label: 'AXISS Group 2026' },
          { id: 'StudentAlumni', label: 'StudentAlumni 2026' }
        ].map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setActiveEventFilter(f.id)}
            style={[s.filterChip, activeEventFilter === f.id && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, activeEventFilter === f.id && s.filterChipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Template Selector Carousel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tplList}>
        {filteredTemplates.map((t) => {
          const active = t.id === selectedTemplateId;
          return (
            <Pressable
              key={t.id}
              onPress={() => switchTemplate(t)}
              style={[
                s.tplCard,
                active && s.tplCardActive,
                { borderLeftColor: t.colorScheme === 'gold' ? '#F59E0B' : t.colorScheme === 'green' ? '#10B981' : t.colorScheme === 'ember' ? '#EF4444' : T.primary }
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge label={t.seriesPrefix} color="purple" />
                {active && <CheckCircle2 size={14} color="#10B981" />}
              </View>
              <Text style={s.tplName} numberOfLines={2}>{t.name}</Text>
              <Text style={s.tplCat} numberOfLines={1}>{t.category}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Main Workspace: Left Editor, Right Live Preview */}
      <View style={s.workspaceRow}>
        {/* LEFT COLUMN: Customization Controls */}
        <View style={s.leftCol}>
          <Card>
            <View style={s.cardHead}>
              <Sliders size={16} color={T.accent} />
              <Text style={s.cardHeadText}>Certificate Parameters</Text>
            </View>

            <View style={{ gap: 10, marginTop: 12 }}>
              <Text style={s.label}>Certificate Number / Series ID</Text>
              <TextInput value={certId} onChangeText={setCertId} style={s.input} />

              <Text style={s.label}>Recipient Full Name</Text>
              <TextInput value={recipientName} onChangeText={setRecipientName} style={s.input} />

              <Text style={s.label}>Recipient Email (for Registry / QR)</Text>
              <TextInput value={recipientEmail} onChangeText={setRecipientEmail} style={s.input} autoCapitalize="none" />

              <Text style={s.label}>Honour / Award Title</Text>
              <TextInput value={title} onChangeText={setTitle} style={s.input} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Role / Designation</Text>
                  <TextInput value={role} onChangeText={setRole} style={s.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Branch / Department</Text>
                  <TextInput value={department} onChangeText={setDepartment} style={s.input} />
                </View>
              </View>

              <Text style={s.label}>Institution / College Name</Text>
              <TextInput value={institution} onChangeText={setInstitution} style={s.input} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Programme / Edition</Text>
                  <TextInput value={programme} onChangeText={setProgramme} style={s.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Term / Academic Year</Text>
                  <TextInput value={term} onChangeText={setTerm} style={s.input} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.label}>Citation Text</Text>
                <Pressable
                  onPress={runAiCitationDrafter}
                  disabled={aiDrafting}
                  style={s.aiActionChip}
                >
                  {aiDrafting ? <ActivityIndicator size="small" color="#A78BFA" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={12} color="#C4B5FD" />
                      <Text style={s.aiChipText}>Draft Citation with AI</Text>
                    </View>
                  )}
                </Pressable>
              </View>
              <TextInput value={citation} onChangeText={setCitation} multiline style={[s.input, { height: 75 }]} />

              <Text style={s.label}>Date of Issue</Text>
              <TextInput value={issueDate} onChangeText={setIssueDate} style={s.input} />

              <Text style={s.label}>Background Artwork Style</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { id: 'wm', label: 'SA Watermark' },
                  { id: 'tech', label: 'Circuit Grid' },
                  { id: 'geo', label: 'Geometric' },
                  { id: 'none', label: 'Clean' }
                ].map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => setBgStyle(b.id as any)}
                    style={[s.bgChip, bgStyle === b.id && s.bgChipActive]}
                  >
                    <Text style={[s.bgChipText, bgStyle === b.id && { color: T.text }]}>{b.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* AI Agent Auxiliary Actions */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable
                  onPress={runAiTamperAudit}
                  disabled={aiAuditing}
                  style={s.aiSecondaryBtn}
                >
                  {aiAuditing ? <ActivityIndicator size="small" color="#fff" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <ShieldCheck size={13} color="#10B981" />
                      <Text style={s.aiSecondaryText}>Audit Authenticity</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  onPress={runAiSkillSync}
                  disabled={aiSyncing}
                  style={s.aiSecondaryBtn}
                >
                  {aiSyncing ? <ActivityIndicator size="small" color="#fff" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Award size={13} color="#F59E0B" />
                      <Text style={s.aiSecondaryText}>Extract Skills & Badges</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* AI Audit Feedback Card */}
              {auditResult && (
                <View style={s.aiResultCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.aiResultTitle}>🛡️ Authenticity: {auditResult.authenticity_status}</Text>
                    <Badge label={`Trust: ${auditResult.trust_score}%`} color="green" />
                  </View>
                  <Text style={s.aiResultSub}>{auditResult.recommendation}</Text>
                </View>
              )}

              {/* AI Skills Feedback Card */}
              {skillsResult && (
                <View style={s.aiResultCard}>
                  <Text style={s.aiResultTitle}>⚡ Extracted Competencies ({skillsResult.skills?.length || 0})</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {skillsResult.skills?.map((sk: any, idx: number) => (
                      <Badge key={idx} label={`${sk.name} (${sk.proficiency_level})`} color="purple" />
                    ))}
                  </View>
                </View>
              )}

              {/* Signatories */}
              <Text style={[s.label, { marginTop: 10, color: T.accent }]}>Signatories & Authorization</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Signatory 1 Name</Text>
                  <TextInput value={sig1Name} onChangeText={setSig1Name} style={s.input} />
                  <Text style={[s.label, { marginTop: 4 }]}>Signatory 1 Title</Text>
                  <TextInput value={sig1Title} onChangeText={setSig1Title} style={s.input} />
                </View>
                {showSignatory2 && (
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Signatory 2 Name</Text>
                    <TextInput value={sig2Name} onChangeText={setSig2Name} style={s.input} />
                    <Text style={[s.label, { marginTop: 4 }]}>Signatory 2 Title</Text>
                    <TextInput value={sig2Title} onChangeText={setSig2Title} style={s.input} />
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={{ gap: 8, marginTop: 14 }}>
                <GradientButton onPress={issueToPlatformRegistry} loading={issuing}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={15} color="#fff" />
                    <Text style={s.btnText}>Issue to Verifiable Registry</Text>
                  </View>
                </GradientButton>

                <SecondaryButton onPress={handlePrint}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Printer size={15} color="#fff" />
                    <Text style={s.secBtnText}>Print / Save as PDF (A4 Landscape)</Text>
                  </View>
                </SecondaryButton>
              </View>
            </View>
          </Card>
        </View>

        {/* RIGHT COLUMN: Live High-Resolution Certificate Canvas Preview */}
        <View style={s.rightCol}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color={T.accent} />
                <Text style={s.cardHeadText}>Live WYSIWYG Preview ({currentTpl.name})</Text>
              </View>
              <Badge label="297mm × 210mm (A4 Landscape)" color="purple" />
            </View>

            {/* High Fidelity Certificate Stage */}
            <View style={s.certStageWrapper}>
              <View
                style={[
                  s.certChassis,
                  currentTpl.colorScheme === 'dark' ? s.certDark : currentTpl.colorScheme === 'green' ? s.certGreen : currentTpl.colorScheme === 'ember' ? s.certEmber : s.certPurple
                ]}
              >
                {/* Top Border Header / Band */}
                <View style={s.certBand}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={s.certLogoBox}>
                      <Text style={{ color: T.text, fontFamily: FONTS.xbold, fontSize: 13 }}>SA</Text>
                    </View>
                    <View>
                      <Text style={s.certBrandText}>StudentAlumni</Text>
                      <Text style={s.certBrandSub}>National Accreditation & Industry Network</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.certNoLabel}>CERTIFICATE NO.</Text>
                    <Text style={s.certNoValue}>{certId}</Text>
                  </View>
                </View>

                {/* Ribbon / Kicker */}
                <View style={s.certKickerRow}>
                  <View style={s.certKickerPill}>
                    <Text style={s.certKickerText}>CERTIFICATE OF RECOGNITION</Text>
                  </View>
                </View>

                {/* Certificate Title */}
                <Text style={s.certTitleDisplay}>{title}</Text>

                {/* Decorative Line */}
                <View style={s.certOrnRow}>
                  <View style={s.certOrnLine} />
                  <View style={s.certOrnGem} />
                  <View style={s.certOrnLine} />
                </View>

                {/* Recipient Presentation */}
                <Text style={s.certLead}>THIS IS PROUDLY PRESENTED TO</Text>
                <Text style={s.certRecipientName}>{recipientName}</Text>
                <Text style={s.certRecipientMeta}>{role} · {department}</Text>
                <Text style={s.certInstText}>{institution}</Text>

                {/* Citation Body */}
                <Text style={s.certCitationBody}>{citation}</Text>

                {/* Facts Strip */}
                <View style={s.certFactsStrip}>
                  <View style={s.certFactItem}>
                    <Text style={s.certFactKey}>PROGRAMME</Text>
                    <Text style={s.certFactVal}>{programme}</Text>
                  </View>
                  <View style={s.certFactItem}>
                    <Text style={s.certFactKey}>TERM / PERIOD</Text>
                    <Text style={s.certFactVal}>{term}</Text>
                  </View>
                  <View style={s.certFactItem}>
                    <Text style={s.certFactKey}>DATE OF ISSUE</Text>
                    <Text style={s.certFactVal}>{issueDate}</Text>
                  </View>
                </View>

                {/* Signatures & Seal Row */}
                <View style={s.certFootRow}>
                  <View style={s.certSigBlock}>
                    <Text style={s.certSigScript}>{sig1Name}</Text>
                    <View style={s.certSigLine} />
                    <Text style={s.certSigName}>{sig1Name}</Text>
                    <Text style={s.certSigTitle}>{sig1Title}</Text>
                  </View>

                  <View style={s.certSealCenter}>
                    <View style={s.certSealCircle}>
                      <Award size={18} color="#fff" />
                      <Text style={s.certSealText}>VERIFIED</Text>
                    </View>
                  </View>

                  {showSignatory2 && (
                    <View style={s.certSigBlock}>
                      <Text style={s.certSigScript}>{sig2Name}</Text>
                      <View style={s.certSigLine} />
                      <Text style={s.certSigName}>{sig2Name}</Text>
                      <Text style={s.certSigTitle}>{sig2Title}</Text>
                    </View>
                  )}
                </View>

                {/* Verification Footer */}
                <Text style={s.certVerifyFoot}>
                  Verify online at https://studentalumni.ai/certificates/verify/{certId} · Official Academic & Industry Record
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 14 },
  headerBanner: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.08)', borderColor: SAC.border2, borderWidth: 1, alignItems: 'center' },
  hIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  hTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  hSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 18 },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  filterLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  filterChipActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  filterChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  filterChipTextActive: { color: SAC.text },

  tplList: { gap: 10, paddingVertical: 4 },
  tplCard: { width: 220, padding: 12, borderRadius: 12, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderLeftWidth: 4, gap: 4 },
  tplCardActive: { borderColor: SAC.accent, backgroundColor: 'rgba(124,58,237,0.14)' },
  tplName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12.5, marginTop: 4 },
  tplCat: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },

  workspaceRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  leftCol: { flex: 1, minWidth: 320, maxWidth: 420 },
  rightCol: { flex: 2, minWidth: 480 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeadText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 },
  label: { color: '#ccc', fontFamily: FONTS.bold, fontSize: 11.5 },
  input: { backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1, borderRadius: 8, padding: 10, color: SAC.text, fontSize: 12.5 },
  bgChip: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, alignItems: 'center' },
  bgChipActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  bgChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  btnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12.5 },
  secBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12.5 },

  // Live Canvas Chassis
  certStageWrapper: { padding: 16, backgroundColor: '#0B0A10', borderRadius: 14, borderColor: SAC.border, borderWidth: 1, alignItems: 'center' },
  certChassis: { width: '100%', maxWidth: 760, minHeight: 480, padding: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'space-between', backgroundColor: '#FAF7FE' },
  certPurple: { borderColor: '#5F259F', backgroundColor: '#FAF7FE' },
  certGreen: { borderColor: '#1B7A4C', backgroundColor: '#F5FBF7' },
  certGold: { borderColor: '#C9A227', backgroundColor: '#FCFAF3' },
  certDark: { borderColor: '#D4AF37', backgroundColor: '#131019' },
  certEmber: { borderColor: '#D8431F', backgroundColor: '#FBF8F4' },

  certBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)', paddingBottom: 10 },
  certLogoBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#5F259F', alignItems: 'center', justifyContent: 'center' },
  certBrandText: { color: '#14121A', fontFamily: FONTS.xbold, fontSize: 15 },
  certBrandSub: { color: '#6E6878', fontFamily: FONTS.med, fontSize: 10 },
  certNoLabel: { color: '#8A8394', fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.5 },
  certNoValue: { color: '#14121A', fontFamily: FONTS.bold, fontSize: 11 },

  certKickerRow: { alignItems: 'center', marginVertical: 8 },
  certKickerPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(95,37,159,0.1)' },
  certKickerText: { color: '#5F259F', fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 1 },

  certTitleDisplay: { textAlign: 'center', color: '#14121A', fontFamily: FONTS.xbold, fontSize: 24, letterSpacing: -0.5 },
  certOrnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 6 },
  certOrnLine: { width: 50, height: 1, backgroundColor: '#C8A9EC' },
  certOrnGem: { width: 6, height: 6, backgroundColor: '#5F259F', transform: [{ rotate: '45deg' }] },

  certLead: { textAlign: 'center', color: '#6E6878', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1 },
  certRecipientName: { textAlign: 'center', color: '#14121A', fontFamily: FONTS.xbold, fontSize: 22, marginVertical: 3 },
  certRecipientMeta: { textAlign: 'center', color: '#5F259F', fontFamily: FONTS.bold, fontSize: 11 },
  certInstText: { textAlign: 'center', color: '#3B3646', fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },

  certCitationBody: { textAlign: 'center', color: '#443E52', fontFamily: FONTS.med, fontSize: 11, lineHeight: 16, marginVertical: 8, paddingHorizontal: 20 },

  certFactsStrip: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2D6F2', paddingVertical: 6, marginVertical: 8 },
  certFactItem: { alignItems: 'center' },
  certFactKey: { color: '#8A8394', fontFamily: FONTS.bold, fontSize: 8.5, letterSpacing: 0.5 },
  certFactVal: { color: '#14121A', fontFamily: FONTS.bold, fontSize: 10.5, marginTop: 2 },

  certFootRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10 },
  certSigBlock: { minWidth: 110, alignItems: 'center' },
  certSigScript: { fontFamily: 'cursive', fontSize: 16, color: '#5F259F', marginBottom: 2 },
  certSigLine: { width: 100, height: 1, backgroundColor: '#14121A', marginBottom: 3 },
  certSigName: { color: '#14121A', fontFamily: FONTS.bold, fontSize: 10 },
  certSigTitle: { color: '#6E6878', fontFamily: FONTS.med, fontSize: 8.5 },

  certSealCenter: { alignItems: 'center' },
  certSealCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#5F259F', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2D6F2' },
  certSealText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 7, marginTop: 2 },

  certVerifyFoot: { textAlign: 'center', color: '#8A8394', fontFamily: FONTS.med, fontSize: 8.5, marginTop: 10 },

  // AI Agent Styling
  aiActionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.18)', borderColor: 'rgba(124,58,237,0.4)', borderWidth: 1 },
  aiChipText: { color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 11 },
  aiSecondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: SAC.border, borderWidth: 1 },
  aiSecondaryText: { color: '#eee', fontFamily: FONTS.bold, fontSize: 11.5 },
  aiResultCard: { backgroundColor: SAC.panel2, borderColor: SAC.border2, borderWidth: 1, borderRadius: 10, padding: 10, gap: 4, marginTop: 6 },
  aiResultTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  aiResultSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }
});
