interface ProblemSummary {
    id: string;
    title: string;
    titleSlug: string;
    difficulty: string;
    url: string;
    topics: string;
    currentReviewStage: number;
    isStarred: boolean;
}

export class EmailService {
    private apiKey: string | undefined;
    private fromEmail: string;
    private fromName: string;

    constructor() {
        this.apiKey = process.env.BREVO_API_KEY;
        this.fromEmail =
            process.env.EMAIL_FROM_ADDRESS || "noreply.leetrevise@gmail.com";
        this.fromName = process.env.EMAIL_FROM_NAME || "LeetRevise";

        if (!this.apiKey) {
            console.warn(
                "⚠️ BREVO_API_KEY is not defined in environment variables. Email sending will be simulated.",
            );
        }
    }

    /**
     * Send daily revision digest email to a user via Brevo REST API
     */
    async sendRevisionDigest(
        userEmail: string,
        userName: string,
        dueProblems: ProblemSummary[],
        appUrl: string = "http://localhost:5173",
        totalDueCount?: number,
        activeScheduledCount?: number,
        backlogCount?: number,
    ): Promise<{ success: boolean; id?: string; error?: string }> {
        if (!this.apiKey) {
            console.warn(
                `[MOCK EMAIL] To: ${userEmail} | Subject: 🎯 ${dueProblems.length} Problem(s) Due for Revision Today!`,
            );
            return {
                success: false,
                error: "BREVO_API_KEY is not configured in server/.env",
            };
        }

        const subject =
            dueProblems.length === 1
                ? `🎯 1 LeetCode Problem Due for Revision Today!`
                : `🎯 ${dueProblems.length} LeetCode Problems to Revise Today!`;

        const html = this.buildDigestHtml(
            userName,
            dueProblems,
            appUrl,
            totalDueCount,
            activeScheduledCount,
            backlogCount,
        );

        try {
            const response = await fetch(
                "https://api.brevo.com/v3/smtp/email",
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "api-key": this.apiKey,
                    },
                    body: JSON.stringify({
                        sender: {
                            name: this.fromName,
                            email: this.fromEmail,
                        },
                        to: [
                            {
                                email: userEmail,
                                name: userName || "Software Engineer",
                            },
                        ],
                        subject,
                        htmlContent: html,
                    }),
                },
            );

            const data: any = await response.json();

            if (!response.ok) {
                console.error("Brevo API Error:", data);
                return {
                    success: false,
                    error:
                        data.message ||
                        `Brevo API responded with status ${response.status}`,
                };
            }

            return { success: true, id: data.messageId };
        } catch (error: any) {
            console.error("Failed to send email via Brevo:", error);
            return { success: false, error: error.message || String(error) };
        }
    }

    /**
     * Build responsive HTML card template for daily digest
     */
    private buildDigestHtml(
        userName: string,
        problems: ProblemSummary[],
        appUrl: string,
        totalDueCount?: number,
        activeScheduledCount?: number,
        backlogCount?: number,
    ): string {
        const difficultyColors: Record<string, { bg: string; text: string }> = {
            Easy: { bg: "#e6f4ea", text: "#137333" },
            Medium: { bg: "#fef7e0", text: "#b06000" },
            Hard: { bg: "#fce8e6", text: "#c5221f" },
        };

        const problemRowsHtml = problems
            .map((p, idx) => {
                const diff = difficultyColors[p.difficulty] || {
                    bg: "#f1f3f4",
                    text: "#3c4043",
                };

                const leetReviseProblemUrl = `${appUrl}/problems/${p.id}`;

                return `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; border-collapse: separate; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                    <tr>
                        <td style="padding: 14px 16px 8px 16px;">
                            <div style="font-weight: 600; font-size: 15px; line-height: 1.4; color: #0f172a; margin-bottom: 6px;">
                                <span style="color: #64748b; font-size: 13px; font-weight: 500; margin-right: 4px;">#${idx + 1}</span>
                                <a href="${leetReviseProblemUrl}" style="color: #0f172a; text-decoration: none;">${p.title}</a>
                                ${p.isStarred ? '<span style="color: #f59e0b; margin-left: 4px;">★</span>' : ""}
                            </div>
                            <div style="margin-bottom: 4px; line-height: 1.8;">
                                <span style="display: inline-block; background: ${diff.bg}; color: ${diff.text}; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">
                                    ${p.difficulty}
                                </span>
                                <span style="font-size: 12px; color: #64748b; font-weight: 500;">Stage ${p.currentReviewStage + 1} of 6</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 16px 14px 16px;">
                            <a href="${leetReviseProblemUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; padding: 7px 16px; border-radius: 6px; margin-right: 8px;">
                                Revise Solution →
                            </a>
                            <a href="${p.url}" target="_blank" style="display: inline-block; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; text-decoration: none; font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 6px;">
                                LeetCode ↗
                            </a>
                        </td>
                    </tr>
                </table>
                `;
            })
            .join("");

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LeetRevise Daily Digest</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 24px; color: #ffffff;">
                    <div style="margin-bottom: 8px;">
                        <span style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #60a5fa;">LeetRevise</span>
                    </div>
                    <h1 style="font-size: 20px; font-weight: 600; margin: 0; color: #f8fafc;">Daily Revision Queue</h1>
                    <p style="font-size: 14px; color: #94a3b8; margin: 6px 0 0 0;">
                        ${
                            activeScheduledCount &&
                            activeScheduledCount > problems.length
                                ? `Hi ${userName || "there"}, you have <strong>${activeScheduledCount} scheduled revisions</strong> in your queue. Here are today's top ${problems.length} prioritized problems to tackle:`
                                : backlogCount && backlogCount > 0
                                  ? `Hi ${userName || "there"}, you have <strong>${problems.length} scheduled revision${problems.length > 1 ? "s" : ""}</strong> requiring attention today (plus ${backlogCount} older backlog problem${backlogCount > 1 ? "s" : ""} in your queue):`
                                  : totalDueCount &&
                                      totalDueCount > problems.length
                                    ? `Hi ${userName || "there"}, you have <strong>${problems.length} prioritized problems</strong> due today (${totalDueCount} total in queue):`
                                    : `Hi ${userName || "there"}, you have ${problems.length} scheduled problem${problems.length > 1 ? "s" : ""} due for recall today:`
                        }
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 20px 16px;">
                    ${problemRowsHtml}

                    <!-- CTA Banner -->
                    <div style="margin-top: 28px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af; font-weight: 500;">
                            Consistent spacing is the secret to pattern retention.
                        </p>
                        <a href="${appUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 6px;">
                            Go to LeetRevise Dashboard →
                        </a>
                    </div>

                    <!-- Do Not Reply System Notice -->
                    <div style="margin-top: 22px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                        Please do not reply to this email. This is an automated, system-generated notification that cannot receive responses.
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                    <p style="margin: 0;">LeetRevise • Adaptive Spaced Repetition Tracker</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
}

export const emailService = new EmailService();
