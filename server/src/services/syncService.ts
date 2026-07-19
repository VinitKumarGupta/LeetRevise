import db from '../db.js';
import { calculateNextReview } from '../utils/scheduler.js';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

interface Submission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

interface QuestionDetails {
  questionId: string;
  title: string;
  difficulty: string; // "Easy" | "Medium" | "Hard"
  topicTags: { name: string; slug: string }[];
}

/**
 * Fetches recent submissions for a given username from LeetCode.
 */
async function fetchRecentSubmissions(username: string, limit = 40): Promise<Submission[]> {
  const query = `
    query recentSubmissions($username: String!, $limit: Int) {
      recentSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
        statusDisplay
        lang
      }
    }
  `;

  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query,
        variables: { username, limit },
      }),
    });

    if (!response.ok) {
      throw new Error(`LeetCode API returned status ${response.status}`);
    }

    const data = (await response.json()) as any;
    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'GraphQL Error');
    }

    return data.data?.recentSubmissionList || [];
  } catch (error: any) {
    console.error('Error fetching submissions from LeetCode:', error);
    throw new Error(error.message || 'Failed to contact LeetCode GraphQL API');
  }
}

/**
 * Fetches detailed information for a specific LeetCode problem.
 */
async function fetchQuestionDetails(titleSlug: string): Promise<QuestionDetails> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  `;

  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug },
      }),
    });

    if (!response.ok) {
      throw new Error(`LeetCode API returned status ${response.status}`);
    }

    const data = (await response.json()) as any;
    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'GraphQL Error');
    }

    const question = data.data?.question;
    if (!question) {
      throw new Error(`Question details not found for slug: ${titleSlug}`);
    }

    return question;
  } catch (error: any) {
    console.error(`Error fetching question details for slug ${titleSlug}:`, error);
    throw new Error(error.message || `Failed to fetch details for problem: ${titleSlug}`);
  }
}

/**
 * Syncs LeetCode solved problems for a user.
 * 
 * @param userId The database user ID
 * @param username The LeetCode username
 */
export async function syncUserSubmissions(userId: string, username: string): Promise<{
  newProblemsCount: number;
  duplicatesSkippedCount: number;
}> {
  let newProblemsCount = 0;
  let duplicatesSkippedCount = 0;

  try {
    // 1. Fetch recent submissions from LeetCode
    const submissions = await fetchRecentSubmissions(username);

    // 2. Filter for accepted (solved) submissions
    const solvedSubmissions = submissions.filter(
      (sub) => sub.statusDisplay === 'Accepted'
    );

    // 3. Deduplicate submissions by titleSlug (in case user submitted multiple times)
    const uniqueSolvedSlugs = new Map<string, Submission>();
    for (const sub of solvedSubmissions) {
      if (!uniqueSolvedSlugs.has(sub.titleSlug)) {
        uniqueSolvedSlugs.set(sub.titleSlug, sub);
      }
    }

    // 4. Process each solved problem
    for (const [titleSlug, sub] of uniqueSolvedSlugs.entries()) {
      // Find if we already have this problem solved by this user
      const existingSolved = await db.solvedProblem.findFirst({
        where: {
          userId,
          problem: {
            titleSlug,
          },
        },
      });

      if (existingSolved) {
        duplicatesSkippedCount++;
        continue;
      }

      // Check if the Problem exists in our global Problem library
      let problem = await db.problem.findUnique({
        where: { titleSlug },
      });

      if (!problem) {
        // Fetch problem details from LeetCode
        try {
          const details = await fetchQuestionDetails(titleSlug);
          const topics = details.topicTags.map((t) => t.name).join(', ') || 'General';

          problem = await db.problem.create({
            data: {
              leetcodeProblemId: details.questionId,
              title: details.title,
              titleSlug,
              difficulty: details.difficulty,
              url: `https://leetcode.com/problems/${titleSlug}/`,
              topics,
            },
          });
        } catch (err) {
          console.error(`Skipping problem ${titleSlug} due to detail fetch error:`, err);
          continue; // Skip this problem but continue syncing others
        }
      }

      // Create SolvedProblem entry for the user
      const solvedAt = new Date(parseInt(sub.timestamp) * 1000);
      
      // Calculate first review: 1 day after solving
      const { nextReviewAt } = calculateNextReview(0, 'easy', solvedAt);

      await db.solvedProblem.create({
        data: {
          userId,
          problemId: problem.id,
          solvedAt,
          currentReviewStage: 0,
          nextReviewAt,
          status: 'active',
          reviewCount: 0,
        },
      });

      newProblemsCount++;
    }

    // 5. Log success
    await db.syncLog.create({
      data: {
        userId,
        newProblemsCount,
        duplicatesSkippedCount,
        success: true,
      },
    });

    return { newProblemsCount, duplicatesSkippedCount };
  } catch (error: any) {
    // Log failure
    await db.syncLog.create({
      data: {
        userId,
        newProblemsCount: 0,
        duplicatesSkippedCount: 0,
        success: false,
        errorMessage: error.message || 'Unknown sync error',
      },
    });
    throw error;
  }
}
