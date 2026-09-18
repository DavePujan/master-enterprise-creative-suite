import { videoAdDiscoveryRepository } from '../repositories/videoAdDiscoveryRepository.js';
import { interviewerAiService } from './interviewerAiService.js';
import { videoAdProjectRepository } from '../repositories/videoAdProjectRepository.js';
import type {
  DiscoveryState,
  AdBrief,
  DiscoveryQuestion,
  KnownField,
  InitDiscoveryResponse,
  AnswerDiscoveryResponse,
  ConfirmBriefResponse,
  GetDiscoveryStateResponse
} from '@contracts/adSpecContracts.js';

export class BriefReconciliationService {
  /**
   * Initializes or continues discovery from a natural-language prompt.
   */
  public async initDiscovery(params: {
    projectId: string;
    workspaceId: string;
    initialPrompt: string;
    assetIds?: string[];
    availableAssets?: Array<{ id: string; name: string; role: string }>;
    brandGuidelines?: string;
  }): Promise<InitDiscoveryResponse> {
    const { projectId, workspaceId, initialPrompt, availableAssets = [], brandGuidelines } = params;

    // Load or initialize discovery session
    let session = await videoAdDiscoveryRepository.getSession(projectId, workspaceId);
    if (!session) {
      session = {
        projectId,
        workspaceId,
        status: 'DISCOVERY',
        brief: {
          brandRef: 'Brand Default',
          product: '',
          objective: undefined,
          targetAudience: undefined,
          platform: 'generic',
          desiredDurationSeconds: 15,
          aspectRatio: '16:9',
          language: 'en',
          cta: undefined,
          keyMessage: '',
          desiredResponse: '',
          tone: '',
          mustInclude: [],
          mustAvoid: [],
          referencesAndInspiration: [],
          userConstraints: []
        },
        knownFields: [],
        unknownFields: ['product', 'objective', 'targetAudience', 'cta'],
        ambiguities: [],
        questions: [],
        answers: [],
        contradictions: [],
        completeness: 0.1,
        blockingIssues: [],
        isBriefConfirmed: false,
        updatedAt: new Date().toISOString()
      };
    }

    // Run discovery analysis with prompt-injection defense
    const analysis = await interviewerAiService.analyzeDiscovery({
      initialPrompt,
      currentState: session,
      availableAssets,
      brandGuidelines
    });

    // Merge extracted fields into session brief
    const mergedBrief: Partial<AdBrief> = {
      ...session.brief,
      ...analysis.extractedFields
    };

    // Calculate unknown fields
    const unknownFields: string[] = [];
    if (!mergedBrief.product) unknownFields.push('product');
    if (!mergedBrief.objective) unknownFields.push('objective');
    if (!mergedBrief.targetAudience) unknownFields.push('targetAudience');
    if (!mergedBrief.cta) unknownFields.push('cta');
    if (!mergedBrief.tone) unknownFields.push('tone');

    // Update session state
    session.brief = mergedBrief;
    session.knownFields = this.mergeKnownFields(session.knownFields, analysis.knownFields);
    session.unknownFields = unknownFields;
    session.contradictions = analysis.contradictions;
    session.questions = analysis.questions;
    session.blockingIssues = analysis.readiness.missingBlocking;
    session.completeness = analysis.readiness.completenessScore;
    session.status = analysis.contradictions.length > 0
      ? 'BLOCKED'
      : analysis.readiness.isReady
      ? 'READY_FOR_CREATIVE'
      : 'WAITING_FOR_USER';

    await videoAdDiscoveryRepository.saveSession(session, workspaceId);

    return {
      discovery: session,
      questions: session.questions.filter(q => q.status === 'PENDING').slice(0, 3),
      summary: analysis.reasoningSummary
    };
  }

  /**
   * Processes user answers, parses natural-language or structured values,
   * detects contradictions, and dynamically recalculates the next 1-3 questions.
   */
  public async answerQuestions(params: {
    projectId: string;
    workspaceId: string;
    answers: Array<{ questionId: string; answer: string | string[] }>;
    availableAssets?: Array<{ id: string; name: string; role: string }>;
  }): Promise<AnswerDiscoveryResponse> {
    const { projectId, workspaceId, answers, availableAssets = [] } = params;

    const session = await videoAdDiscoveryRepository.getSession(projectId, workspaceId);
    if (!session) {
      throw new Error(`Discovery session for project '${projectId}' not found.`);
    }

    // If already confirmed, lock against overwrites
    if (session.isBriefConfirmed) {
      return {
        discovery: session,
        nextQuestions: [],
        summary: 'Brief has already been confirmed by user. Changes must route through revision engine.',
        isReadyForCreative: true
      };
    }

    const now = new Date().toISOString();

    // Sequentially process each answer and re-evaluate discovery state
    for (const ans of answers) {
      // Find question
      const targetQ = session.questions.find(q => q.id === ans.questionId);
      if (targetQ) {
        targetQ.status = 'ANSWERED';
      }

      session.answers.push({
        questionId: ans.questionId,
        rawAnswer: ans.answer,
        answeredAt: now
      });

      // Analyze answer impact
      const analysis = await interviewerAiService.analyzeDiscovery({
        userAnswer: { questionId: ans.questionId, rawAnswer: ans.answer },
        currentState: session,
        availableAssets
      });

      // Merge updated fields
      session.brief = {
        ...session.brief,
        ...analysis.extractedFields
      };
      session.knownFields = this.mergeKnownFields(session.knownFields, analysis.knownFields);
      session.contradictions = analysis.contradictions;

      // Filter out now-irrelevant or already answered questions, append new questions
      const remainingQuestions = analysis.questions.filter(
        newQ => !session.answers.some(a => a.questionId === newQ.id)
      );

      session.questions = remainingQuestions;
      session.blockingIssues = analysis.readiness.missingBlocking;
      session.completeness = analysis.readiness.completenessScore;
      session.status = analysis.contradictions.length > 0
        ? 'BLOCKED'
        : analysis.readiness.isReady
        ? 'READY_FOR_CREATIVE'
        : 'WAITING_FOR_USER';
    }

    // Recalculate unknown fields
    const unknownFields: string[] = [];
    if (!session.brief.product) unknownFields.push('product');
    if (!session.brief.objective) unknownFields.push('objective');
    if (!session.brief.targetAudience) unknownFields.push('targetAudience');
    if (!session.brief.cta) unknownFields.push('cta');
    session.unknownFields = unknownFields;

    await videoAdDiscoveryRepository.saveSession(session, workspaceId);

    return {
      discovery: session,
      nextQuestions: session.questions.filter(q => q.status === 'PENDING').slice(0, 3),
      summary: session.status === 'READY_FOR_CREATIVE'
        ? 'Discovery requirements complete! The brief is ready for review and confirmation.'
        : `Answer processed. ${session.questions.length} question(s) remaining.`,
      isReadyForCreative: session.status === 'READY_FOR_CREATIVE'
    };
  }

  /**
   * Retrieves current discovery state for recovery/refresh.
   */
  public async getDiscoveryState(projectId: string, workspaceId: string): Promise<GetDiscoveryStateResponse> {
    const session = await videoAdDiscoveryRepository.getSession(projectId, workspaceId);
    if (!session) {
      throw new Error(`Discovery session for project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    return {
      discovery: session,
      activeQuestions: session.questions.filter(q => q.status === 'PENDING').slice(0, 3),
      isReadyForCreative: session.status === 'READY_FOR_CREATIVE' || session.isBriefConfirmed
    };
  }

  /**
   * Confirms the validated brief. Locks fields against silent AI modification
   * and advances the project AdSpec to Version N+1 with confirmed decisions.
   */
  public async confirmBrief(params: {
    projectId: string;
    workspaceId: string;
    briefOverrides?: Partial<AdBrief>;
    userId?: string;
  }): Promise<ConfirmBriefResponse> {
    const { projectId, workspaceId, briefOverrides = {}, userId } = params;

    const session = await videoAdDiscoveryRepository.getSession(projectId, workspaceId);
    if (!session) {
      throw new Error(`Discovery session for project '${projectId}' not found.`);
    }

    // Validation: cannot confirm if blocking issues or contradictions exist
    if (session.contradictions.length > 0) {
      throw new Error(`Cannot confirm brief while unresolved contradictions exist: ${session.contradictions.map(c => c.explanation).join('; ')}`);
    }

    const mergedBrief: AdBrief = {
      brandRef: briefOverrides.brandRef || session.brief.brandRef || 'Brand Default',
      product: briefOverrides.product || session.brief.product || 'Commercial Product',
      objective: briefOverrides.objective || session.brief.objective || 'brand_awareness',
      targetAudience: briefOverrides.targetAudience || session.brief.targetAudience || { persona: 'General Audience', painPoints: [] },
      platform: briefOverrides.platform || session.brief.platform || 'generic',
      desiredDurationSeconds: briefOverrides.desiredDurationSeconds || session.brief.desiredDurationSeconds || 15,
      aspectRatio: briefOverrides.aspectRatio || session.brief.aspectRatio || '16:9',
      language: briefOverrides.language || session.brief.language || 'en',
      cta: briefOverrides.cta || session.brief.cta || { visualText: 'Learn More', actionIntent: 'click_link' },
      keyMessage: briefOverrides.keyMessage || session.brief.keyMessage || '',
      desiredResponse: briefOverrides.desiredResponse || session.brief.desiredResponse || '',
      tone: briefOverrides.tone || session.brief.tone || 'Professional and engaging',
      mustInclude: briefOverrides.mustInclude || session.brief.mustInclude || [],
      mustAvoid: briefOverrides.mustAvoid || session.brief.mustAvoid || [],
      referencesAndInspiration: briefOverrides.referencesAndInspiration || session.brief.referencesAndInspiration || [],
      userConstraints: briefOverrides.userConstraints || session.brief.userConstraints || []
    };

    if (!mergedBrief.product || mergedBrief.product === 'Default Product' || mergedBrief.product === 'Commercial Product') {
      if (!session.brief.product) {
        throw new Error('Cannot confirm brief: Product identity is blocking and must be specified.');
      }
    }

    // Mark discovery session as confirmed
    await videoAdDiscoveryRepository.confirmBrief(projectId, workspaceId, mergedBrief);

    // Fetch current AdSpec and create immutable Version N+1 with locked decisions
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    const updatedSpec = {
      ...currentSpec,
      brief: mergedBrief,
      identity: {
        ...currentSpec.identity,
        creativeState: 'brief_ready',
        updatedAt: new Date().toISOString()
      },
      // Lock user-confirmed decisions
      decisionMetadata: {
        ...currentSpec.decisionMetadata,
        'brief.product': {
          source: 'user_requested' as const,
          confidence: 1.0,
          status: 'confirmed' as const,
          locked: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: userId
        },
        'brief.objective': {
          source: 'user_requested' as const,
          confidence: 1.0,
          status: 'confirmed' as const,
          locked: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: userId
        },
        'brief.targetAudience': {
          source: 'user_requested' as const,
          confidence: 1.0,
          status: 'confirmed' as const,
          locked: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: userId
        },
        'brief.platform': {
          source: 'user_requested' as const,
          confidence: 1.0,
          status: 'confirmed' as const,
          locked: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: userId
        },
        'brief.desiredDurationSeconds': {
          source: 'user_requested' as const,
          confidence: 1.0,
          status: 'confirmed' as const,
          locked: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: userId
        }
      }
    };

    const newVersion = await videoAdProjectRepository.createVersion(
      projectId,
      workspaceId,
      updatedSpec,
      'Confirmed advertising brief from discovery interviewer',
      userId
    );

    return {
      success: true,
      projectId,
      status: 'READY_FOR_CREATIVE',
      brief: mergedBrief,
      versionNumber: newVersion.versionNumber
    };
  }

  /**
   * Helper to merge known fields, preserving user provenance over inferred defaults.
   */
  private mergeKnownFields(existing: KnownField[], incoming: KnownField[]): KnownField[] {
    const map = new Map<string, KnownField>();
    for (const f of existing) map.set(f.field, f);
    for (const f of incoming) {
      const prev = map.get(f.field);
      // User source always takes precedence over inferred
      if (!prev || f.source === 'USER' || prev.source !== 'USER') {
        map.set(f.field, f);
      }
    }
    return Array.from(map.values());
  }
}

export const briefReconciliationService = new BriefReconciliationService();
